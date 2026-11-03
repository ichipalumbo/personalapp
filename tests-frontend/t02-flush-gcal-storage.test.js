// [TAG-TESTS-T02-FLUSH-GCAL] t02-flush-gcal-storage.test.js
// Testes do Cartão T02:
// - Flush pós-CRUD em storage.js (/api/agendamentos/flush-gcal) após POST/PUT/DELETE com gcalStatus: 'pendente' ou queuedForGcalDelete: true;
// - Mesclagem de googleCalendarEventId retornado pelo flush no estado local;
// - Propagação de gcalSyncFailed: true retornado pelo flush (incluindo falha no Outbox de DELETE).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function respostaJson(dados, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    clone() {
      return respostaJson(dados, status);
    },
    json: async () => JSON.parse(JSON.stringify(dados))
  };
}

function criarAmbienteStorage(t) {
  const dom = new JSDOM(
    '<!doctype html><html><body><span id="headerCacheState" hidden></span></body></html>',
    { url: 'http://localhost', runScripts: 'outside-only' }
  );
  t.after(() => dom.window.close());
  const { window } = dom;
  window.Headers = Headers;
  window.AbortController = AbortController;
  require('./setup/contexto-dados')(dom);
  window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
  window.fetch = async () => respostaJson({ ok: true });
  window.log = new Proxy({}, { get: () => () => {} });
  const toasts = [];
  window.mostrarToast = (msg, tipo) => {
    toasts.push({ msg, tipo });
  };
  ['state.js', 'storage.js'].forEach((nome) => {
    vm.runInContext(
      fs.readFileSync(path.join(RAIZ, 'assets/js', nome), 'utf8'),
      dom.getInternalVMContext(),
      { filename: nome }
    );
  });
  return { window, toasts };
}

test('T02-01: salvarDados dispara POST /agendamentos/flush-gcal após criar agendamento pendente e mescla googleCalendarEventId no estado local', async (t) => {
  const { window, toasts } = criarAmbienteStorage(t);
  window.atualizarAlunos([]);
  window.atualizarAulas([
    {
      id: 'ag-novo-1',
      alunoId: 'al-1',
      alunoNome: 'Carla',
      data: '2026-10-28',
      horarioInicio: '08:00',
      horarioFim: '09:00',
      tipo: 'aula'
    }
  ]);
  window.atualizarReposicoes([]);

  const chamadas = [];
  window.fetch = async (url, options = {}) => {
    const pathname = new URL(String(url)).pathname;
    const method = options.method || 'GET';
    chamadas.push(`${method} ${pathname}`);

    if (pathname === '/api/alunos' && method === 'GET') return respostaJson([]);
    if (pathname === '/api/configuracao/grade_horarios' && method === 'PUT') return respostaJson({ ok: true });
    if (pathname === '/api/agendamentos' && method === 'GET') return respostaJson([]);
    if (pathname === '/api/agendamentos' && method === 'POST') {
      const body = JSON.parse(options.body);
      return respostaJson({
        ...body,
        gcalStatus: 'pendente',
        googleCalendarEventId: null
      }, 201);
    }
    if (pathname === '/api/agendamentos/flush-gcal' && method === 'POST') {
      return respostaJson({
        ok: true,
        gcalSyncFailed: false,
        agendamentos: [
          {
            id: 'ag-novo-1',
            gcalStatus: 'sincronizado',
            googleCalendarEventId: 'evt-flush-criado-1'
          }
        ],
        deletedCount: 0
      }, 200);
    }
    if (pathname === '/api/reposicoes' && method === 'GET') return respostaJson([]);
    return respostaJson({});
  };

  const resultado = await window.salvarDados(false);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.motivo, 'sucesso');
  assert.ok(
    chamadas.includes('POST /api/agendamentos/flush-gcal'),
    `Esperava chamada ao flush-gcal, mas recebeu: ${chamadas.join(', ')}`
  );
  const idxPost = chamadas.indexOf('POST /api/agendamentos');
  const idxFlush = chamadas.indexOf('POST /api/agendamentos/flush-gcal');
  assert.ok(idxPost >= 0 && idxFlush > idxPost, 'flush-gcal deve ocorrer após POST /api/agendamentos');

  const aulasAtuais = JSON.parse(JSON.stringify(window.obterAulas()));
  assert.equal(aulasAtuais.length, 1);
  assert.equal(aulasAtuais[0].googleCalendarEventId, 'evt-flush-criado-1');
  assert.equal(aulasAtuais[0].gcalStatus, undefined);
  assert.ok(toasts.some((item) => item.tipo === 'success'));
});

test('T02-02: salvarDados dispara POST /agendamentos/flush-gcal após DELETE com queuedForGcalDelete e propaga gcalSyncFailed quando o Outbox falha no Google', async (t) => {
  const { window, toasts } = criarAmbienteStorage(t);
  window.atualizarAlunos([]);
  window.atualizarAulas([]);
  window.atualizarReposicoes([]);

  const chamadas = [];
  window.fetch = async (url, options = {}) => {
    const pathname = new URL(String(url)).pathname;
    const method = options.method || 'GET';
    chamadas.push(`${method} ${pathname}`);

    if (pathname === '/api/alunos' && method === 'GET') return respostaJson([]);
    if (pathname === '/api/configuracao/grade_horarios' && method === 'PUT') return respostaJson({ ok: true });
    if (pathname === '/api/agendamentos' && method === 'GET') {
      return respostaJson([
        {
          id: 'ag-remoto-del',
          data: '2026-10-28',
          horarioInicio: '10:00',
          horarioFim: '11:00',
          googleCalendarEventId: 'evt-del-outbox'
        }
      ]);
    }
    if (pathname === '/api/agendamentos/ag-remoto-del' && method === 'DELETE') {
      return respostaJson({
        deleted: true,
        id: 'ag-remoto-del',
        queuedForGcalDelete: true
      }, 200);
    }
    if (pathname === '/api/agendamentos/flush-gcal' && method === 'POST') {
      return respostaJson({
        ok: true,
        gcalSyncFailed: true,
        partialSuccess: true,
        agendamentos: [],
        deletedCount: 0
      }, 200);
    }
    if (pathname === '/api/reposicoes' && method === 'GET') return respostaJson([]);
    return respostaJson({});
  };

  const resultado = await window.salvarDados(false);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.motivo, 'sucesso_com_falha_gcal');
  assert.ok(chamadas.includes('DELETE /api/agendamentos/ag-remoto-del'));
  assert.ok(chamadas.includes('POST /api/agendamentos/flush-gcal'));
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0].tipo, 'warning');
  assert.match(toasts[0].msg, /Google Agenda/i);
});
