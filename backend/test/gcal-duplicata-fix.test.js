const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');

const Agendamento = require('../src/models/Agendamento');
const { encryptRefreshToken } = require('../src/utils/gcalCrypto');
const GoogleCalendarConnection = require('../src/models/GoogleCalendarConnection');
const gcalSyncService = require('../src/services/gcalSyncService');

function criarRespostaJson(status, body) {
  const snapshot = body === undefined ? undefined : JSON.parse(JSON.stringify(body));

  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => snapshot,
    text: async () => (snapshot === undefined ? '' : JSON.stringify(snapshot)),
    clone() {
      return criarRespostaJson(status, snapshot);
    }
  };
}

function criarRespostaTexto(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new Error('Resposta sem JSON.');
    },
    text: async () => String(body || ''),
    clone() {
      return criarRespostaTexto(status, body);
    }
  };
}

function criarHarnessGoogleCalendar(opcoes = {}) {
  const originalFetch = global.fetch;
  const originalFindOne = GoogleCalendarConnection.findOne;
  const originalGetAccessToken = OAuth2Client.prototype.getAccessToken;
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const calls = [];

  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-gcal-key';
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';

  const token = encryptRefreshToken('token-refresh-de-teste');
  const connection = {
    _id: 'conn-gcal-1',
    ownerEmail: 'joao@example.com',
    googleEmail: 'joao@example.com',
    calendarId: 'primary',
    refreshTokenEncrypted: token.encrypted,
    refreshTokenIv: token.iv
  };

  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      method: options.method || 'GET',
      body: options.body ? JSON.parse(options.body) : null
    });

    if (typeof opcoes.fetchHandler === 'function') {
      return opcoes.fetchHandler(url, options, calls);
    }

    return criarRespostaJson(200, {});
  };

  GoogleCalendarConnection.findOne = async () => connection;
  OAuth2Client.prototype.getAccessToken = async () => 'stubbed-access-token';

  return {
    calls,
    restore() {
      global.fetch = originalFetch;
      GoogleCalendarConnection.findOne = originalFindOne;
      OAuth2Client.prototype.getAccessToken = originalGetAccessToken;
      if (originalEncryptionKey === undefined) {
        delete process.env.ENCRYPTION_KEY;
      } else {
        process.env.ENCRYPTION_KEY = originalEncryptionKey;
      }
      if (originalGoogleClientId === undefined) {
        delete process.env.GOOGLE_CLIENT_ID;
      } else {
        process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
      }
      if (originalGoogleClientSecret === undefined) {
        delete process.env.GOOGLE_CLIENT_SECRET;
      } else {
        process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
      }
    }
  };
}

function criarRespostaExpress() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    }
  };
}

function carregarStorageHarness() {
  const scriptPath = path.resolve(__dirname, '../../assets/js/storage.js');
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
    Headers,
    fetch: () => Promise.resolve(criarRespostaJson(200, {})),
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key)
    },
    document: {
      getElementById: () => null
    }
  };

  context.window = context;
  context.APP_API_CONFIG = {
    apiBaseUrl: 'https://api.example.com',
    apiRootUrl: 'https://api.example.com'
  };
  context.log = {
    info() {},
    warn() {},
    debug() {},
    error() {},
    grupo() {}
  };

  vm.runInNewContext(script, context, { filename: scriptPath });
  return context;
}

function criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr = '30/08/2026' } = {}) {
  const scriptPath = path.resolve(__dirname, '../../assets/js/modal-acao-slot.js');
  const script = fs.readFileSync(scriptPath, 'utf8');
  const elementos = {};

  const criarElemento = (id, extra = {}) => ({
    id,
    value: '',
    checked: false,
    innerHTML: '',
    textContent: '',
    style: { display: '', color: '', visibility: '' },
    dataset: {},
    listeners: {},
    classList: { toggle() {} },
    parentNode: null,
    querySelectorAll() { return []; },
    cloneNode() { return criarElemento(`${id}-clone`); },
    addEventListener(eventName, fn) {
      this.listeners[eventName] = fn;
    },
    ...extra
  });

  const formEditar = criarElemento('formEditarCompromisso');
  elementos.formEditarCompromisso = formEditar;
  elementos.editHoraInicio = criarElemento('editHoraInicio', { value: '09:00' });
  elementos.editDuracao = criarElemento('editDuracao', { value: '60' });
  elementos.editCompromissoFrequencia = criarElemento('editCompromissoFrequencia', { value: 'semanal' });
  elementos.editEscopoRecorrencia = criarElemento('editEscopoRecorrencia', { value: 'fromDate' });
  elementos.editEscopoRecorrenciaGrid = criarElemento('editEscopoRecorrenciaGrid');
  elementos.editEscopoRecorrenciaContainer = criarElemento('editEscopoRecorrenciaContainer');
  elementos.editDiaSemana = criarElemento('editDiaSemana', { value: 'Segunda' });
  elementos.editDiaSemanaContainer = criarElemento('editDiaSemanaContainer');
  elementos.editBloqueioDiaInteiro = criarElemento('editBloqueioDiaInteiro', { checked: false });
  elementos.editDescricao = criarElemento('editDescricao', { value: '' });
  elementos.editEscopoImpacto = criarElemento('editEscopoImpacto');
  elementos.editInfoDia = criarElemento('editInfoDia');
  elementos.editCamposTipoAula = criarElemento('editCamposTipoAula');
  elementos.editCamposTipoBloqueio = criarElemento('editCamposTipoBloqueio');
  elementos.editCamposTipoBloqueioDiaInteiro = criarElemento('editCamposTipoBloqueioDiaInteiro');
  elementos.editAluno = criarElemento('editAluno');
  elementos.modalAcaoSlot = criarElemento('modalAcaoSlot', { style: { display: 'flex' } });
  elementos.badgeTipoCompromisso = criarElemento('badgeTipoCompromisso');
  elementos.acoesCompromissoUnico = criarElemento('acoesCompromissoUnico');
  elementos.acoesCompromissoRecorrente = criarElemento('acoesCompromissoRecorrente');
  elementos.btnMandarParaReposicao = criarElemento('btnMandarParaReposicao');
  elementos.btnReagendarInstancia = criarElemento('btnReagendarInstancia');

  const document = {
    listeners: {},
    getElementById(id) {
      return elementos[id] || null;
    },
    querySelector(selector) {
      if (selector === '#formEditarCompromisso button[type="submit"]') {
        return { disabled: false, dataset: {}, style: { display: '' } };
      }
      if (selector === '#acoesCompromissoRecorrente > div') {
        return null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '#editEscopoRecorrenciaGrid .btn-escopo-recorrencia') {
        return [];
      }
      return [];
    },
    addEventListener(eventName, fn) {
      this.listeners[eventName] = fn;
    },
    removeEventListener(eventName, fn) {
      if (this.listeners[eventName] === fn) {
        delete this.listeners[eventName];
      }
    }
  };

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
    confirm: () => true,
    alert: () => {},
    fetch: async () => criarRespostaJson(200, {}),
    document,
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    },
    aulas: Array.isArray(aulas) ? aulas : [],
    alunos: [
      { id: 'aluno-1', nome: 'Aluno Teste' }
    ],
    aulasParaRepor: [],
    log: {
      info() {},
      warn() {},
      debug() {},
      error() {},
      grupo() {}
    },
    atualizaEstadoSubmitEdicao: () => {},
    atualizarEstadoSubmitEdicao: () => {},
    salvarDados: async () => {},
    mostrarToast: () => {},
    app: {},
    gcal: { isSignedIn: () => false },
    dataAlvoAcaoStr: dataAlvoStr,
    dataSelecionada: new Date('2026-08-30T12:00:00'),
    getDataSelecionadaPtBr: () => dataAlvoStr,
    converterPtBrParaISO: (valor) => {
      if (!valor || !valor.includes('/')) return valor;
      return valor.split('/').reverse().join('-');
    },
    formatarDataPtBrLegivel: (valor) => valor || '',
    parseDataFlex: (valor) => {
      if (!valor) return null;
      const iso = String(valor).includes('/') ? String(valor).split('/').reverse().join('-') : String(valor);
      const dt = new Date(`${iso}T12:00:00`);
      return Number.isNaN(dt.getTime()) ? null : dt;
    },
    getCompromissoSerializadoParaConflito: (compromissoBase) => ({ ...compromissoBase }),
    getDatasConflitoRecorrencia: () => [],
    getConflitosRecorrenciaEmDatas: () => [],
    gerarResumoConflitosDatas: () => '',
    getConflitosNoDia: () => [],
    somarMinutos: (inicio, minutos) => {
      const [hora, minuto] = String(inicio).split(':').map(Number);
      const total = hora * 60 + minuto + minutos;
      const novaHora = Math.floor(total / 60) % 24;
      const novoMinuto = total % 60;
      return `${String(novaHora).padStart(2, '0')}:${String(novoMinuto).padStart(2, '0')}`;
    },
    diferencaMinutos: (inicio, fim) => {
      const [hi, mi] = String(inicio).split(':').map(Number);
      const [hf, mf] = String(fim).split(':').map(Number);
      return (hf * 60 + mf) - (hi * 60 + mi);
    },
    aplicarLimitesDuracaoPorContexto: () => {},
    sincronizarSteppersDuracao: () => {},
    ehBloqueioDiaInteiroCompromisso: () => false,
    atualizarEstadoBloqueioDiaInteiroEdicao: () => {},
    getLabelEscopoRecorrencia: (escopo) => (escopo === 'occurrence' ? 'Somente esta aula' : escopo === 'entireSeries' ? 'Todas as aulas da série' : 'Daqui pra frente'),
    getResumoEscopoRecorrencia: () => 'Daqui pra frente',
    atualizarResumoEscopoRecorrencia: () => {},
    obterNomesDiasSemanaModalAcao: () => [
      'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
    ],
    fecharModalAcaoSlot: () => {},
    enriquecerAgendamentoComDadosFrescos: () => {},
    inicializarHome: async () => {},
    idCompromissoSelecionado: compromisso && compromisso.id,
    HORARIOS: Array.from({ length: 48 }, (_, index) => {
      const horas = Math.floor(index / 2);
      const minutos = index % 2 === 0 ? 0 : 30;
      return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
    }),
    DURACAO_MAX_AULA_DESLOCAMENTO: 120,
    BLOQUEIO_MAX_MINUTOS: 480,
    BLOQUEIO_DIA_INTEIRO_INICIO: '00:00',
    BLOQUEIO_DIA_INTEIRO_FIM: '23:59'
  };

  context.window = context;
  context.APP_API_CONFIG = {
    apiBaseUrl: 'https://api.example.com',
    apiRootUrl: 'https://api.example.com'
  };

  context.window.idCompromissoSelecionado = compromisso && compromisso.id ? compromisso.id : '';
  vm.runInNewContext(script, context, { filename: scriptPath });

  if (typeof document.listeners.DOMContentLoaded === 'function') {
    document.listeners.DOMContentLoaded();
  }

  if (typeof context.window.abrirModalAcaoSlot === 'function' && compromisso && compromisso.id) {
    context.window.abrirModalAcaoSlot(compromisso.id);
  }

  return { context, form: formEditar };
}

