const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 'ana-d1@example.com';
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const barreira = () => new Promise((resolver) => setImmediate(resolver));
const resposta = (dados) => ({ ok: true, status: 200, json: async () => copiar(dados) });
function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}
function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}
function snapshot(vazio = false) {
    return {
        alunos: vazio ? [] : [{ id: 'aluno-1', nome: 'Ana cache', objetivo: 'Personal Trainer', status: 'ativo', preco: 100 }],
        aulas: [], reposicoes: [], grade: { inicio: '07:00', fim: '20:00' }, meta: 123
    };
}
function cards(nome = 'Ana cache') {
    return [{ alunoId: 'aluno-1', aluno: { id: 'aluno-1', nome }, configuracaoPendente: false,
        historicoDisponivel: true, cicloAtual: { _id: 'ciclo-1', cicloInicio: '2026-10-01', cicloFim: '2026-10-31',
            status: 'em_aberto', metodoCobranca: 'por_aula', aulasContadas: 4, valorTotalCiclo: 400,
            extrato: [{ data: '2026-10-06', tipo: 'aula', valor: 100 }] } }];
}
function ambiente(t, opcoes = {}) {
    const dom = new JSDOM(`<!doctype html><html><body><div class="container">
        <nav class="nav-inferior">${['home', 'alunos', 'financas'].map((tela) => `<a class="nav-link-inferior" data-target="tela-${tela}"></a>`).join('')}</nav>
        <main id="tela-home" class="view-section"></main>
        <main id="tela-alunos" class="view-section"><div id="listaAlunos"></div></main>
        <main id="tela-financas" class="view-section"></main>
        <div id="modalFormAluno" class="modal-overlay" style="display:none"><form id="formNovoAluno"><input id="alunoNome"><textarea id="alunoObservacoes"></textarea></form></div>
        <span id="headerCacheState" hidden></span>
    </div></body></html>`, { url: `http://localhost/index.html#${opcoes.tela || 'tela-home'}`, runScripts: 'outside-only' });
    t.after(async () => {
        // Drenar a tarefa nativa de toggle dos <details> antes de destruir o DOM.
        await new Promise((resolver) => dom.window.setTimeout(resolver, 0));
        dom.window.close();
    });
    const { window } = dom;
    let conta = CONTA;
    let token = 'token-d1';
    const listeners = [];
    const a = { dom, window, chamadas: [], scrolls: [], iniciais: [], renders: [] };
    // Isolar o contrato D1: ativação/concorrência do coordenador real é testada no D3.
    window.syncBootDados = { iniciar() {}, retomar() {}, obterEstado: () => ({ estado: 'aplicado', emVoo: false }) };
    window.googleIdentity = {
        getOwnerEmail: () => conta, getIdToken: () => token,
        addAuthChangeListener: (fn) => { listeners.push(fn); }, initialize() {}, whenReady: async () => {}
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.Headers = Headers;
    window.AbortController = AbortController;
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = () => {};
    window.scrollTo = (...args) => a.scrolls.push(args);
    window.fetch = async (url, init = {}) => {
        assert.equal(new URL(url).origin, 'http://api.test', 'nenhuma rede real');
        if (String(url) === 'http://api.test') return resposta({}); // ping preexistente separado
        const rota = new URL(url).pathname.slice('/api/'.length);
        a.chamadas.push(rota);
        assert.equal(init.method || 'GET', 'GET', 'D1 não escreve na API');
        if (a.responder) return a.responder(rota);
        if (rota === 'configuracao/grade_horarios') return resposta({ horaInicio: '06:00', horaFim: '22:00' });
        return resposta([]);
    };
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js'].forEach((arquivo) => carregar(dom, arquivo));
    window.contextoDados.iniciar();
    if (opcoes.cache !== 'ausente') window.contextoDados.salvarPrincipal(snapshot(opcoes.cache === 'vazio'));
    if (opcoes.cache === 'outra-conta') conta = 'bia-d1@example.com';
    if (opcoes.cache === 'sem-sessao') token = null;
    if (opcoes.cache === 'legado') window.localStorage.removeItem('personal_cache_dono');
    a.trocarConta = (email) => { conta = email; window.contextoDados.capturar(); };
    a.notificarLogin = async () => {
        token = 'token-d1';
        await Promise.all(listeners.map((fn) => fn({ ownerEmail: conta })));
    };
    a.iniciarShell = async () => {
        carregar(dom, 'assets/js/app/router.js');
        carregar(dom, 'assets/js/app/bootstrap.js');
        await window.__appBootstrap.initialize();
    };
    a.tela = (nome) => { a.atual = nome; };
    window.__appShell = { router: { getCurrentViewId: () => a.atual || opcoes.tela || 'tela-home' } };
    return a;
}

for (const tela of ['tela-home', 'tela-alunos', 'tela-financas']) {
    for (const cache of ['presente', 'vazio', 'ausente', 'outra-conta', 'sem-sessao', 'legado']) {
        test(`D1 boot ${tela}: hidratação ${cache} antes do inicializador, sem B2`, async (t) => {
            const a = ambiente(t, { tela, cache });
            const { window: w } = a;
            const inicializar = async () => {
                a.iniciais.push(w.obterAlunos().map((aluno) => aluno.nome));
                assert.equal(w.obterLimitesGrade().inicio, ['presente', 'vazio'].includes(cache) ? '07:00' : '06:00');
                // Só a carga inicial principal já existente de Home/Alunos; Finanças não ganha outra.
                if (tela !== 'tela-financas' && cache !== 'sem-sessao') await w.carregarDados({ forcarRender: false });
            };
            w.inicializarHome = w.inicializarAlunos = w.inicializarFinancas = inicializar;
            await a.iniciarShell();
            assert.deepEqual(copiar(a.iniciais), [cache === 'presente' ? ['Ana cache'] : []]);
            assert.equal(w.location.hash, `#${tela}`);
            const esperado = tela !== 'tela-financas' && ['ausente', 'outra-conta', 'legado'].includes(cache) ? 5 : 0;
            assert.equal(a.chamadas.length, esperado, 'D1 não adiciona revalidação principal');
            assert.equal(a.iniciais.length, 1);
            if (cache === 'sem-sessao') assert.equal(w.localStorage.getItem('personal_cache_dono'), CONTA, 'cache identificado permanece oculto em disco');
        });
    }
}

test('D1 hidratação repetida não repõe disco sobre memória editada e invalida por conta', (t) => {
    const a = ambiente(t);
    const w = a.window;
    assert.equal(w.hidratarCacheDados().temDados, true);
    w.atualizarAlunos([{ id: 'aluno-1', nome: 'Rascunho em memória' }]);
    w.hidratarCacheDados();
    assert.equal(w.obterAlunos()[0].nome, 'Rascunho em memória');
    a.trocarConta('bia-d1@example.com');
    assert.equal(w.hidratarCacheDados().temDados, false);
    assert.equal(w.obterAlunos().length, 0);
});

test('D1 shell usa render neutro da tela ativa sem reinicializar, hash/scroll/modo/período intactos', async (t) => {
    const a = ambiente(t);
    const w = a.window;
    w.inicializarHome = () => { a.iniciais.push('home'); };
    w.inicializarAlunos = () => { a.iniciais.push('alunos'); };
    w.modoHomeAtivo = 'dia';
    w.dataSelecionada = new w.Date('2026-10-12T12:00:00');
    w.semanaReferencia = new w.Date('2026-10-05T12:00:00');
    w.atualizarDashboardStats = () => a.renders.push('stats');
    w.renderizarHomeDia = () => a.renders.push('dia');
    w.renderizarHomeSemana = () => a.renders.push('semana');
    await a.iniciarShell();
    const scrolls = a.scrolls.length;
    const periodo = [w.dataSelecionada.getTime(), w.semanaReferencia.getTime()];
    await w.__appShell.refreshActiveView();
    assert.deepEqual(a.renders, ['stats', 'dia']);
    assert.deepEqual(a.iniciais, ['home']);
    assert.equal(a.scrolls.length, scrolls);
    assert.equal(w.location.hash, '#tela-home');
    assert.deepEqual([w.dataSelecionada.getTime(), w.semanaReferencia.getTime()], periodo);
    assert.equal(w.modoHomeAtivo, 'dia');
    // Abrir edição depois da leitura bloqueia refresh passivo sem fechá-la.
    const campo = w.document.getElementById('alunoNome');
    campo.value = 'rascunho'; campo.focus();
    w.contextoDados.definirFormulario('d1-form', true);
    assert.equal(await w.__appShell.refreshActiveView(), false);
    assert.equal(campo.value, 'rascunho');
    assert.equal(w.document.activeElement, campo);
});

test('D1 refresh escolhe a tela atual após leitura pendente, não a tela que iniciou', async (t) => {
    const a = ambiente(t);
    const w = a.window;
    w.hidratarCacheDados();
    const gate = adiada();
    a.responder = (rota) => rota === 'alunos' ? gate.promise : resposta(rota === 'configuracao/grade_horarios' ? { horaInicio: '06:00', horaFim: '22:00' } : []);
    w.atualizarDashboardStats = () => a.renders.push('home');
    w.atualizarAlunosAposSync = () => { a.renders.push('alunos'); return true; };
    const leitura = w.carregarDados({ forcarRemoto: true, forcarRender: false });
    await barreira();
    a.tela('tela-alunos');
    gate.resolver(resposta([]));
    assert.equal((await leitura).estado, 'aplicado');
    await w.atualizarViewAtualAposSync(w.contextoDados.capturar());
    assert.deepEqual(a.renders, ['alunos']);
});

function carregarFinancas(a) {
    a.window.salvarCacheFinancas(cards());
    carregar(a.dom, 'assets/js/view-financas.js');
}

test('D1 Finanças mostra cache antes do GET, reutiliza voo e preserva DOM raiz no render', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    carregarFinancas(a);
    const w = a.window;
    const gate = adiada();
    a.responder = () => gate.promise;
    const inicial = w.inicializarFinancas();
    assert.match(w.document.getElementById('financasConteudo').textContent, /Ana cache/);
    const conteudo = w.document.getElementById('financasConteudo');
    const refresh = w.atualizarViewAtualAposSync(w.contextoDados.capturar());
    await barreira();
    assert.equal(a.chamadas.filter((rota) => rota === 'financas').length, 1);
    assert.equal(w.document.getElementById('financasConteudo'), conteudo);
    gate.resolver(resposta(cards('Ana servidor')));
    assert.equal(await inicial, true);
    assert.equal(await refresh, true);
    assert.match(conteudo.textContent, /Ana servidor/);
    w.renderizarFinancas();
    assert.equal(w.document.getElementById('financasConteudo'), conteudo, 'render não reconstrói cabeçalho');
    assert.equal(a.chamadas.length, 1, 'render não busca financeiro');
    assert.equal(conteudo.getAttribute('aria-busy'), 'false');
});

