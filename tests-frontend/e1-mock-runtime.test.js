const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const eventos = () => new Promise((resolver) => setImmediate(resolver));
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
function adiada() { let resolver; const promise = new Promise((resolve) => { resolver = resolve; }); return { promise, resolver }; }
function carregar(dom, arquivo) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}
function ambiente(t, opcoes = {}) {
  const nome = opcoes.nome || 'b2CacheAntigo';
  const url = opcoes.url || `http://127.0.0.2:5500/index.html?mockScenario=${nome}${opcoes.flags || ''}#tela-alunos`;
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="googleSignedOutState"></div><div id="googleSignedInState" hidden></div><span id="headerSessionAvatar"></span>
    <span id="headerCacheState" hidden></span><div id="listaAlunos"></div>
  </body></html>`, { url, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  const nativo = w.localStorage;
  nativo.setItem('personal_cache_dono', 'pessoa-real@example.com');
  nativo.setItem('personal_alunos', '[{"nome":"NÃO USAR DADOS REAIS"}]');
  nativo.setItem('gis_session_cache', 'credencial-sentinela-nativa');
  if (opcoes.disco) Object.entries(opcoes.disco).forEach(([chave, valor]) => nativo.setItem(chave, valor));
  const a = { dom, w, nativo, externas: [], timers: new Map() };
  const discoInicial = Object.fromEntries(Object.keys(nativo).map((chave) => [chave, nativo.getItem(chave)]));
  a.normais = () => Object.fromEntries(Object.keys(nativo).filter((chave) => !chave.startsWith('ui_mock_runtime_v1:')).map((chave) => [chave, nativo.getItem(chave)]));
  a.disco = () => Object.fromEntries(Object.keys(nativo).map((chave) => [chave, nativo.getItem(chave)]));
  a.normalInicial = Object.fromEntries(Object.entries(discoInicial).filter(([chave]) => !chave.startsWith('ui_mock_runtime_v1:')));
  w.Response = Response; w.Request = Request; w.Headers = Headers; w.AbortController = AbortController;
  w.log = new Proxy({}, { get: () => () => {} });
  w.mostrarToast = () => {};
  w.console = { info() {}, warn() {}, error() {} };
  w.fetch = async (input) => { a.externas.push(String(input)); return new Response('{}'); };
  a.fetchOriginal = w.fetch;
  a.setItemOriginal = w.Storage.prototype.setItem;
  let timerId = 0;
  w.setTimeout = (fn) => { const id = ++timerId; a.timers.set(id, fn); return id; };
  w.clearTimeout = (id) => a.timers.delete(id);
  a.avancarTimers = () => { const fns = [...a.timers.values()]; a.timers.clear(); fns.forEach((fn) => fn()); };
  carregar(dom, 'mocks/ui-runtime/sandbox.js');
  w.APP_API_CONFIG = { apiBaseUrl: 'http://localhost:5000/api', apiRootUrl: 'http://localhost:5000' };
  a.instalarRuntime = () => {
    carregar(dom, 'mocks/ui-runtime/scenarios.js');
    carregar(dom, 'mocks/ui-runtime/mock-runtime.js');
    a.runtime = w.__UI_MOCK_RUNTIME;
    a.runtime.configurarRede({ latenciaMs: 0 });
  };
  if (opcoes.runtime !== false && w.__UI_MOCK_SANDBOX) a.instalarRuntime();
  a.carregarDados = () => {
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js'].forEach((arquivo) => carregar(dom, arquivo));
    w.contextoDados.iniciar();
  };
  a.get = (rota, init = {}) => w.fetch(`http://localhost:5000/api/${rota}`, init);
  a.chamadas = () => a.runtime.obterChamadas();
  return a;
}

test('E1-01 — fora do mock nenhuma API/storage/prototype é substituída', async (t) => {
  const a = ambiente(t, { url: 'http://localhost/index.html', runtime: false });
  assert.equal(a.w.__UI_MOCK_SANDBOX, undefined);
  assert.equal(a.w.localStorage, a.nativo);
  assert.equal(a.w.fetch, a.fetchOriginal);
  assert.equal(a.w.Storage.prototype.setItem, a.setItemOriginal);
});

test('E1-02 — facade não lê/apaga dados nativos nem altera Storage.prototype/sessionStorage', (t) => {
  const a = ambiente(t);
  assert.deepEqual(a.normais(), a.normalInicial);
  assert.notEqual(a.w.localStorage, a.nativo);
  assert.equal(a.w.localStorage.getItem('gis_session_cache'), null);
  assert.equal(a.w.Storage.prototype.setItem, a.setItemOriginal);
  a.w.sessionStorage.setItem('fora-do-mock', 'controle');
  assert.equal(a.w.sessionStorage.getItem('fora-do-mock'), 'controle');
  assert.equal(a.w.localStorage.getItem('fora-do-mock'), null);
});

