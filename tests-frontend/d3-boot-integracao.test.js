const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 'ana-d3@example.com';
const eventos = () => new Promise((resolver) => setImmediate(resolver));
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
const resposta = (dados, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => copiar(dados) });
function adiada() { let resolver; const promise = new Promise((resolve) => { resolver = resolve; }); return { promise, resolver }; }
function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}
function aluno(nome = 'Ana cache') { return { id: 'aluno-1', nome, objetivo: 'Personal Trainer', status: 'ativo', preco: 100, frequenciaSemanal: 2 }; }
function snapshot(vazio = false) { return { alunos: vazio ? [] : [aluno()], aulas: [], reposicoes: [], grade: { inicio: '07:00', fim: '20:00' }, meta: 123 }; }
function cards(nome = 'Ana financeiro cache') { return [{ alunoId: 'aluno-1', aluno: { id: 'aluno-1', nome }, configuracaoPendente: false, historicoDisponivel: true,
    cicloAtual: { _id: 'ciclo-1', cicloInicio: '2026-10-01', cicloFim: '2026-10-31', status: 'em_aberto', metodoCobranca: 'por_aula', valorTotalCiclo: 400, aulasContadas: 4, extrato: [] } }]; }

function ambiente(t, opcoes = {}) {
    const tela = opcoes.tela || 'tela-home';
    const dom = new JSDOM(`<!doctype html><html><body><div class="container">
        <nav class="nav-inferior">${['home', 'alunos', 'financas'].map((nome) => `<a class="nav-link-inferior" data-target="tela-${nome}"></a>`).join('')}</nav>
        <main class="view-section" id="tela-home"><div id="homeDayPanel"></div><div id="calendarioSemanalHomeGrid"></div></main>
        <main class="view-section" id="tela-alunos"><div id="listaAlunos"></div></main>
        <main class="view-section" id="tela-financas"></main>
        <div class="modal-overlay" id="modalFormAluno" style="display:none"><form id="formNovoAluno"><input id="alunoNome"><textarea id="alunoObservacoes"></textarea></form></div>
        <span id="headerCacheState" hidden>Sincronizando dados...</span>
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
    </div></body></html>`, { url: `http://localhost/index.html#${tela}`, runScripts: 'outside-only' });
    const w = dom.window;
    let email = CONTA;
    let token = 'token-d3';
    let conectado = true;
    let hidden = false;
    let agora = 1000000;
    const listeners = new Set();
    const frames = [];
    const a = { dom, w, chamadas: [], rendersHome: [], scrolls: [], gates: [], frames, avisos: [], nomeRemoto: 'Ana principal servidor', financeiro: cards('Ana financeiro servidor') };
    Object.defineProperty(w.navigator, 'onLine', { get: () => conectado });
    Object.defineProperty(w.document, 'hidden', { get: () => hidden });
    w.Date.now = () => agora;
    w.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    w.googleIdentity = {
        getOwnerEmail: () => email, getIdToken: () => token,
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
        initialize: () => { if (a.aoInicializarIdentidade) a.aoInicializarIdentidade(); },
        whenReady: async () => {}
    };
    w.Headers = Headers;
    w.AbortController = AbortController;
    w.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    w.log = new Proxy({}, { get: () => () => {} });
    w.mostrarToast = (...args) => a.avisos.push(args);
    w.scrollTo = (...args) => a.scrolls.push(args);
    a.dados = (rota) => rota === 'alunos' ? [aluno(a.nomeRemoto)]
        : rota === 'financas' ? a.financeiro
        : rota === 'configuracao/grade_horarios' ? { horaInicio: '06:00', horaFim: '22:00' } : [];
    a.responder = (chamada) => resposta(a.dados(chamada.rota));
    w.fetch = async (url, init = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test', 'nenhuma rede real');
        if (endereco.pathname === '/') return resposta({});
        const chamada = { rota: endereco.pathname.slice('/api/'.length), conta: email, method: init.method || 'GET' };
        a.chamadas.push(chamada);
        assert.equal(chamada.method, 'GET', 'boot e manual não escrevem');
        assert.equal(init.headers.get('Authorization'), 'Bearer token-d3');
        return a.responder(chamada);
    };
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js', 'assets/js/view-home.js', 'assets/js/view-financas.js', 'assets/js/view-alunos.js'].forEach((arquivo) => carregar(dom, arquivo));
    // Renderização complexa da grade é fronteira da fixture; inicializador Home/carga são reais.
    w.renderizarHomeSemana = () => { a.rendersHome.push(w.obterAlunos().map((item) => item.nome)); };
    w.renderizarHomeDia = w.renderizarHomeSemana;
    w.atualizarDashboardStats = () => {};
    w.trocarFABNovoHome = () => {};
    w.inicializarMultiSelectPills = () => {};
    w.reposicaoFlowHelpers = require('../backend/shared/reposicao-flow-helpers');
    w.formatarMoedaFinanceira = (valor) => String(valor || 0);
    w.normalizarNumeroFinanceiro = (valor) => Number(valor) || 0;
    w.semanaReferencia = new w.Date('2026-10-05T12:00:00');
    const c = w.contextoDados;
    c.iniciar();
    if (opcoes.cache !== 'ausente') c.salvarPrincipal(snapshot(opcoes.cache === 'vazio'));
    if (opcoes.financeiroCache !== false) w.salvarCacheFinancas(cards());
    if (opcoes.cache === 'outra-conta') email = 'bia-d3@example.com';
    if (opcoes.sessao === false) { token = null; email = null; }
    if (opcoes.online === false) conectado = false;
    ['assets/js/app/coordenador-sync-boot.js', 'assets/js/app/router.js', 'assets/js/app/bootstrap.js'].forEach((arquivo) => carregar(dom, arquivo));
    a.iniciar = () => w.__appBootstrap.initialize();
    a.pintar = async () => { const fns = frames.splice(0); fns.forEach((fn) => fn()); await eventos(); };
    a.estado = () => w.syncBootDados.obterEstado();
    a.principais = () => a.chamadas.filter((item) => item.rota === 'alunos').length;
    a.financas = () => a.chamadas.filter((item) => item.rota === 'financas').length;
    a.sessao = async (novoEmail = CONTA) => {
        email = novoEmail; token = novoEmail ? 'token-d3' : null;
        await Promise.all([...listeners].map((fn) => fn({ ownerEmail: email })));
        await eventos();
    };
    a.online = async () => { conectado = true; w.dispatchEvent(new w.Event('online')); await eventos(); };
    a.voltarAba = async () => {
        hidden = true; w.document.dispatchEvent(new w.Event('visibilitychange'));
        agora += 100000;
        hidden = false; w.document.dispatchEvent(new w.Event('visibilitychange'));
        await eventos();
    };
    a.segurar = (rota) => {
        const gate = adiada(); a.gates.push(gate);
        const anterior = a.responder;
        a.responder = (chamada) => chamada.rota === rota ? { ok: true, status: 200, json: () => gate.promise } : anterior(chamada);
        return { liberar: () => { a.responder = anterior; gate.resolver(a.dados(rota)); } };
    };
    t.after(async () => {
        w.syncBootDados.parar(); a.gates.forEach((gate) => gate.resolver([]));
        await eventos(); await new Promise((resolver) => w.setTimeout(resolver, 0)); dom.window.close();
    });
    return a;
}

