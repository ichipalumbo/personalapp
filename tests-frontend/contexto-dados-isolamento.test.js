const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}
function ambiente(t, { storage = false, html = '' } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body><div class="container"><main id="tela-alunos"></main>${html}</div></body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    let email = 'a@example.com';
    let token = 'token';
    const listeners = [];
    window.googleIdentity = {
        getOwnerEmail: () => email,
        getIdToken: () => token,
        addAuthChangeListener: (fn) => { listeners.push(fn); return () => {}; },
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = () => {};
    window.fetch = async () => resposta({});
    carregar(dom, 'assets/js/state.js');
    carregar(dom, 'assets/js/app/contexto-dados.js');
    if (storage) carregar(dom, 'assets/js/storage.js');
    window.contextoDados.iniciar();
    return {
        dom, window, contexto: window.contextoDados,
        trocar: (novo) => { email = novo; token = novo ? 'token' : null; listeners.forEach((fn) => fn()); },
        expirar: () => { token = null; window.dispatchEvent(new window.Event('focus')); },
        expirarSemEvento: () => { token = null; },
    };
}
function snapshot(nome = 'Ana') {
    return { alunos: [{ id: 'aluno', nome, objetivo: 'Personal Trainer', corObjetivo: { nome: 'Tangerina', hex: '#FF887C' } }], aulas: [{ id: 'aula', alunoId: 'aluno', googleCalendarEventId: 'google-original' }], reposicoes: [], grade: { inicio: '08:00', fim: '18:00' }, meta: 100 };
}
function resposta(corpo, status = 200) {
    return { ok: status >= 200 && status < 300, status, json: async () => corpo, clone: () => resposta(corpo, status) };
}
function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}

test('legado sem dono é descartado e nunca migrado pelo carregador real', async (t) => {
    const { window } = ambiente(t, { storage: true });
    window.localStorage.setItem('personalTrainerData', JSON.stringify(snapshot()));
    window.localStorage.setItem('personal_alunos', JSON.stringify(snapshot().alunos));
    window.localStorage.setItem('personal_financas_cache', JSON.stringify({ dados: [] }));
    const metodos = [];
    window.fetch = async (url, init = {}) => {
        metodos.push(init.method || 'GET');
        return resposta(String(url).includes('configuracao') ? { horaInicio: '08:00', horaFim: '18:00' } : []);
    };
    await window.carregarDados({ forcarRender: false });
    assert.equal(window.localStorage.getItem('personalTrainerData'), null);
    assert.equal(window.localStorage.getItem('personal_financas_cache'), null);
    assert.equal(window.obterAlunos().length, 0);
    assert.ok(metodos.every((m) => m === 'GET'));
});

test('cache identificado é ocultado sem token mas preservado no disco', (t) => {
    const { window, contexto, expirar } = ambiente(t, { storage: true, html: '<div id="listaAlunos">Ana</div>' });
    const ctx = contexto.capturar();
    contexto.salvarPrincipal(snapshot(), ctx);
    window.carregarDadosDoLocalStorage();
    assert.equal(window.obterAlunos()[0].nome, 'Ana');
    expirar();
    assert.equal(window.obterAlunos().length, 0);
    assert.equal(window.document.getElementById('listaAlunos').textContent, '');
    assert.equal(contexto.lerPrincipal(), null);
    assert.match(window.localStorage.getItem('personal_alunos'), /Ana/);
});

test('A→B→A não revalida contexto antigo e cache financeiro não reatribui agenda', (t) => {
    const { window, contexto, trocar } = ambiente(t);
    const anterior = contexto.capturar();
    contexto.salvarPrincipal(snapshot(), anterior);
    trocar('b@example.com');
    assert.equal(contexto.lerPrincipal(), null);
    contexto.salvarFinancas([{ alunoId: 'B' }], contexto.capturar());
    assert.equal(window.localStorage.getItem('personal_cache_dono'), 'a@example.com');
    trocar('a@example.com');
    assert.equal(contexto.atual(anterior), false);
    assert.equal(contexto.lerFinancas(), null);
    assert.equal(contexto.salvarFinancas([], anterior), false);
});

test('snapshot vazio válido é distinto de ausência de cache', (t) => {
    const { contexto } = ambiente(t);
    assert.equal(contexto.lerPrincipal(), null);
    contexto.salvarPrincipal({ ...snapshot(), alunos: [], aulas: [] });
    assert.ok(contexto.lerPrincipal());
    assert.equal(contexto.lerPrincipal().alunos.length, 0);
});

