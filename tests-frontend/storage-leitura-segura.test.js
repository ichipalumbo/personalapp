const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
function resposta(dados, status = 200) {
    return { status, ok: status >= 200 && status < 300, json: async () => dados };
}
function pendente() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}
function criarAmbiente(t) {
    const dom = new JSDOM('<!doctype html><html><body><span id="headerCacheState" hidden></span></body></html>', { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    require('./setup/contexto-dados')(dom);
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.fetch = async () => resposta({}); // ping independente
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = () => {};
    ['state.js', 'storage.js'].forEach((nome) => {
        vm.runInContext(fs.readFileSync(path.join(RAIZ, 'assets/js', nome), 'utf8'), dom.getInternalVMContext());
    });
    const anterior = {
        alunos: [{ id: 'antigo', nome: 'Anterior' }],
        aulas: [{ id: 'aula-antiga', source: 'google_external' }],
        reposicoes: [{ id: 'repo-antiga', status: 'pendente' }],
        grade: { inicio: '07:00', fim: '20:00' }, meta: 125
    };
    window.contextoDados.salvarPrincipal(anterior);
    window.carregarDadosDoLocalStorage();
    const corpos = {
        alunos: [{ id: 'novo', nome: 'Novo', objetivo: 'Personal' }],
        agendamentos: [{ id: 'aula', gcalSyncPendingAt: 'antiga', gcalSyncPendingTentativas: 2 }],
        configuracao: { horaInicio: '08:00', horaFim: '18:00' },
        'bloqueios-externos': [{ googleCalendarEventId: 'externo', titulo: 'Ocupado', data: '2026-10-06' }],
        reposicoes: [{ id: 'repo', status: 'pendente', dataOriginal: '2026-10-06' }, { id: 'agendada', status: 'agendada' }]
    };
    const chamadas = [];
    const substitutos = {};
    window.fetch = async (url, options = {}) => {
        const rota = new URL(String(url)).pathname.replace('/api/', '');
        const chave = rota.startsWith('configuracao') ? 'configuracao' : rota;
        chamadas.push({ rota, method: options.method || 'GET' });
        if (substitutos[rota]) return substitutos[rota](options);
        if (substitutos[chave]) return substitutos[chave](options);
        return resposta(corpos[chave]);
    };
    const memoria = () => JSON.stringify({ alunos: window.obterAlunos(), aulas: window.obterAulas(), reposicoes: window.obterReposicoes(), grade: window.obterLimitesGrade(), meta: window.faturamentoMeta });
    const disco = () => JSON.stringify(Object.fromEntries(Object.keys(window.localStorage).map((chave) => [chave, window.localStorage.getItem(chave)])));
    const somenteGet = () => assert.ok(chamadas.every((c) => c.method === 'GET'), JSON.stringify(chamadas));
    return { window, corpos, chamadas, substitutos, memoria, disco, somenteGet };
}

test('obter prepara sem aplicar e normalização não grava nem modifica resposta', async (t) => {
    const a = criarAmbiente(t);
    const antes = a.memoria();
    const disco = a.disco();
    const leitura = await a.window.obterLeituraDados();
    assert.equal(leitura.estado, 'preparado');
    assert.equal(a.memoria(), antes);
    assert.equal(a.disco(), disco);
    assert.equal(a.corpos.agendamentos[0].gcalSyncPendingAt, 'antiga');
    leitura.dados.alunos[0].nome = 'Alteração externa';
    const resultado = a.window.aplicarLeituraDados(leitura);
    assert.equal(resultado.estado, 'aplicado');
    assert.equal(a.window.obterAlunos()[0].nome, 'Novo');
    assert.equal(a.window.obterAulas().length, 2);
    assert.equal(a.window.obterAulas()[0].gcalSyncPendingAt, undefined);
    assert.equal(a.window.obterReposicoes().length, 1);
    a.somenteGet();
});

test('remoto vazio substitui cache anterior sem migração', async (t) => {
    const a = criarAmbiente(t);
    Object.keys(a.corpos).filter((c) => c !== 'configuracao').forEach((c) => { a.corpos[c] = []; });
    const resultado = await a.window.carregarDados({ forcarRemoto: true, forcarRender: false });
    assert.equal(resultado.estado, 'aplicado');
    assert.equal(a.window.obterAlunos().length, 0);
    assert.equal(a.window.obterAulas().length, 0);
    assert.equal(a.window.obterReposicoes().length, 0);
    assert.equal(a.window.contextoDados.lerPrincipal().alunos.length, 0);
    assert.ok(a.window.temDadosLocaisNoCache());
    a.somenteGet();
});

for (const rota of ['alunos', 'agendamentos', 'configuracao', 'bloqueios-externos', 'reposicoes']) {
    test(`HTTP 500 em ${rota} preserva batch inteiro e não trata falha como vazio`, async (t) => {
        const a = criarAmbiente(t);
        // Inicializar caminho de cache; edição recente em memória não pode ser perdida pelo fallback.
        await a.window.carregarDados({ forcarRender: false });
        a.window.obterAlunos()[0].nome = 'Memória mais recente';
        const memoria = a.memoria();
        const disco = a.disco();
        a.substitutos[rota] = () => resposta({}, 500);
        const resultado = await a.window.carregarDados({ forcarRemoto: true, forcarRender: false, silenciosoUI: true });
        assert.equal(resultado.estado, 'falha');
        assert.equal(resultado.ok, false);
        assert.equal(a.memoria(), memoria);
        assert.equal(a.disco(), disco);
        a.somenteGet();
    });
}

for (const [nome, chave, dados] of [
    ['lista ausente', 'alunos', {}],
    ['item sem id', 'agendamentos', [{}]],
    ['aluno sem nome', 'alunos', [{ id: 'novo' }]],
    ['reposição sem status', 'reposicoes', [{ id: 'repo' }]],
    ['horário por coerção', 'configuracao', { horaInicio: ['08:00'], horaFim: '18:00' }],
    ['configuração array', 'configuracao', []],
    ['bloqueio sem id', 'bloqueios-externos', [{}]],
    ['bloqueio com id objeto', 'bloqueios-externos', [{ googleCalendarEventId: {} }]],
]) {
    test(`${nome} invalida leitura sem aplicar parcialmente`, async (t) => {
        const a = criarAmbiente(t);
        const antes = a.memoria();
        const disco = a.disco();
        a.corpos[chave] = dados;
        const leitura = await a.window.obterLeituraDados();
        assert.equal(leitura.estado, 'falha');
        assert.equal(a.memoria(), antes);
        assert.equal(a.disco(), disco);
    });
}

test('JSON inválido não tenta fallback de configuração nem substitui grade', async (t) => {
    const a = criarAmbiente(t);
    a.substitutos.configuracao = () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('JSON inválido'); } });
    const antes = a.memoria();
    const leitura = await a.window.obterLeituraDados();
    assert.equal(leitura.estado, 'falha');
    assert.equal(a.chamadas.filter((c) => c.rota === 'configuracao').length, 0);
    assert.equal(a.memoria(), antes);
});