for (const tela of ['tela-home', 'tela-alunos', 'tela-financas']) {
    for (const cache of ['presente', 'vazio', 'ausente']) {
        testar(`D3-01 — ${tela}/${cache}: apresentação antes de B2 e apenas um batch/GET financeiro`, async (t) => {
            const a = ambiente(t, { tela, cache });
            await a.iniciar();
            assert.equal(a.estado().ativo, false, 'B2 aguarda oportunidade de apresentação');
            assert.equal(a.w.location.hash, `#${tela}`);
            if (tela === 'tela-home') assert.ok(a.rendersHome.length > 0);
            if (tela === 'tela-alunos') assert.ok(a.w.document.getElementById('listaAlunos').textContent);
            if (tela === 'tela-financas') assert.match(a.w.document.getElementById('financasConteudo').textContent, /servidor/);
            await eventos(); // complementos iniciais de Alunos podem terminar antes do frame
            await a.pintar();
            assert.equal(a.estado().ativo, true);
            assert.equal(a.estado().estado, 'aplicado');
            assert.equal(a.principais(), 1);
            assert.equal(a.financas(), tela === 'tela-home' ? 0 : 1, 'B2 não duplica financeiro concluído no init');
            assert.equal(a.w.obterAlunos()[0].nome, 'Ana principal servidor');
            assert.equal(a.w.document.getElementById('headerCacheState').hidden, true);
        });
    }
}