test('pendência de A sobrevive cache ativo de B e confirmação antiga não apaga tentativa nova', (t) => {
    const { contexto, trocar } = ambiente(t);
    const a = contexto.capturar();
    const idAntigo = contexto.iniciarPendencia(snapshot('Alteração antiga'), a);
    const idNovo = contexto.iniciarPendencia(snapshot('Alteração nova'), a);
    assert.notEqual(idAntigo, idNovo);
    assert.equal(contexto.confirmarPendencia(idAntigo, a, snapshot()), false);
    trocar('b@example.com');
    contexto.salvarPrincipal(snapshot('B'));
    assert.equal(contexto.obterPendencia(), null);
    trocar('a@example.com');
    assert.equal(contexto.lerPrincipal().alunos[0].nome, 'Alteração nova');
    assert.equal(contexto.obterPendencia().tentativaId, idNovo);
});

test('sem conseguir remover identificação não escreve snapshot parcial', (t) => {
    const { window, contexto } = ambiente(t);
    contexto.salvarPrincipal(snapshot());
    const original = window.Storage.prototype.removeItem;
    window.Storage.prototype.removeItem = function (chave) {
        if (chave === 'personal_cache_dono') throw new Error('bloqueado');
        return original.call(this, chave);
    };
    assert.equal(contexto.salvarPrincipal(snapshot('Outra')), false);
    assert.equal(contexto.lerPrincipal().alunos[0].nome, 'Ana');
});

test('resposta de dados principal tardia não aplica nem fallback reidrata outra conta', async (t) => {
    const { window, contexto, trocar } = ambiente(t, { storage: true });
    const gate = adiada();
    window.fetch = async (url) => {
        if (String(url).endsWith('/alunos')) return gate.promise;
        return resposta(String(url).includes('configuracao') ? { horaInicio: '08:00', horaFim: '18:00' } : []);
    };
    const p = window.carregarDados({ forcarRemoto: true, forcarRender: false });
    trocar('b@example.com');
    contexto.salvarPrincipal(snapshot('B'));
    window.carregarDadosDoLocalStorage();
    gate.resolver(resposta(snapshot('A').alunos));
    const resultado = await p;
    assert.equal(resultado.origem, 'contexto-obsoleto');
    assert.equal(window.obterAlunos()[0].nome, 'B');
    assert.equal(contexto.lerPrincipal().alunos[0].nome, 'B');
});

test('falha real de salvar preserva snapshot pendente sem reenviar na leitura', async (t) => {
    const { window, contexto } = ambiente(t, { storage: true });
    window.atualizarAlunos(snapshot().alunos);
    window.atualizarAulas(snapshot().aulas);
    let chamadas = 0;
    window.fetch = async () => { chamadas++; throw new Error('rede'); };
    const resultado = await window.salvarDados(true);
    assert.equal(resultado.ok, false);
    assert.equal(contexto.obterPendencia().snapshot.aulas[0].googleCalendarEventId, 'google-original');
    const antes = chamadas;
    assert.equal((await window.carregarDados({ forcarRemoto: true })).origem, 'local-pendente');
    assert.equal(chamadas, antes);
});

test('vínculo Google confirmado pode atualizar pendência parcial sem declarar sucesso', (t) => {
    const { contexto } = ambiente(t);
    const a = contexto.capturar();
    const id = contexto.iniciarPendencia(snapshot(), a);
    contexto.atualizarVinculoPendente(id, a, 'aula', 'google-confirmado');
    assert.equal(contexto.obterPendencia().snapshot.aulas[0].googleCalendarEventId, 'google-confirmado');
    assert.equal(contexto.obterPendencia().tentativaId, id);
});

test('Finanças descarta listagem de sessão anterior e restaura controles', async (t) => {
    const { dom, window, trocar } = ambiente(t, { storage: true, html: '<button id="btnSalvarPagamento" disabled></button>' });
    carregar(dom, 'assets/js/view-financas.js');
    const gate = adiada();
    window.apiFetchBackend = () => gate.promise;
    const p = window.inicializarFinancas();
    trocar('b@example.com');
    gate.resolver(resposta([{ alunoId: 'a', aluno: { nome: 'Ana' } }]));
    await p;
    assert.equal(window.__financasState.cards.length, 0);
    assert.equal(window.localStorage.getItem('personal_financas_cache'), null);
    assert.equal(window.document.getElementById('btnSalvarPagamento').disabled, false);
    assert.doesNotMatch(window.document.body.textContent, /Ana/);
});

test('resposta JSON financeira atrasada após A→B→A continua descartada', async (t) => {
    const { dom, window, trocar } = ambiente(t, { storage: true });
    carregar(dom, 'assets/js/view-financas.js');
    const gate = adiada();
    let entrouJson;
    const iniciou = new Promise((resolve) => { entrouJson = resolve; });
    window.apiFetchBackend = async () => ({ ok: true, status: 200, json: () => { entrouJson(); return gate.promise; } });
    const p = window.inicializarFinancas();
    await iniciou;
    trocar('b@example.com');
    trocar('a@example.com');
    gate.resolver([{ alunoId: 'velho', aluno: { nome: 'Conta antiga' } }]);
    await p;
    assert.equal(window.__financasState.cards.length, 0);
    assert.equal(window.obterCacheFinancas(), null);
});

