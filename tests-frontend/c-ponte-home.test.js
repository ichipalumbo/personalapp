const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}
function ambiente(t, nomeArquivo) {
    const dom = new JSDOM(`<!doctype html><main id="tela-home">
        <span id="totalAulasHoje">4</span><span id="periodoSemanaHomeLabel">Semana atual</span>
        <div id="calendarioSemanalHomeGrid"></div><div id="homeDayPanel"></div>
    </main>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    require('./setup/contexto-dados')(dom);
    const { window } = dom;
    const avisos = [];
    window.mostrarToast = (texto, tipo) => avisos.push({ texto, tipo });
    window.agendaConfig = { horaInicio: 7, horaFim: 21 };
    window.aulasParaRepor = [];
    window.aulas = [{ id: 'intencao-preservada' }];
    const arquivo = path.resolve(__dirname, '../assets/js', nomeArquivo);
    vm.runInContext(fs.readFileSync(arquivo, 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
    return { window, avisos, contexto: window.contextoDados };
}
function ambienteHome(t) {
    const a = ambiente(t, 'view-home.js');
    a.window.temDadosLocaisNoCache = () => false;
    const renders = [];
    a.window.atualizarDashboardStats = () => renders.push('stats');
    a.window.renderizarHomeSemana = () => renders.push('semana');
    a.window.inicializarMultiSelectPills = () => renders.push('pills');
    a.window.alternarModoHome = () => renders.push('modo');
    return { ...a, renders, grid: a.window.document.getElementById('calendarioSemanalHomeGrid') };
}

for (const modo of ['false', 'throw']) {
    // Mutação candidata: ignorar false de inicializarHome ou deixar o throw marcar falha da escrita.
    test(`C — ponte mantém escrita confirmada e aviso de leitura quando refresh ${modo}`, { timeout: 5000 }, async (t) => {
        const a = ambiente(t, 'google-calendar.js');
        const refresh = adiada();
        const iniciou = adiada();
        let operacao;
        let gravacoes = 0;
        a.window.salvarDados = async (_silencioso, opcoes) => {
            gravacoes++;
            operacao = opcoes.operacao;
            a.contexto.registrarEtapa(operacao, { method: 'POST', confirmada: true });
            return { ok: true, motivo: 'sucesso_com_falha_gcal' };
        };
        a.window.inicializarHome = async (opcoes) => {
            assert.equal(opcoes.operacao, operacao);
            assert.equal(opcoes.contextoDados, operacao.contexto);
            assert.equal(a.contexto.operacaoAtual(operacao), true);
            iniciou.resolver();
            await refresh.promise;
            if (modo === 'throw') throw new Error('Falha apenas de leitura');
            return false;
        };
        const salvamento = a.window.salvarEventoComGCal({ id: 'agenda-1' });
        await iniciou.promise;
        assert.equal(a.contexto.semOperacoes(), false, 'Raiz protege até o refresh terminar');
        assert.equal(operacao.finalizada, false);
        assert.ok(a.contexto.obterPendencia());
        refresh.resolver();
        const resultado = await salvamento;
        assert.equal(resultado.ok, true);
        assert.equal(resultado.motivo, 'sucesso_com_falha_gcal');
        assert.equal(resultado.atualizacaoPendente, true);
        assert.equal(operacao.falha, false, 'Falha de refresh não contamina confirmação Mongo');
        assert.equal(operacao.finalizada, true);
        assert.equal(a.contexto.obterPendencia(), null);
        assert.equal(gravacoes, 1);
        assert.equal(a.avisos.length, 1);
        assert.equal(a.avisos[0].tipo, 'warning');
        assert.match(a.avisos[0].texto, /não repita a gravação/);
    });
}

test('C — ponte silenciosa retorna atualização pendente sem toast e não finaliza raiz recebida', { timeout: 5000 }, async (t) => {
    const a = ambiente(t, 'google-calendar.js');
    const op = a.contexto.iniciarOperacao({ tipo: 'agenda-composta' });
    a.window.salvarDados = async (_silencioso, opcoes) => {
        assert.equal(opcoes.operacao, op);
        a.contexto.registrarEtapa(op, { method: 'PUT', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };
    a.window.inicializarHome = async () => false;
    const resultado = await a.window.salvarEventoComGCal({}, { operacao: op, silencioso: true });
    assert.equal(resultado.ok, true);
    assert.equal(resultado.atualizacaoPendente, true);
    assert.equal(op.falha, false);
    assert.equal(op.finalizada, false);
    assert.equal(a.contexto.operacaoAtual(op), true);
    assert.equal(a.avisos.length, 0);
    await a.contexto.finalizarOperacao(op);
    assert.equal(a.contexto.obterPendencia(), null);
});

test('C — ponte preserva sucesso de escrita e refresh e distingue gravação realmente falha', { timeout: 5000 }, async (t) => {
    const a = ambiente(t, 'google-calendar.js');
    let refreshes = 0;
    a.window.inicializarHome = async () => { refreshes++; return true; };
    a.window.salvarDados = async (_silencioso, opcoes) => {
        a.contexto.registrarEtapa(opcoes.operacao, { method: 'PUT', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };
    const sucesso = await a.window.salvarEventoComGCal({});
    assert.equal(sucesso.ok, true);
    assert.equal(sucesso.atualizacaoPendente, undefined);
    assert.equal(a.avisos.length, 0);
    a.window.salvarDados = async (_silencioso, opcoes) => {
        a.contexto.registrarEtapa(opcoes.operacao, { method: 'PUT', confirmada: false });
        return { ok: false, motivo: 'falha_remota' };
    };
    const falha = await a.window.salvarEventoComGCal({});
    assert.equal(falha.ok, false);
    assert.equal(refreshes, 1, 'Não tentar refresh de escrita não confirmada');
    assert.ok(a.contexto.obterPendencia());
});

// Mutação candidata: voltar a condicionar limpeza de loading à geração de interação.
test('C — formulário aberto durante carga libera loading sem aplicar ou renderizar snapshot', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    const leitura = adiada();
    const aulas = a.window.aulas;
    a.window.carregarDados = () => leitura.promise;
    const carga = a.window.inicializarHome({ sincronizar: true });
    assert.equal(a.window.__homeCarregando, true);
    assert.ok(a.grid.querySelector('.skeleton'));
    a.contexto.definirFormulario('formulario-novo', true);
    leitura.resolver({ ok: true });
    assert.equal(await carga, false);
    assert.equal(a.window.__homeCarregando, false);
    assert.equal(a.window.document.getElementById('tela-home').getAttribute('aria-busy'), 'false');
    assert.equal(a.grid.querySelector('.skeleton'), null);
    assert.equal(a.window.__sincronizacaoInicialConcluida, false);
    assert.equal(a.window.aulas, aulas);
    assert.deepEqual(a.renders, []);
});

// Mutação candidata: sair no resultado ok:false sem desmontar skeleton, ou renderizar dados antigos.
test('C — falha sem cache sai do skeleton sem snapshot; tentativa nova continua permitida', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    const aulas = a.window.aulas;
    a.window.carregarDados = async () => ({ ok: false, estado: 'falha' });
    assert.equal(await a.window.inicializarHome(), false);
    assert.equal(a.window.__homeCarregando, false);
    assert.equal(a.window.document.getElementById('tela-home').getAttribute('aria-busy'), 'false');
    assert.equal(a.grid.querySelector('.skeleton'), null);
    assert.match(a.grid.textContent, /Não foi possível carregar a agenda/);
    assert.equal(a.window.document.getElementById('totalAulasHoje').textContent, '--');
    assert.equal(a.window.aulas, aulas);
    assert.deepEqual(a.renders, []);
    a.window.carregarDados = async () => ({ ok: true });
    a.window.renderizarHomeSemana = () => { a.renders.push('semana'); a.grid.textContent = 'Agenda confirmada'; };
    assert.equal(await a.window.inicializarHome(), true);
    assert.equal(a.window.__sincronizacaoInicialConcluida, true);
    assert.equal(a.grid.textContent, 'Agenda confirmada');
});

test('C — falha sobre grade já exibida preserva conteúdo e encerra rótulos transitórios', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    a.grid.innerHTML = '<div>Agenda anterior preservada</div>';
    a.window.temDadosLocaisNoCache = () => true;
    const htmlAnterior = a.grid.innerHTML;
    a.window.carregarDados = async () => ({ ok: false });
    assert.equal(await a.window.inicializarHome({ sincronizar: true }), false);
    assert.equal(a.grid.innerHTML, htmlAnterior);
    assert.equal(a.window.document.getElementById('periodoSemanaHomeLabel').textContent, 'Semana atual');
    assert.equal(a.window.document.getElementById('totalAulasHoje').textContent, '4');
    assert.equal(a.window.__homeCarregando, false);
    assert.deepEqual(a.renders, []);
});

test('C — exceção de carga encerra skeleton e indicador sem render de fallback', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    a.window.carregarDados = async () => { throw new Error('Rede indisponível'); };
    await assert.rejects(a.window.inicializarHome(), /Rede indisponível/);
    assert.equal(a.window.__homeCarregando, false);
    assert.equal(a.grid.querySelector('.skeleton'), null);
    assert.equal(a.window.document.getElementById('tela-home').getAttribute('aria-busy'), 'false');
    assert.deepEqual(a.renders, []);
});

// Mutação candidata: limpar __homeCarregando só pela conta, sem identidade da leitura.
test('C — finally de leitura anterior na mesma conta não limpa loading da seguinte', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    const antiga = adiada();
    const nova = adiada();
    let chamadas = 0;
    a.window.carregarDados = () => (++chamadas === 1 ? antiga.promise : nova.promise);
    const primeira = a.window.inicializarHome({ sincronizar: true });
    const segunda = a.window.inicializarHome({ sincronizar: true });
    antiga.resolver({ ok: false });
    assert.equal(await primeira, false);
    assert.equal(a.window.__homeCarregando, true);
    assert.equal(a.window.document.getElementById('tela-home').getAttribute('aria-busy'), 'true');
    assert.ok(a.grid.querySelector('.skeleton'));
    nova.resolver({ ok: false });
    assert.equal(await segunda, false);
    assert.equal(a.window.__homeCarregando, false);
    assert.equal(a.grid.querySelector('.skeleton'), null);
});

// Mutação candidata: ignorar dono/geração no finally da Home.
test('C — finally da sessão anterior não limpa indicador ou conteúdo de nova conta', { timeout: 5000 }, async (t) => {
    const a = ambienteHome(t);
    const antiga = adiada();
    const nova = adiada();
    let chamadas = 0;
    a.window.carregarDados = () => (++chamadas === 1 ? antiga.promise : nova.promise);
    const primeira = a.window.inicializarHome({ sincronizar: true });
    a.window.googleIdentity.getOwnerEmail = () => 'nova@example.com';
    a.contexto.capturar();
    a.grid.replaceChildren();
    const segunda = a.window.inicializarHome({ sincronizar: true });
    antiga.resolver({ ok: false });
    assert.equal(await primeira, false);
    assert.equal(a.window.__homeCarregando, true);
    assert.ok(a.grid.querySelector('.skeleton'));
    assert.deepEqual(a.renders, []);
    nova.resolver({ ok: false });
    assert.equal(await segunda, false);
    assert.equal(a.window.__homeCarregando, false);
    assert.equal(a.grid.querySelector('.skeleton'), null);
});