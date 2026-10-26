// [TAG-TESTS-MOCK-OTIMISTA] cenarios-mock-otimista.test.js
// Valida os 3 novos cenários de mock criados para auditar interface otimista:
// otimistaSucesso, otimistaFalha e otimistaGCalFalha.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function carregar(dom, arquivo) {
  vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

function criarAmbiente(t, nomeCenario, flags = '') {
  const url = `http://127.0.0.2:5500/index.html?mockScenario=${nomeCenario}${flags}#tela-home`;
  const dom = new JSDOM(`<!doctype html><html><body>
    <div id="googleSignedOutState"></div><div id="googleSignedInState" hidden></div>
    <span id="headerSessionAvatar"></span><span id="headerCacheState" hidden></span>
  </body></html>`, { url, runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.Response = Response;
  w.Request = Request;
  w.Headers = Headers;
  w.AbortController = AbortController;
  w.fetch = async () => new Response('{}');
  w.log = { info() {}, debug() {}, warn() {}, error() {} };
  w.mostrarToast = () => {};
  w.console = { info() {}, warn() {}, error() {} };
  w.APP_API_CONFIG = { apiBaseUrl: 'http://localhost:5000/api', apiRootUrl: 'http://localhost:5000' };

  carregar(dom, 'mocks/ui-runtime/sandbox.js');
  carregar(dom, 'mocks/ui-runtime/scenarios.js');
  carregar(dom, 'mocks/ui-runtime/mock-runtime.js');

  // Para o teste de rota rodar sem delay real:
  w.__UI_MOCK_RUNTIME.configurarRede({ latenciaMs: 0 });

  return { dom, window: w, fetch: w.fetch };
}

test('Mock Otimista — cenário otimistaSucesso libera escrita no store em memória', async (t) => {
  const { fetch, window } = criarAmbiente(t, 'otimistaSucesso');
  assert.equal(window.__UI_MOCK_SCENARIOS.otimistaSucesso.latenciaMs, 2500);

  const resPost = await fetch('http://localhost:5000/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'aluno-otimista-1', nome: 'Aluno Otimista' })
  });
  assert.equal(resPost.status, 201);
  const criado = await resPost.json();
  assert.equal(criado.nome, 'Aluno Otimista');

  const resGet = await fetch('http://localhost:5000/api/alunos');
  const lista = await resGet.json();
  assert.ok(lista.some((a) => a.id === 'aluno-otimista-1'));
});

test('Mock Otimista — cenário otimistaFalha simula erro HTTP 500 na escrita', async (t) => {
  const { fetch, window } = criarAmbiente(t, 'otimistaFalha');
  assert.equal(window.__UI_MOCK_SCENARIOS.otimistaFalha.latenciaMs, 1500);

  const resPost = await fetch('http://localhost:5000/api/alunos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'aluno-falha', nome: 'Não Gravar' })
  });
  assert.equal(resPost.status, 500);
  const erro = await resPost.json();
  assert.equal(erro.ok, false);
});

test('Mock Otimista — cenário otimistaGCalFalha retorna gcalSyncFailed: true na gravação de agendamento', async (t) => {
  const { fetch } = criarAmbiente(t, 'otimistaGCalFalha');

  const resPost = await fetch('http://localhost:5000/api/agendamentos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'ag-gcal-falha', alunoNome: 'Maria', data: '2026-10-27', horarioInicio: '08:00' })
  });
  assert.equal(resPost.status, 201);
  const payload = await resPost.json();
  assert.equal(payload.gcalSyncFailed, true);
  assert.equal(payload.id, 'ag-gcal-falha');
});
