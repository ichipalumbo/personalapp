const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function carregarGoogleCalendarHarness(opcoes = {}) {
  const scriptPath = path.resolve(__dirname, '../../assets/js/google-calendar.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const store = new Map();
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
    document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} },
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
    },
    aulas: [],
    alunos: [],
    aulasParaRepor: [],
    window: null,
    googleIdentity: {
      isSignedIn: () => true,
      getOwnerEmail: () => 'teste@example.com',
      getIdToken: () => 'token-de-teste',
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
  context.addEventListener = () => {};
  const contextoPath = path.resolve(__dirname, '../../assets/js/app/contexto-dados.js');
  vm.runInNewContext(fs.readFileSync(contextoPath, 'utf8'), context, { filename: contextoPath });
  context.contextoDados.capturar();
  const salvar = opcoes.salvarDados || context.salvarDados;
  context.salvarDados = async (silencioso, opts) => {
    assert.ok(context.contextoDados.operacaoAtual(opts.operacao));
    assert.equal(opts.contextoDados, opts.operacao.contexto);
    const resultado = await salvar(silencioso, opts);
    context.contextoDados.registrarEtapa(opts.operacao, {
      url: 'https://api.example.com/agendamentos/fixture', method: 'PUT', confirmada: resultado.ok === true,
    });
    return resultado;
  };
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

  const operacao = context.contextoDados.iniciarOperacao({ tipo: 'excluir-aula-avulsa', intencao: { acao: 'excluir', agendamentoId: 'evt-1' } });
  const retorno = await context.window.salvarEventoComGCal({ id: 'evt-1' }, { operacao });
  assert.equal(operacao.finalizada, false, 'a ponte não finaliza a raiz do chamador');
  await context.contextoDados.finalizarOperacao(operacao);

  assert.deepEqual(retorno, { ok: true, motivo: 'sucesso' });
  assert.equal(inicializacoes, 1);
  assert.equal(operacao.etapas.length, 1);
  assert.equal(operacao.etapas[0].confirmada, true);
  assert.equal(context.contextoDados.obterPendencia(), null);
});

test('salvarEventoComGCal propaga falha de salvarDados sem chamar inicializarHome', async () => {
  let inicializacoes = 0;
  const context = carregarGoogleCalendarHarness({
    salvarDados: async () => ({ ok: false, motivo: 'falha_remota' }),
    inicializarHome: async () => {
      inicializacoes += 1;
    }
  });

  const operacao = context.contextoDados.iniciarOperacao({ tipo: 'excluir-aula-avulsa', intencao: { acao: 'excluir', agendamentoId: 'evt-2' } });
  const retorno = await context.window.salvarEventoComGCal({ id: 'evt-2' }, { operacao });
  await context.contextoDados.finalizarOperacao(operacao);

  assert.deepEqual(retorno, { ok: false, motivo: 'falha_remota' });
  assert.equal(inicializacoes, 0);
  assert.equal(operacao.falha, true);
  const pendencia = context.contextoDados.obterPendencia();
  assert.equal(pendencia.estado, 'desconhecida');
  assert.equal(pendencia.etapas.length, 1, 'a ponte não repete a escrita que falhou');
  assert.equal(pendencia.etapas[0].confirmada, false);
  assert.equal(pendencia.intencao.agendamentoId, 'evt-2');
});