test('404 da grade usa fallback válido e 404 nas duas rotas é falha', async (t) => {
    const a = criarAmbiente(t);
    a.substitutos['configuracao/grade_horarios'] = () => resposta({}, 404);
    const ok = await a.window.obterLeituraDados();
    assert.equal(ok.estado, 'preparado');
    assert.equal(a.chamadas.filter((c) => c.rota === 'configuracao').length, 1);
    a.substitutos.configuracao = () => resposta({}, 404);
    const falha = await a.window.obterLeituraDados();
    assert.equal(falha.estado, 'falha');
});

test('401 de reposições retorna falha de sessão sem apagar dados ou mostrar toast silencioso', async (t) => {
    const a = criarAmbiente(t);
    a.substitutos.reposicoes = () => resposta({}, 401);
    const antes = a.memoria();
    let toasts = 0;
    a.window.mostrarToast = () => { toasts++; };
    const resultado = await a.window.carregarDados({ forcarRemoto: true, forcarRender: false, silenciosoUI: true, silenciarAuthToast: true });
    assert.equal(resultado.motivo, 'sessao-expirada');
    assert.equal(a.memoria(), antes);
    assert.equal(toasts, 0);
});

test('leitura antiga substituída não sobrescreve snapshot mais novo', async (t) => {
    const a = criarAmbiente(t);
    const gate = pendente();
    a.substitutos.alunos = () => gate.promise;
    const antiga = a.window.obterLeituraDados();
    delete a.substitutos.alunos;
    const nova = await a.window.obterLeituraDados();
    assert.equal(a.window.aplicarLeituraDados(nova).estado, 'aplicado');
    gate.resolver(resposta([{ id: 'antigo', nome: 'Antigo remoto' }]));
    assert.equal((await antiga).estado, 'descartado');
    assert.equal(a.window.obterAlunos()[0].nome, 'Novo');
});