test('E1-03 — persistência escreve somente namespace reservado, sem credenciais', (t) => {
  const a = ambiente(t);
  a.w.localStorage.setItem('gis_session_cache', 'token-efemero-não-persistir');
  a.w.localStorage.setItem('chave-pessoal', 'valor-efemero');
  a.runtime.definirSessao({ conta: 'B', autenticado: true });
  const envelope = a.nativo.getItem(a.w.__UI_MOCK_SANDBOX.chaveEnvelope);
  assert.doesNotMatch(envelope, /token-efemero|chave-pessoal|credencial-sentinela/);
  assert.deepEqual(JSON.parse(envelope).sessao, { conta: 'B', autenticado: true });
  assert.deepEqual(a.normais(), a.normalInicial);
});

test('E1-04 — seed identificado é lido por contexto/storage reais; vazio difere de ausência', (t) => {
  const a = ambiente(t);
  a.carregarDados();
  assert.equal(a.w.hidratarCacheDados().temDados, true);
  assert.match(a.w.obterAlunos()[0].nome, /^CACHE/);
  assert.match(a.w.obterCacheFinancas().dados[0].aluno.nome, /^CACHE/);
  assert.equal(a.w.contextoDados.capturar().ownerEmail, 'mock@local.test');
  const vazio = ambiente(t, { nome: 'b2CacheVazio' }); vazio.carregarDados();
  assert.equal(vazio.w.hidratarCacheDados().temDados, true);
  assert.equal(vazio.w.obterAlunos().length, 0);
  const ausente = ambiente(t, { nome: 'default' }); ausente.carregarDados();
  assert.equal(ausente.w.hidratarCacheDados().temDados, false);
});

test('E1-05 — reload restaura envelope atualizado, não resemeia cache antigo', (t) => {
  const a = ambiente(t);
  a.w.localStorage.setItem('personal_alunos', '[{"id":"a1","nome":"Após atualização"}]');
  const b = ambiente(t, { disco: a.disco() });
  assert.equal(JSON.parse(b.w.localStorage.getItem('personal_alunos'))[0].nome, 'Após atualização');
  assert.deepEqual(b.normais(), b.normalInicial);
});

test('E1-06 — default conserva dados só em memória; não grava nem restaura envelope', (t) => {
  const a = ambiente(t, { nome: 'default' });
  a.w.localStorage.setItem('personal_alunos', '[]');
  assert.equal(a.w.__UI_MOCK_SANDBOX.persistente, false);
  assert.equal(Object.keys(a.nativo).some((key) => key.startsWith('ui_mock_runtime_v1:')), false);
  const b = ambiente(t, { nome: 'default', disco: a.disco() });
  assert.equal(b.w.localStorage.getItem('personal_alunos'), null);
});

test('E1-07 — pendência identificada sobrevive reload; adoção e recarga não a recriam', (t) => {
  const a = ambiente(t, { nome: 'b2Pendencia' }); a.carregarDados();
  const pendencia = a.w.contextoDados.obterPendencia();
  assert.equal(pendencia.tentativaId, 'mock-pendencia-e1');
  const b = ambiente(t, { nome: 'b2Pendencia', disco: a.disco() }); b.carregarDados();
  assert.equal(b.w.contextoDados.obterPendencia().tentativaId, pendencia.tentativaId);
  assert.equal(b.w.contextoDados.abandonarPendencia(pendencia.tentativaId, b.w.contextoDados.capturar()), true);
  const c = ambiente(t, { nome: 'b2Pendencia', disco: b.disco() }); c.carregarDados();
  assert.equal(c.w.contextoDados.obterPendencia(), null);
});

test('E1-08 — cache A oculto para sessão B e sem sessão, disco sintético preservado', async (t) => {
  for (const nome of ['b2OutraConta', 'b2SemSessao']) {
    const a = ambiente(t, { nome }); a.carregarDados();
    assert.equal(a.w.hidratarCacheDados().temDados, false);
    assert.equal(a.w.obterAlunos().length, 0);
    assert.equal(a.w.obterCacheFinancas(), null);
    assert.equal(a.w.localStorage.getItem('personal_cache_dono'), 'mock@local.test');
    if (nome === 'b2OutraConta') assert.match((await (await a.get('alunos')).json())[0].nome, /^CONTA B/);
    else assert.equal((await a.get('alunos')).status, 401);
  }
});