test('pushEventToGoogle usa id deterministico e trata 409 como sucesso idempotente', async () => {
  const agendamento = {
    id: 'ag-duplicata-1',
    data: '2026-08-29',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula'
  };
  const googleCalendarEventId = gcalSyncService.buildDeterministicGoogleEventId('joao@example.com', agendamento);
  let postCount = 0;
  const harness = criarHarnessGoogleCalendar({
    fetchHandler(_url, options) {
      if ((options.method || 'GET') === 'POST') {
        postCount += 1;
        if (postCount === 1) {
          return criarRespostaJson(200, { id: googleCalendarEventId });
        }
        return criarRespostaTexto(409, 'Conflict');
      }

      return criarRespostaJson(200, { id: googleCalendarEventId });
    }
  });

  try {
    const primeiro = await gcalSyncService.pushEventToGoogle('joao@example.com', agendamento);
    const segundo = await gcalSyncService.pushEventToGoogle('JOAO@example.com', agendamento);

    assert.equal(primeiro.googleCalendarEventId, googleCalendarEventId);
    assert.equal(segundo.googleCalendarEventId, googleCalendarEventId);

    const postCalls = harness.calls.filter((call) => call.method === 'POST');
    const getCalls = harness.calls.filter((call) => call.method === 'GET');
    assert.equal(postCalls.length, 2);
    assert.equal(getCalls.length, 1);
    assert.deepEqual([...new Set(postCalls.map((call) => call.body && call.body.id))], [googleCalendarEventId]);
  } finally {
    harness.restore();
  }
});