test('D1 Finanças preserva histórico/extrato/foco e não antecipa GET de histórico', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    carregarFinancas(a);
    const w = a.window;
    a.responder = () => resposta(cards('Ana servidor'));
    await w.inicializarFinancas();
    const estado = w.__financasState;
    estado.historicoAberto['aluno-1'] = true;
    estado.historicoPorAluno['aluno-1'] = { status: 'pronto', dados: [], requestId: 1 };
    estado.extratoAberto['extrato-atual-aluno-1'] = true;
    w.renderizarFinancas();
    const resumo = w.document.querySelector('[data-financas-historico-details] > summary');
    resumo.focus();
    const conteudo = w.document.getElementById('financasConteudo');
    await w.atualizarViewAtualAposSync(w.contextoDados.capturar());
    assert.equal(w.document.getElementById('financasConteudo'), conteudo);
    assert.equal(w.document.querySelector('[data-financas-historico-details]').open, true);
    assert.equal(w.document.querySelector('[data-financas-extrato-details]').open, true);
    assert.equal(w.document.activeElement, w.document.querySelector('[data-financas-historico-details] > summary'));
    assert.equal(estado.historicoPorAluno['aluno-1'].status, 'pronto');
    assert.equal(a.chamadas.some((rota) => rota.includes('/historico')), false);
});