test('E1-09 — sessão dispara listeners/unsubscribe e signOut atualiza header e reload', (t) => {
  const a = ambiente(t);
  const emails = [];
  const remover = a.w.googleIdentity.addAuthChangeListener((sessao) => emails.push(sessao.ownerEmail));
  a.runtime.definirSessao({ conta: 'B', autenticado: true });
  assert.equal(a.w.googleIdentity.getOwnerEmail(), 'outra@local.test');
  assert.equal(a.w.document.getElementById('headerSessionAvatar').textContent, 'O');
  remover(); a.w.googleIdentity.signOut();
  assert.deepEqual(emails, ['mock@local.test', 'outra@local.test']);
  assert.equal(a.w.googleIdentity.getIdToken(), null);
  assert.equal(a.w.document.getElementById('googleSignedOutState').hidden, false);
  const b = ambiente(t, { disco: a.disco() });
  assert.equal(b.w.googleIdentity.isSignedIn(), false);
});

test('E1-10 — cache persistente separado por cenário; clear/reset não apagam nativo', (t) => {
  const a = ambiente(t);
  a.w.localStorage.clear();
  const b = ambiente(t, { disco: a.disco() });
  assert.equal(b.w.localStorage.getItem('personal_alunos'), null, 'clear não resemeia após reload');
  const outro = ambiente(t, { nome: 'b2ServidorVazio', disco: a.disco() });
  assert.match(JSON.parse(outro.w.localStorage.getItem('personal_alunos'))[0].nome, /^CACHE/);
  b.w.__UI_MOCK_SANDBOX.resetar();
  const reset = ambiente(t, { disco: b.disco() });
  assert.match(JSON.parse(reset.w.localStorage.getItem('personal_alunos'))[0].nome, /^CACHE/);
  assert.deepEqual(a.normais(), a.normalInicial);
});

test('E1-11 — ping/API/Google não delegam antes de instalar runtime', async (t) => {
  const a = ambiente(t, { runtime: false });
  for (const url of ['http://localhost:5000', '/api', '/api/alunos', 'https://personal-app-api.vercel.app/api/alunos', 'https://accounts.google.com/o/oauth2/token']) {
    assert.equal((await a.w.fetch(url)).status, 409);
  }
  assert.equal(a.externas.length, 0);
  await a.w.fetch('/assets/css/style.css');
  assert.equal(a.externas.length, 1, 'somente recurso estático segue fetch nativo');
});

test('E1-12 — runtime jamais delega API desconhecida, produção ou URL object', async (t) => {
  const a = ambiente(t);
  await a.w.fetch('https://personal-app-api.vercel.app/api/alunos');
  await a.w.fetch(new a.w.URL('http://localhost:5000/api/alunos'));
  await a.get('rota-inexistente');
  assert.equal(a.externas.length, 0);
  assert.equal(a.chamadas().length, 3);
  assert.ok(a.chamadas().every((chamada) => chamada.estado === 'respondida'));
});

test('E1-13 — Request.method normalizado; auth/GCal bloqueados mesmo no opt-in', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  for (const rota of ['auth/google-calendar', 'gcal/watch/renew']) {
    const req = new Request(`http://localhost:5000/api/${rota}`, { method: 'POST', body: '{}' });
    assert.equal((await a.w.fetch(req)).status, 409);
  }
  assert.deepEqual(copiar(a.chamadas().map((c) => c.method)), ['POST', 'POST']);
  assert.equal(a.externas.length, 0);
});

test('E1-14 — escrita opt-in default com Request atualiza somente store da conta correta', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  const req = new Request('http://localhost:5000/api/alunos', { method: 'POST', body: JSON.stringify({ id: 'e1-aluno', nome: 'Novo mock' }) });
  assert.equal((await a.w.fetch(req)).status, 201);
  assert.ok((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'e1-aluno'));
  a.runtime.definirSessao({ conta: 'B', autenticado: true });
  assert.equal((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'e1-aluno'), false);
  a.runtime.definirSessao({ conta: 'A', autenticado: true });
  assert.ok((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'e1-aluno'));
  assert.deepEqual(a.normais(), a.normalInicial);
  assert.equal(a.externas.length, 0);
});

test('E1-15 — cenários B2 bloqueiam escrita mesmo com flag default', async (t) => {
  const a = ambiente(t, { flags: '&mockEscrita=1' });
  assert.equal((await a.get('alunos', { method: 'POST', body: '{}' })).status, 409);
  assert.equal(a.externas.length, 0);
});

