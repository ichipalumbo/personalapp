const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function carregarGoogleCalendarHarness(opcoes = {}) {
  const scriptPath = path.resolve(__dirname, '../../assets/js/google-calendar.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    String,
    Number,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    document: { getElementById: () => null },
    window: null,
    googleIdentity: {
      isSignedIn: () => true,
      ensureCalendarConnection: async () => ({ connected: true })
    },
    salvarDados: async () => ({ ok: true, motivo: 'sucesso' }),
    inicializarHome: async () => {},
    mostrarToast: () => {},
    apiFetchBackend: async () => ({ json: async () => ({}) }),
    APP_API_CONFIG: { apiBaseUrl: 'https://api.example.com' },
    log: {
      debug() {},
      info() {},
      warn() {},
      error() {}
    }
  };

  context.window = context;
  if (typeof opcoes.salvarDados === 'function') {
    context.salvarDados = opcoes.salvarDados;
  }
  if (typeof opcoes.inicializarHome === 'function') {
    context.inicializarHome = opcoes.inicializarHome;
  }

  vm.runInNewContext(script, context, { filename: scriptPath });
  return context;
}

test('salvarEventoComGCal propaga sucesso de salvarDados', async () => {
  let inicializacoes = 0;
  const context = carregarGoogleCalendarHarness({
    salvarDados: async () => ({ ok: true, motivo: 'sucesso' }),
    inicializarHome: async () => {
      inicializacoes += 1;
    }
  });

  const retorno = await context.window.salvarEventoComGCal({ id: 'evt-1' }, { operacao: 'excluir' });

  assert.deepEqual(retorno, { ok: true, motivo: 'sucesso' });
  assert.equal(inicializacoes, 1);
});

test('salvarEventoComGCal propaga falha de salvarDados sem chamar inicializarHome', async () => {
  let inicializacoes = 0;
  const context = carregarGoogleCalendarHarness({
    salvarDados: async () => ({ ok: false, motivo: 'falha_remota' }),
    inicializarHome: async () => {
      inicializacoes += 1;
    }
  });

  const retorno = await context.window.salvarEventoComGCal({ id: 'evt-2' }, { operacao: 'excluir' });

  assert.deepEqual(retorno, { ok: false, motivo: 'falha_remota' });
  assert.equal(inicializacoes, 0);
});