test('D1 Finanças terminando fora de tela aplica memória/cache mas não escreve DOM antigo', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    carregarFinancas(a);
    const w = a.window;
    const gate = adiada();
    a.responder = () => gate.promise;
    const inicial = w.inicializarFinancas();
    const conteudo = w.document.getElementById('financasConteudo');
    const anterior = conteudo.innerHTML;
    a.tela('tela-home');
    gate.resolver(resposta(cards('Ana servidor')));
    assert.equal(await inicial, true);
    assert.equal(conteudo.innerHTML, anterior);
    assert.equal(w.__financasState.cards[0].aluno.nome, 'Ana servidor');
    assert.equal(w.obterCacheFinancas().dados[0].aluno.nome, 'Ana servidor');
});

test('D1 Finanças monta somente estrutura ausente após inicialização adiada', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    carregarFinancas(a);
    const w = a.window;
    w.contextoDados.definirFormulario('adiar-financas', true);
    assert.equal(await w.inicializarFinancas(), false);
    assert.equal(w.document.getElementById('financasConteudo'), null);
    w.contextoDados.definirFormulario('adiar-financas', false);
    a.responder = () => resposta(cards('Ana servidor'));
    assert.equal(await w.atualizarViewAtualAposSync(w.contextoDados.capturar()), true);
    assert.match(w.document.getElementById('financasConteudo').textContent, /Ana servidor/);
    assert.ok(w.document.getElementById('modalFinancasPagamento'));
    assert.equal(w.__financasState.handlersBound, true);
});