test('E1-16 — latência controlada, cancelamento limpa timer e contador', async (t) => {
  const a = ambiente(t);
  a.runtime.configurarRede({ latenciaMs: 5000 });
  const c = new AbortController();
  const pendente = a.get('alunos', { signal: c.signal });
  assert.equal(a.chamadas()[0].estado, 'pendente');
  assert.equal(a.timers.size, 1);
  c.abort();
  await assert.rejects(pendente, { name: 'AbortError' });
  assert.equal(a.timers.size, 0);
  assert.equal(a.chamadas()[0].estado, 'cancelada');
});

test('E1-17 — abort já acionado de Request/override não responde nem escreve', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  const c = new AbortController(); c.abort();
  const req = new Request('http://localhost:5000/api/alunos', { method: 'POST', body: '{"id":"nao-criar"}', signal: c.signal });
  await assert.rejects(a.w.fetch(req), { name: 'AbortError' });
  assert.equal((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'nao-criar'), false);
});

test('E1-18 — retenção/liberação e abort retiram apenas respostas correspondentes', async (t) => {
  const a = ambiente(t);
  a.runtime.configurarRede({ reter: true });
  const c = new AbortController();
  const cancelada = a.get('alunos', { signal: c.signal });
  const outra = a.get('reposicoes');
  c.abort(); await assert.rejects(cancelada, { name: 'AbortError' });
  assert.equal(a.runtime.liberarRespostas(), 1);
  assert.equal((await outra).status, 200);
  assert.equal(a.runtime.liberarRespostas(), 0);
  assert.deepEqual(copiar(a.chamadas().map((c) => c.estado)), ['cancelada', 'respondida']);
});

test('E1-19 — falha HTTP/401 e JSON inválido controlados sem mudar status bloqueado', async (t) => {
  const a = ambiente(t);
  a.runtime.configurarRede({ falhas: ['reposicoes'], status: 401 });
  assert.equal((await a.get('reposicoes')).status, 401);
  a.runtime.configurarRede({ falhas: [], jsonInvalido: true });
  await assert.rejects((await a.get('alunos')).json(), SyntaxError);
  assert.equal((await a.get('auth/google-calendar')).status, 409, 'JSON inválido não transforma bloqueio em 200');
});

test('E1-20 — offline/online emitem eventos e falha de rede observável sem delegar', async (t) => {
  const a = ambiente(t);
  const sinais = [];
  a.w.addEventListener('offline', () => sinais.push('offline'));
  a.w.addEventListener('online', () => sinais.push('online'));
  a.runtime.configurarRede({ offline: true });
  assert.equal(a.w.navigator.onLine, false);
  await assert.rejects(a.get('alunos'), { name: 'TypeError' });
  assert.equal(a.chamadas()[0].estado, 'falha-rede');
  a.runtime.configurarRede({ offline: false });
  assert.equal((await a.get('alunos')).status, 200);
  assert.deepEqual(sinais, ['offline', 'online']);
  assert.equal(a.externas.length, 0);
});

test('E1-21 — contador registra somente rota/método/estado/status, sem credenciais/corpo', async (t) => {
  const a = ambiente(t);
  await a.get('alunos?token=nao-expor', { headers: { Authorization: 'Bearer nao-expor' } });
  assert.deepEqual(Object.keys(a.chamadas()[0]).sort(), ['estado', 'id', 'method', 'rota', 'status']);
  assert.doesNotMatch(JSON.stringify(a.chamadas()), /nao-expor|Authorization|token/);
  const copia = a.chamadas(); copia[0].status = 999;
  assert.equal(a.chamadas()[0].status, 200);
});

test('E1-22 — seeds/remoto isolados e cenário vazio efetivamente retorna arrays vazios', async (t) => {
  const a = ambiente(t, { nome: 'b2ServidorVazio' });
  assert.match(JSON.parse(a.w.localStorage.getItem('personal_alunos'))[0].nome, /^CACHE/);
  assert.equal((await (await a.get('alunos')).json()).length, 0);
  assert.equal((await (await a.get('financas')).json()).length, 0);
  const base = a.w.__UI_MOCK_SCENARIOS.default;
  assert.equal(base.alunos[0].nome, 'Maria Silva');
});

test('E1-23 — envelope malformado não abre cache normal nem persiste sessão arbitrária', (t) => {
  const chave = 'ui_mock_runtime_v1:b2CacheAntigo';
  const a = ambiente(t, { disco: { [chave]: '{inválido' } });
  assert.match(JSON.parse(a.w.localStorage.getItem('personal_alunos'))[0].nome, /^CACHE/);
  const b = ambiente(t, { disco: { [chave]: JSON.stringify({ versao: 1, dados: { gis_session_cache: 'não permitir' }, sessao: { conta: 'A', autenticado: true, token: 'não persistir' }, semeado: false }) } });
  assert.equal(b.w.localStorage.getItem('gis_session_cache'), null);
  assert.doesNotMatch(b.nativo.getItem(chave), /não permitir|não persistir/);
  assert.deepEqual(b.normais(), b.normalInicial);
});