test('troca de conta fecha rascunho sem onRequestClose ou preservar campos pessoais', (t) => {
    const { window, trocar } = ambiente(t, { html: '<div class="modal-overlay" style="display:flex"><form><input value="Nome de A"></form></div>' });
    const modal = window.document.querySelector('.modal-overlay');
    const campo = modal.querySelector('input');
    campo.value = 'Rascunho de A';
    trocar('b@example.com');
    assert.equal(modal.style.display, 'none');
    assert.notEqual(campo.value, 'Rascunho de A');
});

test('histórico financeiro da sessão anterior não aparece após A→B→A', async (t) => {
    const { dom, window, trocar } = ambiente(t, { storage: true });
    carregar(dom, 'assets/js/view-financas.js');
    const gate = adiada();
    let iniciou;
    const inicio = new Promise((resolve) => { iniciou = resolve; });
    window.apiFetchBackend = async (url) => {
        if (url.endsWith('/historico')) { iniciou(); return gate.promise; }
        return resposta([{ alunoId: 'aluno', aluno: { nome: 'Ana' }, historicoDisponivel: true, cicloAtual: { _id: 'ciclo', valorTotalCiclo: 100 } }]);
    };
    await window.inicializarFinancas();
    const details = window.document.querySelector('[data-financas-historico-details]');
    details.open = true;
    details.dispatchEvent(new window.Event('toggle'));
    await inicio;
    trocar('b@example.com');
    trocar('a@example.com');
    gate.resolver(resposta([{ _id: 'antigo', alunoId: 'aluno', valorTotalCiclo: 9999 }]));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(Object.keys(window.__financasState.historicoPorAluno).length, 0);
    assert.doesNotMatch(window.document.body.textContent, /9999/);
});

test('histórico de reposições antigo não reabre nem reidrata a lista da outra conta', async (t) => {
    const { dom, window, trocar } = ambiente(t, { storage: true, html: '<div id="listaAlunos"></div><div id="modalHistoricoReposicoes" style="display:none"><div id="conteudoHistoricoReposicoes"></div><div id="resumoHistoricoReposicoes"></div></div>' });
    carregar(dom, 'assets/js/view-alunos.js');
    window.atualizarAlunos(snapshot().alunos);
    const gate = adiada();
    window.apiFetchBackend = () => gate.promise;
    const p = window.abrirHistoricoReposicoes('aluno');
    trocar('b@example.com');
    gate.resolver(resposta([{ id: 'repo-antiga', alunoId: 'aluno', status: 'pendente' }]));
    await p;
    assert.equal(window.document.getElementById('modalHistoricoReposicoes').style.display, 'none');
    assert.equal(window.document.getElementById('conteudoHistoricoReposicoes').textContent, '');
    assert.equal(window.obterAlunos().length, 0);
    assert.equal(window.document.getElementById('listaAlunos').textContent, '');
});

test('leitura de estado revalida sessão e limpa também a grade da semana', (t) => {
    const { window, expirar } = ambiente(t, { storage: true, html: '<div id="calendarioSemanalHomeGrid">Ana</div>' });
    window.atualizarAlunos(snapshot().alunos);
    expirar();
    assert.equal(window.obterAlunos().length, 0);
    assert.equal(window.document.getElementById('calendarioSemanalHomeGrid').textContent, '');
});

test('navegar na agenda com token expirado revalida mesmo sem evento de foco', (t) => {
    const { dom, window, expirarSemEvento } = ambiente(t, { storage: true, html: '<div id="calendarioSemanalHomeGrid">Ana</div>' });
    window.getNomesDiasSemana = () => ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    carregar(dom, 'assets/js/view-home.js');
    carregar(dom, 'assets/js/view-calendario.js');
    window.atualizarAlunos(snapshot().alunos);
    expirarSemEvento();
    window.renderizarHomeSemana();
    assert.equal(window.obterAlunos().length, 0);
    assert.equal(window.document.getElementById('calendarioSemanalHomeGrid').textContent, '');
});

test('área da conta descarta resposta de status tardia sem reexpor dados anteriores', async (t) => {
    const { dom, window, trocar } = ambiente(t, { html: '<div id="appSettingsModal" class="modal-overlay" style="display:none"></div><div id="appSettingsBackdrop" style="display:none"></div>' });
    const gate = adiada();
    const estados = [];
    window.userAreaSessionHelper = { getSessionSnapshot: () => ({ isSignedIn: true }), renderProfile: (s) => s };
    window.googleIdentity.checkCalendarConnectionStatus = () => gate.promise;
    window.googleIdentity.updateGoogleCalendarStatusUI = (s) => estados.push(s);
    carregar(dom, 'assets/js/settings-modal.js');
    window.openUserAreaModal();
    const antes = estados.length;
    trocar('b@example.com');
    gate.resolver({ connected: true, details: { email: 'a@example.com' } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(estados.length, antes);
    assert.equal(window.document.getElementById('appSettingsModal').style.display, 'none');
});