test('D1 reuso passivo não faz garantirDadosFinancas do manual adotar GET antigo', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas' });
    carregarFinancas(a);
    const w = a.window;
    const gate = adiada();
    a.responder = () => a.chamadas.length === 1 ? gate.promise : resposta(cards('Ana leitura nova'));
    const antiga = w.inicializarFinancas();
    await barreira();
    const nova = await w.garantirDadosFinancas({ forcarRemoto: true });
    assert.equal(a.chamadas.length, 2, 'manual exige nova leitura, não o voo passivo');
    assert.equal(nova['aluno-1'].aluno.nome, 'Ana leitura nova');
    gate.resolver(resposta(cards('Ana leitura antiga')));
    assert.equal(await antiga, false);
    assert.equal(w.__financasState.cards[0].aluno.nome, 'Ana leitura nova');
});

test('D1 login em Finanças preserva leitura própria quando batch principal falha', async (t) => {
    const a = ambiente(t, { tela: 'tela-financas', cache: 'sem-sessao' });
    carregar(a.dom, 'assets/js/view-financas.js');
    const w = a.window;
    // Sem owner no início, reproduz o evento real de login após navegação inicial.
    a.trocarConta(null);
    await a.iniciarShell();
    a.trocarConta(CONTA);
    a.responder = (rota) => rota === 'financas' ? resposta(cards('Ana login')) : { ok: false, status: 500, json: async () => ({}) };
    await a.notificarLogin();
    assert.match(w.document.getElementById('financasConteudo').textContent, /Ana login/);
    assert.equal(a.chamadas.filter((rota) => rota === 'financas').length, 1);
    assert.equal(w.location.hash, '#tela-financas');
});

function carregarAlunos(a) {
    const w = a.window;
    w.reposicaoFlowHelpers = require('../backend/shared/reposicao-flow-helpers');
    w.formatarMoedaFinanceira = (valor) => String(valor || 0);
    w.normalizarNumeroFinanceiro = (valor) => Number(valor) || 0;
    w.hidratarCacheDados();
    carregar(a.dom, 'assets/js/view-alunos.js');
}

test('D1 Alunos preserva formulário/detalhes/foco sem inicializador e mantém complementos', async (t) => {
    const a = ambiente(t, { tela: 'tela-alunos' });
    carregarAlunos(a);
    const w = a.window;
    w.garantirDadosFinancas = async () => ({});
    w.renderizarListaAlunos();
    const detalhe = w.document.querySelector('.aluno-card details'); detalhe.open = true;
    detalhe.querySelector('summary').focus();
    w.atualizarAlunos([{ ...snapshot().alunos[0], nome: 'Ana nova' }]);
    let fechamentos = 0;
    w.togglePainelCadastro = () => { fechamentos++; };
    const campo = w.document.getElementById('alunoNome'); campo.value = 'Edição não reiniciada';
    await w.atualizarViewAtualAposSync(w.contextoDados.capturar());
    assert.equal(fechamentos, 0);
    assert.equal(campo.value, 'Edição não reiniciada');
    assert.equal(w.document.querySelector('.aluno-card details').open, true);
    assert.equal(w.document.activeElement, w.document.querySelector('.aluno-card summary'));
    assert.deepEqual(a.chamadas, ['reposicoes', 'alunos/consistencia-agenda']);
    assert.match(w.document.getElementById('listaAlunos').textContent, /Ana nova/);
});

test('D1 Alunos reutiliza complementos da inicialização e não renderiza após saída da tela', async (t) => {
    const a = ambiente(t, { tela: 'tela-alunos' });
    carregarAlunos(a);
    const w = a.window;
    const gate = adiada();
    let financeiros = 0;
    w.garantirDadosFinancas = () => { financeiros++; return gate.promise; };
    w.togglePainelCadastro = () => {};
    await w.inicializarAlunos();
    let renders = 0;
    const render = w.renderizarListaAlunos;
    w.renderizarListaAlunos = () => { renders++; return render(); };
    const refresh = w.atualizarViewAtualAposSync(w.contextoDados.capturar());
    assert.equal(financeiros, 1);
    const antes = renders;
    a.tela('tela-home');
    gate.resolver({});
    assert.equal(await refresh, true);
    assert.equal(renders, antes, 'complemento antigo só atualiza memória');
    assert.deepEqual(a.chamadas, ['reposicoes', 'alunos/consistencia-agenda']);
});