test('pendência surgida entre obter e aplicar impede sobrescrita e não é apagada', async (t) => {
    const a = criarAmbiente(t);
    const leitura = await a.window.obterLeituraDados();
    const snapshot = a.window.contextoDados.lerPrincipal();
    const id = a.window.contextoDados.iniciarPendencia(snapshot);
    const antes = a.memoria();
    assert.equal(a.window.aplicarLeituraDados(leitura).estado, 'adiado');
    assert.equal(a.memoria(), antes);
    assert.equal(a.window.contextoDados.obterPendencia().tentativaId, id);
});

test('cancelamento externo não é timeout e não reidrata fallback', async (t) => {
    const a = criarAmbiente(t);
    const controller = new a.window.AbortController();
    a.substitutos.alunos = ({ signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new a.window.DOMException('Cancelado', 'AbortError')), { once: true });
    });
    const antes = a.memoria();
    const disco = a.disco();
    const p = a.window.carregarDados({ forcarRemoto: true, forcarRender: false, signal: controller.signal });
    controller.abort();
    const resultado = await p;
    assert.equal(resultado.estado, 'descartado');
    assert.equal(resultado.motivo, 'cancelado');
    assert.equal(a.memoria(), antes);
    assert.equal(a.disco(), disco);
});

test('timeout retorna falha sem aplicar respostas das outras rotas', async (t) => {
    const a = criarAmbiente(t);
    a.substitutos.alunos = ({ signal }) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new a.window.DOMException('Cancelado', 'AbortError')), { once: true });
    });
    const antes = a.memoria();
    const resultado = await a.window.obterLeituraDados({ timeoutMs: 5 });
    assert.equal(resultado.estado, 'falha');
    assert.equal(a.memoria(), antes);
});

test('meta identificada sobrevive leitura independente antes de hidratar ao voltar à conta', async (t) => {
    const a = criarAmbiente(t);
    const identidade = a.window.googleIdentity;
    const original = identidade.getIdToken;
    identidade.getIdToken = () => null;
    a.window.contextoDados.capturar();
    identidade.getIdToken = original;
    a.window.contextoDados.capturar();
    assert.equal(a.window.faturamentoMeta, 0);
    const leitura = await a.window.obterLeituraDados();
    a.window.aplicarLeituraDados(leitura);
    assert.equal(a.window.faturamentoMeta, 125);
});

test('timeout inclui JSON pendurado depois dos headers', async (t) => {
    const a = criarAmbiente(t);
    const gate = pendente();
    // Limite de segurança para a prova por mutação: implementação sem timeout não pendura a suíte.
    const limite = setTimeout(() => gate.resolver(a.corpos.alunos), 100);
    t.after(() => clearTimeout(limite));
    a.substitutos.alunos = () => ({ ok: true, status: 200, json: () => gate.promise });
    const antes = a.memoria();
    const resultado = await a.window.obterLeituraDados({ timeoutMs: 10 });
    assert.equal(resultado.estado, 'falha');
    gate.resolver(a.corpos.alunos);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(a.memoria(), antes);
});

test('cancelar depois dos headers termina o batch e descarta JSON tardio', async (t) => {
    const a = criarAmbiente(t);
    const controller = new a.window.AbortController();
    const gate = pendente();
    const limite = setTimeout(() => gate.resolver(a.corpos.alunos), 100);
    t.after(() => clearTimeout(limite));
    let iniciouJson;
    const inicio = new Promise((resolve) => { iniciouJson = resolve; });
    a.substitutos.alunos = () => ({ ok: true, status: 200, json: () => { iniciouJson(); return gate.promise; } });
    const antes = a.memoria();
    const disco = a.disco();
    const p = a.window.obterLeituraDados({ signal: controller.signal });
    await inicio;
    controller.abort();
    const resultado = await p;
    assert.equal(resultado.estado, 'descartado');
    assert.equal(resultado.motivo, 'cancelado');
    gate.resolver(a.corpos.alunos);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(a.memoria(), antes);
    assert.equal(a.disco(), disco);
});