testar('D3-02 — cache Home já visível enquanto batch B2 aguarda, sem bloquear initialize', async (t) => {
    const a = ambiente(t);
    const gate = a.segurar('alunos');
    await a.iniciar();
    assert.ok(a.rendersHome.some((nomes) => nomes[0] === 'Ana cache'));
    await a.pintar();
    assert.equal(a.estado().emVoo, true);
    assert.equal(a.w.document.getElementById('headerCacheState').hidden, false);
    assert.equal(a.w.obterAlunos()[0].nome, 'Ana cache');
    gate.liberar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
});

testar('D3-03 — financeiro lento mantém cache e próprio GET; boot não duplica depois', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    const gate = a.segurar('financas');
    const inicial = a.iniciar(); await eventos();
    assert.match(a.w.document.getElementById('financasConteudo').textContent, /financeiro cache/);
    assert.equal(a.estado().ativo, false);
    assert.equal(a.financas(), 1);
    gate.liberar(); await inicial; await a.pintar();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.financas(), 1);
    assert.equal(a.principais(), 1);
});

testar('D3-04 — financeiro remoto vazio é recibo válido, sem GET extra por B2', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    a.financeiro = [];
    await a.iniciar(); await a.pintar();
    assert.equal(a.financas(), 1);
    assert.equal(a.w.__financasState.cards.length, 0);
    assert.match(a.w.document.getElementById('financasConteudo').textContent, /Nenhum aluno/);
});

testar('D3-05 — financeiro falho no init não é recibo; B2 refaz só complemento necessário', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    const anterior = a.responder;
    a.responder = (chamada) => chamada.rota === 'financas' ? resposta({}, 500) : anterior(chamada);
    await a.iniciar();
    a.responder = anterior;
    await a.pintar();
    assert.equal(a.financas(), 2);
    assert.equal(a.principais(), 1);
    assert.match(a.w.document.getElementById('financasConteudo').textContent, /financeiro servidor/);
});

testar('D3-06 — login durante navegação pendente não se perde nem cria batch concorrente', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    const gate = a.segurar('financas');
    const inicial = a.iniciar(); await eventos();
    await a.sessao('bia-d3@example.com');
    assert.equal(a.principais(), 0, 'aguarda barreira inicial');
    gate.liberar(); await inicial; await a.pintar();
    assert.equal(a.estado().contexto.ownerEmail, 'bia-d3@example.com');
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 1);
    assert.equal(a.financas(), 2, 'A antigo descartado; B ganha somente um financeiro novo');
});

testar('D3-07 — login em initialize da identidade é observado antes de whenReady', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas', sessao: false });
    a.aoInicializarIdentidade = () => { void a.sessao(CONTA); };
    await a.iniciar(); await a.pintar();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 1);
    assert.equal(a.financas(), 1);
});

testar('D3-08 — sem sessão inicia pendente; login posterior alimenta principal e financeiro', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas', sessao: false });
    await a.iniciar(); await a.pintar();
    assert.equal(a.estado().motivo, 'sem-sessao');
    assert.equal(a.chamadas.length, 0);
    assert.equal(a.w.obterAlunos().length, 0);
    await a.sessao();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 1);
    assert.equal(a.financas(), 1);
});

testar('D3-09 — remoto vazio principal aplica sem repovoar cache ou reinicializar tela', async (t) => {
    const a = ambiente(t);
    const anterior = a.responder;
    a.responder = (chamada) => chamada.rota === 'alunos' ? resposta([]) : anterior(chamada);
    await a.iniciar(); await a.pintar();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.w.obterAlunos().length, 0);
    assert.equal(JSON.parse(a.w.localStorage.getItem('personal_alunos')).length, 0);
    assert.equal(a.scrolls.length, 1, 'refresh não navega de novo');
});

testar('D3-10 — B2 falha preserva tela/cache e online retoma sem retry por formulário', async (t) => {
    const a = ambiente(t);
    const anterior = a.responder;
    a.responder = (chamada) => chamada.rota === 'reposicoes' ? resposta({}, 500) : anterior(chamada);
    await a.iniciar(); await a.pintar();
    assert.equal(a.estado().aguardandoEvento, true);
    assert.equal(a.w.obterAlunos()[0].nome, 'Ana cache');
    assert.equal(a.avisos.length, 0);
    a.w.contextoDados.definirFormulario('d3', true); a.w.contextoDados.definirFormulario('d3', false); await eventos();
    assert.equal(a.principais(), 1);
    a.responder = anterior; await a.online();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 2);
});