test('E1-24 — Request em leitura assíncrona escreve só na conta capturada antes da troca', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  const gate = adiada();
  const req = { url: 'http://localhost:5000/api/alunos', method: 'POST', clone: () => ({ text: () => gate.promise }) };
  const pedido = a.w.fetch(req);
  a.runtime.definirSessao({ conta: 'B', autenticado: true });
  gate.resolver('{"id":"aluno-apenas-A","nome":"Criado em A"}');
  assert.equal((await pedido).status, 201);
  assert.equal((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'aluno-apenas-A'), false);
  a.runtime.definirSessao({ conta: 'A', autenticado: true });
  assert.ok((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'aluno-apenas-A'));
});

test('E1-25 — abort durante leitura assíncrona de Request não cria registro', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  const gate = adiada(); const c = new AbortController();
  const req = { url: 'http://localhost:5000/api/alunos', method: 'POST', signal: c.signal, clone: () => ({ text: () => gate.promise }) };
  const pedido = a.w.fetch(req); c.abort(); gate.resolver('{"id":"nao-criar-async"}');
  await assert.rejects(pedido, { name: 'AbortError' });
  assert.equal((await (await a.get('alunos')).json()).some((aluno) => aluno.id === 'nao-criar-async'), false);
});

test('E1-26 — reload usa conta A persistida sobre conta inicial B do cenário', (t) => {
  const a = ambiente(t, { nome: 'b2OutraConta' });
  a.runtime.definirSessao({ conta: 'A', autenticado: true });
  const b = ambiente(t, { nome: 'b2OutraConta', disco: a.disco() });
  assert.equal(b.w.googleIdentity.getOwnerEmail(), 'mock@local.test');
});

test('E1-27 — opt-in com conta B persistida não lê store A ao recarregar', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1&mockPersistencia=1' });
  a.runtime.definirSessao({ conta: 'B', autenticado: true });
  const b = ambiente(t, { nome: 'default', flags: '&mockEscrita=1&mockPersistencia=1', disco: a.disco() });
  assert.equal(b.w.googleIdentity.getOwnerEmail(), 'outra@local.test');
  assert.match((await (await b.get('alunos')).json())[0].nome, /^CONTA B/);
});

test('E1-28 — falha de persistência mantém identidade/header/listeners coerentes em memória', (t) => {
  const a = ambiente(t);
  const emails = [];
  a.w.googleIdentity.addAuthChangeListener((sessao) => emails.push(sessao.ownerEmail));
  const setOriginal = a.w.Storage.prototype.setItem;
  a.w.Storage.prototype.setItem = function () { throw new a.w.DOMException('Quota sintética', 'QuotaExceededError'); };
  const sessao = a.runtime.definirSessao({ conta: 'B', autenticado: true });
  a.w.Storage.prototype.setItem = setOriginal;
  assert.equal(sessao.persistida, false);
  assert.equal(a.w.googleIdentity.getOwnerEmail(), 'outra@local.test');
  assert.equal(a.runtime.session.ownerEmail, 'outra@local.test');
  assert.equal(a.w.document.getElementById('headerSessionAvatar').textContent, 'O');
  assert.equal(emails.at(-1), 'outra@local.test');
  assert.deepEqual(a.normais(), a.normalInicial);
});

test('E1-29 — abort interrompe corpo de Request ainda não concluído sem aguardar stream', async (t) => {
  const a = ambiente(t, { nome: 'default', flags: '&mockEscrita=1' });
  const c = new AbortController();
  const req = { url: 'http://localhost:5000/api/alunos', method: 'POST', signal: c.signal, clone: () => ({ text: () => new Promise(() => {}) }) };
  const pedido = a.w.fetch(req); c.abort();
  await assert.rejects(pedido, { name: 'AbortError' });
  assert.equal(a.chamadas()[0].estado, 'cancelada');
});

test('E1-30 — resposta cancelada não volta como sucesso quando latência termina', async (t) => {
  const a = ambiente(t);
  a.runtime.configurarRede({ latenciaMs: 5000 });
  const c = new AbortController();
  const pedido = a.get('alunos', { signal: c.signal });
  const resultado = pedido.then(() => 'sucesso', (erro) => erro.name);
  c.abort(); a.avancarTimers();
  assert.equal(await resultado, 'AbortError');
  assert.equal(a.chamadas()[0].estado, 'cancelada');
});