test('atualizarAgendamento com googleCalendarEventId existente usa updateEventInGoogle', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const calls = { push: 0, update: 0, updatesMongo: [] };

  try {
    delete require.cache[controllerPath];
    gcalSyncService.pushEventToGoogle = async () => {
      calls.push += 1;
      return { googleCalendarEventId: 'nao-deveria-ser-usado' };
    };
    gcalSyncService.updateEventInGoogle = async () => {
      calls.update += 1;
      return { googleCalendarEventId: 'evt-existente-1' };
    };
    Agendamento.findOne = () => ({
      lean: async () => ({
        id: 'ag-200',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-existente-1'
      })
    });
    Agendamento.findOneAndUpdate = async (query, update) => {
      calls.updatesMongo.push({ query, update });
      if (calls.updatesMongo.length === 1) {
        return {
          id: 'ag-200',
          data: '2026-08-29',
          horarioInicio: '09:00',
          horarioFim: '10:00',
          tipo: 'aula',
          googleCalendarEventId: 'evt-existente-1'
        };
      }
      return {
        id: 'ag-200',
        googleCalendarEventId: 'evt-existente-1'
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-200' },
      body: {
        id: 'ag-200',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(calls.update, 1);
    assert.equal(calls.push, 0);
    assert.equal(res.body.googleCalendarEventId, 'evt-existente-1');
  } finally {
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('criarAgendamento honra a projeção de googleCalendarEventId ao reusar evento existente', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;

  try {
    delete require.cache[controllerPath];
    gcalSyncService.pushEventToGoogle = async () => ({ googleCalendarEventId: 'evt-criar-projetado' });
    gcalSyncService.updateEventInGoogle = async () => ({ googleCalendarEventId: 'evt-criar-projetado' });
    let camposProjetados = null;
    Agendamento.findOne = () => ({
      select: (campos) => {
        camposProjetados = campos;
        return {
          lean: async () => ({ googleCalendarEventId: 'evt-criar-projetado' })
        };
      }
    });
    Agendamento.findOneAndUpdate = async (_query, update) => {
      assert.equal(update.$set.googleCalendarEventId, 'evt-criar-projetado');
      return { id: 'ag-criar-projetado', ...update.$set };
    };

    const { criarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await criarAgendamento({
      body: {
        id: 'ag-criar-projetado',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(camposProjetados, 'googleCalendarEventId');
    assert.equal(res.body.googleCalendarEventId, 'evt-criar-projetado');
  } finally {
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('montarRespostaFalhaGcal não vaza agendamentoAtual no escopo global', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  delete globalThis.agendamentoAtual;

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => {
      throw new Error('falha de teste do Google');
    };
    Agendamento.findOne = () => ({
      select: () => ({
        lean: async () => ({
          id: 'ag-global-1',
          ownerEmail: 'joao@example.com',
          googleCalendarEventId: 'evt-global-1',
          gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
          gcalSyncPendingTentativas: 3,
          data: '2026-08-29',
          horarioInicio: '09:00',
          horarioFim: '10:00',
          tipo: 'aula'
        })
      }),
      lean: async () => ({
        id: 'ag-global-1',
        ownerEmail: 'joao@example.com',
        googleCalendarEventId: 'evt-global-1',
        gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
        gcalSyncPendingTentativas: 3,
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      })
    });
    Agendamento.findOneAndUpdate = async (_query, update) => ({
      id: 'ag-global-1',
      googleCalendarEventId: 'evt-global-1',
      ...update.$set
    });

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-global-1' },
      body: {
        id: 'ag-global-1',
        data: '2026-08-29',
        horarioInicio: '15:00',
        horarioFim: '16:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(typeof globalThis.agendamentoAtual, 'undefined');
    assert.equal(res.body.gcalSyncFailed, true);
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete globalThis.agendamentoAtual;
    delete require.cache[controllerPath];
  }
});

test('atualizarAgendamento preserva o documento completo quando o item está em estado terminal e o mock honora o contrato do Mongoose', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  let selectChamado = false;

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => {
      throw new Error('não deve chamar o Google quando o item está em estado terminal');
    };
    Agendamento.findOne = () => ({
      select: (campos) => {
        selectChamado = true;
        assert.deepEqual(campos, ['gcalSyncPendingAt', 'gcalSyncPendingTentativas']);
        return {
          lean: async () => ({
            gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
            gcalSyncPendingTentativas: 5
          })
        };
      },
      lean: async () => ({
        id: 'ag-terminal-1',
        ownerEmail: 'joao@example.com',
        googleCalendarEventId: 'evt-terminal-1',
        gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
        gcalSyncPendingTentativas: 5,
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      })
    });
    Agendamento.findOneAndUpdate = async (_query, update) => {
      assert.equal(update.$set.gcalSyncPendingTentativas, 0);
      return {
        id: 'ag-terminal-1',
        googleCalendarEventId: 'evt-terminal-1',
        gcalSyncPendingTentativas: 0,
        data: '2026-08-29',
        horarioInicio: '15:00',
        horarioFim: '16:00',
        tipo: 'aula'
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-terminal-1' },
      body: {
        id: 'ag-terminal-1',
        data: '2026-08-29',
        horarioInicio: '15:00',
        horarioFim: '16:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(selectChamado, false);
    assert.equal(res.body.gcalSyncPausado, true);
    assert.equal(res.body.horarioInicio, '15:00');
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('pushEventToGoogle rejeita evento cancelado do Google como falha, nao como sucesso', async () => {
  const agendamento = {
    id: 'ag-cancelado-1',
    data: '2026-08-29',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula'
  };
  const googleCalendarEventId = gcalSyncService.buildDeterministicGoogleEventId('joao@example.com', agendamento);
  const harness = criarHarnessGoogleCalendar({
    fetchHandler(url, options) {
      if ((options.method || 'GET') === 'POST') {
        return criarRespostaTexto(409, 'Conflict');
      }
      if ((options.method || 'GET') === 'GET') {
        return criarRespostaJson(200, { id: googleCalendarEventId, status: 'cancelled' });
      }
      return criarRespostaJson(200, {});
    }
  });

  try {
    await assert.rejects(
      () => gcalSyncService.pushEventToGoogle('joao@example.com', agendamento),
      (error) => error && error.statusCode === 409
    );
  } finally {
    harness.restore();
  }
});

test('atualizarAgendamento grava marca de pendencia quando a chamada ao Google falha', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const updatesMongo = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => {
      const error = new Error('timeout no Google');
      error.statusCode = 504;
      throw error;
    };
    Agendamento.findOne = () => ({
      lean: async () => ({
        id: 'ag-serie-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-serie-1',
        excecoes: ['29/08/2026']
      })
    });
    Agendamento.findOneAndUpdate = async (query, update) => {
      updatesMongo.push({ query, update });
      return {
        id: 'ag-serie-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-serie-1',
        excecoes: ['29/08/2026']
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-serie-1' },
      body: {
        id: 'ag-serie-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        excecoes: ['29/08/2026']
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.gcalSyncFailed, true);
    assert.equal(typeof res.body.agendamento.gcalSyncPendingAt, 'string');
    assert.equal(updatesMongo.length, 2);
    assert.equal(typeof updatesMongo[1].update.$set.gcalSyncPendingAt, 'string');
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('atualizarAgendamento preserva 200 mesmo quando a persistencia da marca falha', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => {
      const error = new Error('timeout no Google');
      error.statusCode = 504;
      throw error;
    };
    Agendamento.findOne = () => ({
      lean: async () => ({ gcalSyncPendingTentativas: 2 })
    });
    Agendamento.findOneAndUpdate = async () => {
      const error = new Error('mongo falhou');
      error.statusCode = 500;
      throw error;
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-falha-persistencia-1' },
      body: {
        id: 'ag-falha-persistencia-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.gcalSyncFailed, true);
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const updatesMongo = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => ({
      googleCalendarEventId: 'evt-serie-1'
    });
    Agendamento.findOne = () => ({
      lean: async () => ({
        id: 'ag-serie-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-serie-1',
        gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
        gcalSyncPendingTentativas: 1
      })
    });
    Agendamento.findOneAndUpdate = async (query, update) => {
      updatesMongo.push({ query, update });
      if (updatesMongo.length === 1) {
        return {
          id: 'ag-serie-1',
          data: '2026-08-29',
          horarioInicio: '09:00',
          horarioFim: '10:00',
          tipo: 'aula',
          googleCalendarEventId: 'evt-serie-1',
          gcalSyncPendingAt: '2026-08-29T12:00:00.000Z'
        };
      }

      return {
        id: 'ag-serie-1',
        googleCalendarEventId: 'evt-serie-1'
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-serie-1' },
      body: {
        id: 'ag-serie-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(updatesMongo.length, 2);
    assert.deepEqual(updatesMongo[1].update.$unset, {
      gcalSyncPendingAt: 1,
      gcalSyncPendingTentativas: 1
    });
    assert.equal(res.body.gcalSyncPendingAt, undefined);
    assert.equal(res.body.gcalSyncPendingTentativas, undefined);
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const updatesMongo = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => ({
      googleCalendarEventId: 'evt-portao-1'
    });
    Agendamento.findOne = () => ({
      lean: async () => ({
        id: 'ag-portao-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-portao-1'
      })
    });
    Agendamento.findOneAndUpdate = async (_query, update) => {
      updatesMongo.push(update);
      const primeiroSet = update.$set || {};
      return {
        id: 'ag-portao-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-portao-1',
        ...(Object.prototype.hasOwnProperty.call(primeiroSet, 'campoNovoSync')
          ? { campoNovoSync: primeiroSet.campoNovoSync }
          : {})
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const primeiraResposta = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-portao-1' },
      body: {
        id: 'ag-portao-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        campoNovoSync: '2026-08-29T15:43:00.000Z',
        _id: 'mongo-id',
        __v: 7,
        ownerEmail: 'nao-deve-passsar@example.com'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, primeiraResposta);

    const segundaResposta = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-portao-1' },
      body: {
        id: 'ag-portao-1',
        data: '2026-08-29',
        horarioInicio: '10:00',
        horarioFim: '11:00',
        tipo: 'aula'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, segundaResposta);

    assert.equal(Agendamento.schema.options.strict, false);
    assert.equal(primeiraResposta.body.campoNovoSync, '2026-08-29T15:43:00.000Z');
    assert.equal(updatesMongo[0].$set.campoNovoSync, '2026-08-29T15:43:00.000Z');
    assert.equal(updatesMongo[0].$set._id, undefined);
    assert.equal(updatesMongo[0].$set.__v, undefined);
    assert.equal(updatesMongo[0].$set.ownerEmail, 'joao@example.com');
    assert.equal(Object.prototype.hasOwnProperty.call(updatesMongo[2].$set, 'campoNovoSync'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(updatesMongo[2], '$unset') && Object.prototype.hasOwnProperty.call(updatesMongo[2].$unset, 'campoNovoSync'), false);
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('storage remove gcalSyncPendingAt da carga remota para evitar deadlock no estado local', async () => {
  const context = carregarStorageHarness();
  const agendamentoRemoto = {
    id: 'ag-local-1',
    data: '2026-08-29',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
    gcalSyncPendingTentativas: 2
  };

  context.window.googleIdentity = {
    isSignedIn: () => true,
    getIdToken: () => 'token-test'
  };
  context.apiFetchBackend = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (method === 'GET' && url.endsWith('/alunos')) {
      return criarRespostaJson(200, []);
    }
    if (method === 'GET' && url.endsWith('/agendamentos')) {
      return criarRespostaJson(200, [agendamentoRemoto]);
    }
    if (method === 'GET' && url.includes('/configuracao')) {
      return criarRespostaJson(200, { horaInicio: '06:00', horaFim: '22:00' });
    }
    if (method === 'GET' && url.endsWith('/bloqueios-externos')) {
      return criarRespostaJson(200, []);
    }
    if (method === 'GET' && url.endsWith('/reposicoes')) {
      return criarRespostaJson(200, []);
    }
    if (method === 'PUT' && url.includes('/agendamentos/')) {
      return criarRespostaJson(200, { ...agendamentoRemoto });
    }
    return criarRespostaJson(200, {});
  };

  await context.carregarDados({ forcarRender: false, forcarRemoto: true, silenciosoUI: true });

  assert.equal(context.window.aulas[0].gcalSyncPendingAt, undefined);
  assert.equal(context.window.aulas[0].gcalSyncPendingTentativas, undefined);
  assert.equal(context.localStorage.getItem('personal_aulas').includes('gcalSyncPendingAt'), false);
});

test('storage mescla googleCalendarEventId local apos POST do agendamento', async () => {
  const context = carregarStorageHarness();
  const agendamentosLocais = [{
    id: 'ag-local-1',
    data: '2026-08-29',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    googleCalendarEventId: null
  }];

  context.apiFetchBackend = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (method === 'GET') {
      return criarRespostaJson(200, []);
    }

    return criarRespostaJson(200, {
      id: 'ag-local-1',
      googleCalendarEventId: 'evt-local-1'
    });
  };

  const resposta = await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);

  assert.equal(resposta.ok, true);
  assert.equal(agendamentosLocais[0].googleCalendarEventId, 'evt-local-1');
});

test('storage emite PUT para alteracao local mesmo quando a pendencia atinge o teto de tentativas', async () => {
  const context = carregarStorageHarness();
  const agendamentosLocais = [{
    id: 'ag-terminal-1',
    data: '2026-08-29',
    horarioInicio: '15:00',
    horarioFim: '16:00',
    tipo: 'aula',
    googleCalendarEventId: 'evt-terminal-1'
  }];
  let putCalls = 0;

  context.apiFetchBackend = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (method === 'GET') {
      return criarRespostaJson(200, [{
        id: 'ag-terminal-1',
        data: '2026-08-29',
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-terminal-1',
        gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
        gcalSyncPendingTentativas: 5
      }]);
    }

    if (method === 'PUT') {
      putCalls += 1;
      return criarRespostaJson(200, { ...agendamentosLocais[0] });
    }

    return criarRespostaJson(200, {});
  };

  await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);

  assert.equal(putCalls, 1);
});

test('atualizarAgendamento terminal grava no Mongo, reabre tentativas e nao chama o Google no mesmo PUT', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const updatesMongo = [];
  let chamadasGoogle = 0;

  try {
    delete require.cache[controllerPath];
    gcalSyncService.updateEventInGoogle = async () => {
      chamadasGoogle += 1;
      return { googleCalendarEventId: 'evt-terminal-1' };
    };
    Agendamento.findOne = async () => ({
      id: 'ag-terminal-1',
      ownerEmail: 'joao@example.com',
      data: '2026-08-29',
      horarioInicio: '09:00',
      horarioFim: '10:00',
      tipo: 'aula',
      googleCalendarEventId: 'evt-terminal-1',
      gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
      gcalSyncPendingTentativas: 5
    });
    Agendamento.findOneAndUpdate = async (query, update) => {
      updatesMongo.push({ query, update });
      return {
        id: 'ag-terminal-1',
        ownerEmail: 'joao@example.com',
        data: '2026-08-29',
        horarioInicio: '15:00',
        horarioFim: '16:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-terminal-1',
        gcalSyncPendingAt: '2026-08-29T12:00:00.000Z',
        gcalSyncPendingTentativas: update.$set.gcalSyncPendingTentativas
      };
    };

    const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await atualizarAgendamento({
      params: { id: 'ag-terminal-1' },
      body: {
        id: 'ag-terminal-1',
        data: '2026-08-29',
        horarioInicio: '15:00',
        horarioFim: '16:00',
        tipo: 'aula',
        googleCalendarEventId: 'evt-terminal-1'
      },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(updatesMongo.length, 1);
    assert.deepEqual(updatesMongo[0].query, {
      ownerEmail: 'joao@example.com',
      id: 'ag-terminal-1'
    });
    assert.equal(updatesMongo[0].update.$set.horarioInicio, '15:00');
    assert.equal(updatesMongo[0].update.$set.gcalSyncPendingTentativas, 0);
    assert.equal(res.body.horarioInicio, '15:00');
    assert.equal(res.body.gcalSyncPendingTentativas, 0);
    assert.equal(chamadasGoogle, 0);
  } finally {
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});

test('convergencia: apos limpar a pendencia, sync seguinte nao reemite PUT adicional', async () => {
  const context = carregarStorageHarness();
  const agendamentosLocais = [{
    id: 'ag-serie-1',
    data: '2026-08-29',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    googleCalendarEventId: 'evt-serie-1',
    excecoes: ['29/08/2026']
  }];
  let puts = 0;
  let estadoRemoto = [{
    ...agendamentosLocais[0],
    gcalSyncPendingAt: '2026-08-29T12:00:00.000Z'
  }];

  context.apiFetchBackend = async (url, options = {}) => {
    const method = options.method || 'GET';
    if (method === 'GET') {
      return criarRespostaJson(200, estadoRemoto);
    }

    if (method === 'PUT') {
      puts += 1;
      estadoRemoto = [{
        ...agendamentosLocais[0]
      }];
      return criarRespostaJson(200, estadoRemoto[0]);
    }

    throw new Error(`Operacao inesperada: ${method} ${url}`);
  };

  await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);
  await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);

  assert.equal(puts, 1);
});

test('cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie', async () => {
  const context = carregarStorageHarness();
  const serieLocal = {
    id: 'serie-1',
    data: '2026-08-22',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    googleCalendarEventId: 'evt-serie-1',
    excecoes: ['29/08/2026']
  };
  const novaOcorrenciaLocal = {
    id: 'serie-1-occ-1',
    data: '2026-08-29',
    horarioInicio: '11:00',
    horarioFim: '12:00',
    tipo: 'aula',
    googleCalendarEventId: null,
    excecoes: []
  };
  const agendamentosLocais = [serieLocal, novaOcorrenciaLocal];
  let seriePutCount = 0;
  let novaOcorrenciaPostCount = 0;
  let estadoRemoto = [{
    id: 'serie-1',
    data: '2026-08-22',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    googleCalendarEventId: 'evt-serie-1',
    excecoes: []
  }];

  context.apiFetchBackend = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (method === 'GET') {
      return criarRespostaJson(200, estadoRemoto);
    }

    if (method === 'PUT' && url.includes('/agendamentos/serie-1')) {
      seriePutCount += 1;
      if (seriePutCount === 1) {
        estadoRemoto = [{
          ...serieLocal,
          gcalSyncPendingAt: '2026-08-29T12:34:56.000Z'
        }];
        return criarRespostaJson(200, {
          gcalSyncFailed: true,
          agendamento: estadoRemoto[0]
        });
      }

      estadoRemoto = [
        { ...serieLocal },
        ...(estadoRemoto.filter((item) => item.id !== 'serie-1'))
      ];
      return criarRespostaJson(200, serieLocal);
    }

    if (method === 'POST' && url.endsWith('/agendamentos')) {
      novaOcorrenciaPostCount += 1;
      const novaOcorrenciaRemota = {
        ...novaOcorrenciaLocal,
        googleCalendarEventId: 'evt-occ-1'
      };
      estadoRemoto = [
        estadoRemoto.find((item) => item.id === 'serie-1') || { ...serieLocal },
        novaOcorrenciaRemota
      ];
      return criarRespostaJson(200, novaOcorrenciaRemota);
    }

    throw new Error(`Operacao inesperada: ${method} ${url}`);
  };

  const primeiraResposta = await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);
  const segundaResposta = await context._sincronizarAgendamentosViaCRUD(agendamentosLocais, 8000);

  assert.equal(primeiraResposta.gcalSyncFailed, true);
  assert.equal(segundaResposta.gcalSyncFailed, false);
  assert.equal(seriePutCount, 2);
  assert.equal(novaOcorrenciaPostCount, 1);
  assert.equal(novaOcorrenciaLocal.googleCalendarEventId, 'evt-occ-1');
});

test('split fromDate na primeira ocorrencia remove a serie vazia e cria a serie nova sem DELETE', async () => {
  const dataInicio = '30/08/2026';
  const compromisso = {
    id: 'serie-vazia-1',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda'],
    googleCalendarEventId: 'evt-vazia-1',
    excecoes: []
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataInicio });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE redundante nao deve disparar');
  };

  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 1);
  assert.notEqual(aulas[0].id, 'serie-vazia-1');
  assert.equal(aulas[0].recorrenciaEscopo, 'fromDate');
  assert.equal(aulas[0].data, dataInicio);
});

test('split fromDate no meio da serie preserva a serie original e cria a nova', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '08/09/2026';
  const compromisso = {
    id: 'serie-meio-1',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda'],
    googleCalendarEventId: 'evt-meio-1',
    excecoes: []
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split do meio');
  };

  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 2);
  const serieOriginal = aulas.find((item) => item.id === 'serie-meio-1');
  const serieNova = aulas.find((item) => item.id !== 'serie-meio-1');
  assert.ok(serieOriginal);
  assert.equal(serieOriginal.recorrenciaDataFim, '07/09/2026');
  assert.ok(serieNova);
  assert.equal(serieNova.recorrenciaEscopo, 'fromDate');
  assert.equal(serieNova.data, dataAlvo);
});

test('excluirAgendamento chama Google antes do Mongo e retorna sucesso quando o registro foi apagado', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndDelete = Agendamento.findOneAndDelete;
  const order = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.deleteEventFromGoogle = async (ownerEmail, googleCalendarEventId) => {
      order.push('google');
      assert.equal(ownerEmail, 'joao@example.com');
      assert.equal(googleCalendarEventId, 'evt-delete-ok');
      return { deleted: true };
    };
    Agendamento.findOne = async () => ({
      id: 'ag-delete-ok',
      ownerEmail: 'joao@example.com',
      googleCalendarEventId: 'evt-delete-ok'
    });
    Agendamento.findOneAndDelete = async () => {
      order.push('mongo');
      return { id: 'ag-delete-ok' };
    };

    const { excluirAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await excluirAgendamento({
      params: { id: 'ag-delete-ok' },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.deepEqual(order, ['google', 'mongo']);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deleted, true);
  } finally {
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndDelete = originalFindOneAndDelete;
    delete require.cache[controllerPath];
  }
});

test('excluirAgendamento trata 404/410 como sucesso e ainda remove do Mongo', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndDelete = Agendamento.findOneAndDelete;
  const order = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.deleteEventFromGoogle = async () => {
      order.push('google');
      const error = new Error('Evento ja inexistente');
      error.statusCode = 404;
      throw error;
    };
    Agendamento.findOne = async () => ({
      id: 'ag-delete-404',
      ownerEmail: 'joao@example.com',
      googleCalendarEventId: 'evt-delete-404'
    });
    Agendamento.findOneAndDelete = async () => {
      order.push('mongo');
      return { id: 'ag-delete-404' };
    };

    const { excluirAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await excluirAgendamento({
      params: { id: 'ag-delete-404' },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.deepEqual(order, ['google', 'mongo']);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deleted, true);
  } finally {
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndDelete = originalFindOneAndDelete;
    delete require.cache[controllerPath];
  }
});

test('excluirAgendamento não apaga o Mongo quando o Google falha com 500 e grava pendencia', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalFindOne = Agendamento.findOne;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const order = [];

  try {
    delete require.cache[controllerPath];
    gcalSyncService.deleteEventFromGoogle = async () => {
      order.push('google');
      const error = new Error('erro de rede batida');
      error.statusCode = 500;
      throw error;
    };
    Agendamento.findOne = async () => ({
      id: 'ag-delete-500',
      ownerEmail: 'joao@example.com',
      googleCalendarEventId: 'evt-delete-500'
    });
    Agendamento.findOneAndUpdate = async (query, update) => {
      order.push('pendencia');
      return { id: 'ag-delete-500', ...update.$set };
    };
    Agendamento.findOneAndDelete = async () => {
      order.push('mongo');
      return { id: 'ag-delete-500' };
    };

    const { excluirAgendamento } = require('../src/controllers/agendamentoController');
    const res = criarRespostaExpress();
    await excluirAgendamento({
      params: { id: 'ag-delete-500' },
      auth: { ownerEmail: 'joao@example.com' }
    }, res);

    assert.deepEqual(order, ['google', 'pendencia']);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.gcalSyncFailed, true);
    assert.equal(res.body.agendamento.gcalSyncPendingTentativas, 1);
  } finally {
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    Agendamento.findOne = originalFindOne;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
    delete require.cache[controllerPath];
  }
});