testar('D3-11 — navegação durante B2 atualiza tela atual e preserva edição', async (t) => {
    const a = ambiente(t);
    const gate = a.segurar('alunos');
    await a.iniciar(); await a.pintar();
    await a.w.__appShell.router.navigateTo('tela-alunos'); await eventos();
    const campo = a.w.document.getElementById('alunoNome'); campo.value = 'Rascunho da Bia'; campo.focus();
    a.w.contextoDados.definirFormulario('d3', true); await eventos();
    gate.liberar(); await eventos();
    assert.equal(a.w.location.hash, '#tela-alunos');
    assert.equal(campo.value, 'Rascunho da Bia');
    assert.equal(a.w.document.activeElement, campo);
    assert.equal(a.estado().estado, 'pendente');
    a.w.contextoDados.definirFormulario('d3', false); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.match(a.w.document.getElementById('listaAlunos').textContent, /principal servidor/);
});

testar('D3-12 — retorno à aba durante B2 não cria outra leitura principal', async (t) => {
    const a = ambiente(t);
    const gate = a.segurar('alunos');
    await a.iniciar(); await a.pintar();
    await a.voltarAba(); assert.equal(a.principais(), 1);
    gate.liberar(); await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 1);
});

testar('D3-13 — retorno à aba após B2 continua atualizando, espera edição e preserva período', async (t) => {
    const a = ambiente(t);
    await a.iniciar(); await a.pintar();
    const w = a.w;
    w.dataSelecionada = new w.Date('2026-10-15T12:00:00'); w.modoHomeAtivo = 'dia';
    const data = w.dataSelecionada.getTime();
    w.contextoDados.definirFormulario('d3', true);
    a.nomeRemoto = 'Dados novos ao retornar';
    await a.voltarAba(); assert.equal(a.principais(), 1);
    w.contextoDados.definirFormulario('d3', false); await eventos();
    assert.equal(a.principais(), 2);
    assert.equal(w.obterAlunos()[0].nome, 'Dados novos ao retornar');
    assert.equal(w.dataSelecionada.getTime(), data);
    assert.equal(w.modoHomeAtivo, 'dia');
    assert.equal(w.location.hash, '#tela-home');
});

testar('D3-14 — manual durante B2 espera e tem leitura nova mesmo com recibo financeiro boot', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    await a.iniciar();
    const gate = a.segurar('alunos'); await a.pintar();
    const manual = a.w.sincronizarBancoDados();
    assert.match(a.w.document.getElementById('btnSyncBancoText').textContent, /Aguardando/);
    gate.liberar(); await manual; await eventos();
    assert.equal(a.principais(), 2);
    assert.equal(a.financas(), 2, 'manual não adota financeiro do init/B2');
});

testar('D3-15 — edição invalida recibo financeiro concluído antes do boot', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    await a.iniciar();
    a.w.contextoDados.definirFormulario('d3', true); a.w.contextoDados.definirFormulario('d3', false);
    await a.pintar();
    assert.equal(a.financas(), 2, 'leitura anterior à interação não atende complemento');
});

testar('D3-16 — leitura em voo própria reaproveitada ao navegar para Finanças durante B2', async (t) => {
    const a = ambiente(t);
    const principal = a.segurar('alunos');
    await a.iniciar(); await a.pintar();
    const financeiro = a.segurar('financas');
    const navegar = a.w.__appShell.router.navigateTo('tela-financas'); await eventos();
    principal.liberar(); await eventos();
    assert.equal(a.financas(), 1);
    financeiro.liberar(); await navegar; await eventos();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.financas(), 1);
    assert.equal(a.w.location.hash, '#tela-financas');
});

for (const tela of ['tela-home', 'tela-alunos']) {
    for (const status of [500, 401]) {
        testar(`D3-17 — ${tela} sem cache/falha ${status} aguarda evento, não repete no boot`, async (t) => {
            const a = ambiente(t, { tela, cache: 'ausente' });
            const anterior = a.responder;
            a.responder = () => resposta({}, status);
            await a.iniciar(); await a.pintar();
            assert.equal(a.estado().aguardandoEvento, true);
            assert.equal(a.principais(), 1, 'falha inicial não causa retry B2 imediato');
            const avisos = a.avisos.length;
            a.w.contextoDados.definirFormulario('d3', true); a.w.contextoDados.definirFormulario('d3', false); await eventos();
            assert.equal(a.principais(), 1);
            assert.equal(a.avisos.length, avisos, 'B2 não acrescenta toast de login/falha');
            a.responder = anterior; await a.online();
            assert.equal(a.estado().estado, 'aplicado');
            assert.equal(a.principais(), 2);
        });
    }
}

testar('D3-18 — retorno à aba após principal aplicado aguarda complemento e faz refresh devido', async (t) => {
    const a = ambiente(t);
    await a.iniciar();
    const gate = a.segurar('financas');
    await a.w.__appShell.router.navigateTo('tela-alunos');
    await a.pintar();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.estado().emVoo, true, 'B2 ainda aguarda complemento financeiro');
    await a.voltarAba();
    assert.equal(a.principais(), 1);
    a.nomeRemoto = 'Mudança após suspensão';
    gate.liberar(); await eventos();
    assert.equal(a.principais(), 2, 'retorno tardio não pode ser descartado pela cota B2');
    assert.equal(a.w.obterAlunos()[0].nome, 'Mudança após suspensão');
});

testar('D3-19 — edição aberta durante refresh de retorno descarta e refaz leitura ao fechar', async (t) => {
    const a = ambiente(t);
    await a.iniciar(); await a.pintar();
    const gate = a.segurar('alunos');
    await a.voltarAba();
    assert.equal(a.principais(), 2);
    a.w.contextoDados.definirFormulario('d3', true);
    a.nomeRemoto = 'Resposta anterior à edição'; gate.liberar(); await eventos();
    assert.equal(a.w.obterAlunos()[0].nome, 'Ana principal servidor');
    a.nomeRemoto = 'Nova leitura após edição';
    a.w.contextoDados.definirFormulario('d3', false); await eventos();
    assert.equal(a.principais(), 3);
    assert.equal(a.w.obterAlunos()[0].nome, 'Nova leitura após edição');
});

testar('D3-20 — cache de outra conta não aparece, B2 lê somente conta atual', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas', cache: 'outra-conta' });
    const gate = a.segurar('financas');
    const inicial = a.iniciar(); await eventos();
    assert.equal(a.w.obterAlunos().length, 0);
    assert.doesNotMatch(a.w.document.getElementById('financasConteudo').textContent, /financeiro cache/);
    gate.liberar(); await inicial; await a.pintar();
    assert.equal(a.estado().contexto.ownerEmail, 'bia-d3@example.com');
    assert.ok(a.chamadas.every((item) => item.conta === 'bia-d3@example.com'));
    assert.equal(a.financas(), 1);
    assert.equal(a.principais(), 1);
});

testar('D3-21 — B2 offline sobre cache aguarda online sem apagar agenda', async (t) => {
    const a = ambiente(t, { online: false });
    await a.iniciar(); await a.pintar();
    assert.equal(a.estado().motivo, 'sem-conexao');
    assert.equal(a.principais(), 0);
    assert.equal(a.w.obterAlunos()[0].nome, 'Ana cache');
    await a.online();
    assert.equal(a.estado().estado, 'aplicado');
    assert.equal(a.principais(), 1);
});

for (const tela of ['tela-home', 'tela-alunos']) {
    testar(`E2 — ${tela} apresenta snapshot pendente na abertura sem GET nem confirmar sync`, async (t) => {
        const a = ambiente(t, { tela });
        const c = a.w.contextoDados;
        a.w.hidratarCacheDados();
        const op = c.iniciarOperacao({ tipo: 'dados' });
        assert.ok(op);
        c.marcarFalhaOperacao(op, new Error('Confirmação simulada perdida'));
        await c.finalizarOperacao(op);
        await a.iniciar(); await a.pintar();
        assert.equal(a.estado().motivo, 'pendencia-local');
        assert.equal(a.w.obterAlunos()[0].nome, 'Ana cache');
        if (tela === 'tela-alunos') assert.match(a.w.document.getElementById('listaAlunos').textContent, /Ana cache/);
        else assert.ok(a.rendersHome.some((nomes) => nomes[0] === 'Ana cache'));
        assert.equal(a.chamadas.length, 0, 'nenhuma leitura principal/complementar por cima da pendência');
        assert.notEqual(a.w.__sincronizacaoInicialConcluida, true, 'hidratação não confirma atualização remota');
        assert.equal(c.obterPendencia().tentativaId, op.id);
        assert.equal(a.w.__homeCarregando, false);
    });
}