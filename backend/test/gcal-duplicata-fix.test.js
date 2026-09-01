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
  elementos.formReagendarAula = criarElemento('formReagendarAula');
  elementos.reagendarDia = criarElemento('reagendarDia', { value: 'Segunda' });
  elementos.reagendarHoraInicio = criarElemento('reagendarHoraInicio', { value: '09:00' });
  elementos.reagendarDuracao = criarElemento('reagendarDuracao', { value: '60' });
  elementos.reagendarAluno = criarElemento('reagendarAluno');
  elementos.containerSeletorReagendarAluno = criarElemento('containerSeletorReagendarAluno');
  elementos.containerLockReagendarAluno = criarElemento('containerLockReagendarAluno');
  elementos.modalReagendarAula = criarElemento('modalReagendarAula');
  elementos.reagendarAlunoLockedNome = criarElemento('reagendarAlunoLockedNome');
  elementos.reagendarAlunoIdLocked = criarElemento('reagendarAlunoIdLocked');
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
  elementos.modalEscolhaCobrancaReposicao = criarElemento('modalEscolhaCobrancaReposicao', {
    style: { display: 'flex' },
    querySelectorAll() { return []; },
  });
  elementos.reposicaoEscolhaAluno = criarElemento('reposicaoEscolhaAluno');
  elementos.reposicaoEscolhaDataHorario = criarElemento('reposicaoEscolhaDataHorario');

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
    normalizarDataParaISO: (valor) => {
      if (!valor) return '';
      if (valor instanceof Date) {
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
      }
      const texto = String(valor).trim();
      const semHora = texto.split('T')[0];
      if (semHora.includes('/')) return semHora.split('/').reverse().join('-');
      if (semHora.includes('-')) return semHora;
      return texto;
    },
    converterPtBrParaISO: (valor) => {
      if (!valor || !valor.includes('/')) return valor;
      return valor.split('/').reverse().join('-');
    },
    formatarDataLocalParaISODate: (valor) => {
      if (!valor) return '';
      if (valor instanceof Date) {
        return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
      }
      if (typeof valor === 'string' && valor.includes('/')) {
        return valor.split('/').reverse().join('-');
      }
      return valor;
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
    getConflitosRecorrenciaEmDatas: (candidato, datas, opcoes = {}) => {
      context.chamadasConflito = Array.isArray(context.chamadasConflito) ? context.chamadasConflito : [];
      context.chamadasConflito.push({
        fn: 'getConflitosRecorrenciaEmDatas',
        ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
      });
      return [];
    },
    gerarResumoConflitosDatas: () => '',
    getConflitosNoDia: (candidato, dataAlvo, opcoes = {}) => {
      context.chamadasConflito = Array.isArray(context.chamadasConflito) ? context.chamadasConflito : [];
      context.chamadasConflito.push({
        fn: 'getConflitosNoDia',
        ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
      });
      return [];
    },
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

  const recurrenceHelpersPath = path.resolve(__dirname, '../../assets/js/shared/recurrence-helpers.js');
  const recurrenceHelpersScript = fs.readFileSync(recurrenceHelpersPath, 'utf8');
  vm.runInNewContext(recurrenceHelpersScript, context, { filename: recurrenceHelpersPath });

  const calendarioEnginePath = path.resolve(__dirname, '../../assets/js/calendario-engine.js');
  const calendarioEngineScript = fs.readFileSync(calendarioEnginePath, 'utf8');
  vm.runInNewContext(calendarioEngineScript, context, { filename: calendarioEnginePath });

  context.window.idCompromissoSelecionado = compromisso && compromisso.id ? compromisso.id : '';
  context.chamadasConflito = [];
  context.window.chamadasConflito = context.chamadasConflito;
  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosNoDia',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };
  vm.runInNewContext(script, context, { filename: scriptPath });

  if (typeof document.listeners.DOMContentLoaded === 'function') {
    document.listeners.DOMContentLoaded();
  }

  if (typeof context.window.abrirModalAcaoSlot === 'function' && compromisso && compromisso.id) {
    context.window.abrirModalAcaoSlot(compromisso.id);
  }

  return { context, form: formEditar };
}

function criarFamiliaContinuaBase(overrides = {}) {
  const serieMae = {
    id: 'serie-mae',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    dataCriacao: '30/08/2026',
    recorrenciaEscopo: 'fromDate',
    recorrenciaDataInicio: '31/08/2026',
    ...overrides
  };

  const serieFilha = {
    ...serieMae,
    id: 'serie-filha',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'serie-mae',
  };

  const avulsa = {
    ...serieMae,
    id: 'avulsa-1',
    frequencia: 'uma_vez',
    data: '31/08/2026',
    serieOrigemId: 'serie-mae',
  };

  return { serieMae, serieFilha, avulsa, aulas: [serieMae, serieFilha, avulsa] };
}

function assertIgnorarIdsRecebidos(context, idsEsperados) {
  const ultimaChamada = context.chamadasConflito[context.chamadasConflito.length - 1];
  assert.ok(ultimaChamada, 'não houve chamada ao conflict detector');
  const ignorarIds = Array.isArray(ultimaChamada.ignorarIds)
    ? [...ultimaChamada.ignorarIds].sort()
    : [];
  const esperados = [...new Set(idsEsperados)].sort();
  assert.deepEqual(ignorarIds, esperados);
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

test('split fromDate migra exceções posteriores ou iguais ao corte para a serie nova', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-excecoes-1',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-excecoes-1',
    excecoes: ['31/08/2026', '07/09/2026', '02/09/2026'],
    excecoesDetalhadas: [{ data: '31/08/2026', horarioInicio: '09:00' }, { data: '07/09/2026', horarioInicio: '09:00' }, { data: '02/09/2026', horarioInicio: '09:00' }],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split de excecoes');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-excecoes-1');
  assert.ok(serieNova);
  assert.deepEqual(serieNova.excecoes, ['07/09/2026', '02/09/2026']);
  assert.deepEqual(serieNova.excecoesDetalhadas.map((item) => item.data), ['07/09/2026', '02/09/2026']);
  assert.equal(serieNova.excecoesDetalhadas[0].horarioInicio, '09:00');
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-07T12:00:00'), '09:00'), false);
});

test('split fromDate nao migra exceção antes do corte para a serie nova', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-excecoes-antes',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-excecoes-antes',
    excecoes: ['31/08/2026', '07/09/2026'],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split de excecoes anteriores');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-excecoes-antes');
  assert.ok(serieNova);
  assert.deepEqual(serieNova.excecoes, ['07/09/2026']);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-08-31T12:00:00'), '09:00'), false);
});

test('split fromDate mantém a serie nova sem duplicacao quando existe avulsa no mesmo dia do cancelamento', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '02/09/2026';
  const serieOriginal = {
    id: 'serie-duplicacao-1',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-duplicacao-1',
    excecoes: ['07/09/2026'],
  };
  const avulsa = {
    id: 'avulsa-duplicacao-1',
    tipo: 'aula',
    data: '07/09/2026',
    dia: 'Quarta',
    horarioInicio: '11:00',
    horarioFim: '12:00',
    frequencia: 'uma_vez',
    googleCalendarEventId: null,
    serieOrigemId: 'serie-duplicacao-1',
    excecoes: [],
    excecoesDetalhadas: [],
  };
  const aulas = [serieOriginal, avulsa];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieOriginal, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split com duplicacao');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-duplicacao-1' && item.id !== 'avulsa-duplicacao-1');
  assert.ok(serieNova);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-07T12:00:00'), '09:00'), false);
  assert.ok(aulas.some((item) => item.id === 'avulsa-duplicacao-1'));
});

test('split fromDate preserva objetos em excecoesDetalhadas sem converter para string', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-excecoes-detalhadas',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-excecoes-detalhadas',
    excecoes: ['02/09/2026', '07/09/2026'],
    excecoesDetalhadas: [{ data: '02/09/2026', horarioInicio: '09:00', horario: '09:00' }, { data: '07/09/2026', horarioInicio: '13:00' }],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar para excecoesDetalhadas');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-excecoes-detalhadas');
  assert.ok(serieNova);
  assert.equal(typeof serieNova.excecoesDetalhadas[0], 'object');
  assert.equal(serieNova.excecoesDetalhadas[0].horarioInicio, '09:00');
  assert.equal(serieNova.excecoesDetalhadas[1].horarioInicio, '13:00');
});

test('split fromDate em serie original vazia preserva excecoes na nova serie', async () => {
  const dataInicio = '02/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-vazia-excecoes',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-vazia-excecoes',
    excecoes: ['07/09/2026'],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar na serie original vazia');
  };

  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 1);
  const serieNova = aulas[0];
  assert.ok(serieNova);
  assert.equal(serieNova.id !== 'serie-vazia-excecoes', true);
  assert.deepEqual(serieNova.excecoes, ['07/09/2026']);
});

test('split fromDate herda o fim da mãe quando a mãe já foi aparada por um split anterior', async () => {
  const diaInicio = '31/08/2026';
  const dataAlvo = '07/09/2026';
  const compromisso = {
    id: 'serie-mae-aparada',
    tipo: 'aula',
    data: diaInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: diaInicio,
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '08/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-mae-aparada',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split com serie aparada');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-mae-aparada');
  assert.ok(serieNova);
  assert.equal(serieNova.recorrenciaFimCondicao, 'untilDate');
  assert.equal(serieNova.recorrenciaDataFim, '08/09/2026');
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-08T12:00:00'), '09:00'), true);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-14T12:00:00'), '09:00'), false);
});

test('split fromDate em serie infinita continua gerando filha infinita', async () => {
  const diaInicio = '31/08/2026';
  const dataAlvo = '07/09/2026';
  const compromisso = {
    id: 'serie-infinita',
    tipo: 'aula',
    data: diaInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: diaInicio,
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-serie-infinita',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split de serie infinita');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-infinita');
  assert.ok(serieNova);
  assert.equal(serieNova.recorrenciaFimCondicao, undefined);
  assert.equal(serieNova.recorrenciaDataFim, undefined);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-14T12:00:00'), '09:00'), true);
});

test('split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias', async () => {
  const diaInicio = '31/08/2026';
  const dataAlvo = '07/09/2026';
  const compromisso = {
    id: 'serie-por-ocorrencias',
    tipo: 'aula',
    data: diaInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: diaInicio,
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 6,
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-serie-por-ocorrencias',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar no split com fim por ocorrencias');
  };

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-por-ocorrencias');
  assert.ok(serieNova);
  assert.equal(serieNova.recorrenciaFimCondicao, 'untilDate');
  assert.equal(serieNova.recorrenciaDataFim, '09/09/2026');
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-09T12:00:00'), '09:00'), true);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-14T12:00:00'), '09:00'), false);
});

test('split fromDate na primeira ocorrencia herda o fim original da mae quando o corte fica antes do termino', async () => {
  const dataInicio = '02/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-mesma-primeira-ocorrencia',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '08/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-primeira-ocorrencia',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar quando a serie mae fica vazia mas a filha herda o fim original');
  };

  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 1);
  const serieNova = aulas[0];
  assert.ok(serieNova);
  assert.equal(serieNova.id !== 'serie-mesma-primeira-ocorrencia', true);
  assert.equal(serieNova.recorrenciaFimCondicao, 'untilDate');
  assert.equal(serieNova.recorrenciaDataFim, '08/09/2026');
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-07T12:00:00'), '09:00'), true);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-14T12:00:00'), '09:00'), false);
});

test('split fromDate remove a serie original quando o corte em segunda-feira nao deixa ocorrencia restante', async () => {
  const dataInicio = '30/08/2026';
  const dataAlvo = '31/08/2026';
  const compromisso = {
    id: 'serie-vazia-segunda',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Domingo',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: dataInicio,
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-vazia-segunda',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  context.window.apiFetchBackend = async () => {
    throw new Error('DELETE nao deve disparar para remover serie vazia em segunda');
  };

  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 1);
  const serieNova = aulas[0];
  assert.ok(serieNova);
  assert.equal(serieNova.id !== 'serie-vazia-segunda', true);
  assert.equal(context.window.checarCompromissoNaData(serieNova, new Date('2026-09-07T12:00:00'), '09:00'), true);
});

test('split fromDate preserva a serie original quando a semana ainda tem ocorrencia valida apos o corte', async () => {
  const dataInicio = '31/08/2026';
  const dataAlvo = '01/09/2026';
  const compromisso = {
    id: 'serie-com-ocorrencia-na-semana',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '07/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-com-ocorrencia-na-semana',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 2);
  const serieOriginal = aulas.find((item) => item.id === 'serie-com-ocorrencia-na-semana');
  assert.ok(serieOriginal);
  assert.equal(serieOriginal.recorrenciaDataFim, '31/08/2026');
});

test('split fromDate preserva a serie original quando sobra exatamente uma ocorrencia valida', async () => {
  const dataInicio = '01/09/2026';
  const dataAlvo = '02/09/2026';
  const compromisso = {
    id: 'serie-com-uma-ocorrencia',
    tipo: 'aula',
    data: dataInicio,
    dia: 'Terça',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: dataInicio,
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '02/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-com-uma-ocorrencia',
    excecoes: [],
  };
  const aulas = [compromisso];
  const { form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr: dataAlvo });
  await form.listeners.submit({ preventDefault() {} });

  assert.equal(aulas.length, 2);
  const serieOriginal = aulas.find((item) => item.id === 'serie-com-uma-ocorrencia');
  assert.ok(serieOriginal);
  assert.equal(serieOriginal.recorrenciaDataFim, '01/09/2026');
});

test('avulsa criada por occurrence continua com excecoes vazias mesmo quando a serie tem excecao futura', async () => {
  const serieMae = {
    id: 'serie-mae-excecao',
    tipo: 'aula',
    data: '01/09/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'semanal',
    recorrenciaDataInicio: '01/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    excecoes: ['07/09/2026'],
    googleCalendarEventId: 'evt-mae-excecao',
  };
  const aulas = [serieMae];
  const { form, context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '07/09/2026' });
  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '11:00';
  context.document.getElementById('editDuracao').value = '60';

  await form.listeners.submit({ preventDefault() {} });

  const avulsa = aulas.find((item) => item.id !== 'serie-mae-excecao');
  assert.ok(avulsa);
  assert.equal(Array.isArray(avulsa.excecoes), true);
  assert.equal(avulsa.excecoes.length, 0);
  assert.equal(Array.isArray(avulsa.excecoesDetalhadas), true);
  assert.equal(avulsa.excecoesDetalhadas.length, 0);
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

test('aparaCadeiaSerieAPartirDe em modo simulacao nao altera o array', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 6,
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    serieOrigemId: null,
    googleCalendarEventId: 'evt-s0'
  };
  const serieFilha = {
    id: 'S1',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '02/09/2026',
    dia: 'Terça',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '02/09/2026',
    recorrenciaDataFim: '30/09/2026',
    serieOrigemId: 'S0',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s1'
  };
  const serieDescendente = {
    id: 'S3',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '05/09/2026',
    dia: 'Sexta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '05/09/2026',
    recorrenciaDataFim: '30/09/2026',
    serieOrigemId: 'S1',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s3'
  };
  const avulsa = {
    id: 'A1',
    tipo: 'aula',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    dia: 'Quarta',
    horarioInicio: '11:00',
    horarioFim: '12:00',
    serieOrigemId: 'S0',
    googleCalendarEventId: null
  };
  const reposicao = {
    id: 'REP',
    tipo: 'aula',
    frequencia: 'uma_vez',
    isReposicao: true,
    data: '09/09/2026',
    dia: 'Quinta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    serieOrigemId: 'S0',
    googleCalendarEventId: 'evt-rep'
  };
  const aulas = [serieMae, serieFilha, serieDescendente, avulsa, reposicao];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '07/09/2026' });

  const antes = {
    length: aulas.length,
    serieFilhaFim: serieFilha.recorrenciaDataFim,
    serieDescendenteFim: serieDescendente.recorrenciaDataFim,
    temA1: aulas.some((item) => item.id === 'A1')
  };

  context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026', { simular: true });

  assert.equal(aulas.length, antes.length);
  assert.equal(serieFilha.recorrenciaDataFim, antes.serieFilhaFim);
  assert.equal(serieDescendente.recorrenciaDataFim, antes.serieDescendenteFim);
  assert.equal(aulas.some((item) => item.id === 'A1'), antes.temA1);
});

test('simulacao devolve os mesmos numeros da execucao real', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 6,
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s0'
  };
  const serieFilha = {
    id: 'S1',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '02/09/2026',
    dia: 'Terça',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '02/09/2026',
    recorrenciaDataFim: '30/09/2026',
    serieOrigemId: 'S0',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s1'
  };
  const serieDescendente = {
    id: 'S3',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '05/09/2026',
    dia: 'Sexta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '05/09/2026',
    recorrenciaDataFim: '30/09/2026',
    serieOrigemId: 'S1',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s3'
  };
  const avulsa = {
    id: 'A1',
    tipo: 'aula',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    dia: 'Quarta',
    horarioInicio: '11:00',
    horarioFim: '12:00',
    serieOrigemId: 'S0',
    googleCalendarEventId: null
  };
  const reposicao = {
    id: 'REP',
    tipo: 'aula',
    frequencia: 'uma_vez',
    isReposicao: true,
    data: '09/09/2026',
    dia: 'Quinta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    serieOrigemId: 'S0',
    googleCalendarEventId: 'evt-rep'
  };
  const aulasSim = [serieMae, serieFilha, serieDescendente, avulsa, reposicao];
  const aulasReal = JSON.parse(JSON.stringify(aulasSim));

  const { context: contextSim } = criarHarnessModalAcaoSlot({ aulas: aulasSim, compromisso: serieFilha, dataAlvoStr: '07/09/2026' });
  const { context: contextReal } = criarHarnessModalAcaoSlot({ aulas: aulasReal, compromisso: aulasReal[1], dataAlvoStr: '07/09/2026' });

  const resultadoSim = contextSim.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026', { simular: true });
  const resultadoReal = contextReal.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultadoSim.aparadas, resultadoReal.aparadas);
  assert.equal(resultadoSim.removidas, resultadoReal.removidas);
  assert.equal(resultadoSim.reposicoesPreservadas, resultadoReal.reposicoesPreservadas);
});

test('montarOpcoesExclusaoSlot devolve tres opcoes para serie', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s0'
  };
  const serieFilha = {
    id: 'S1',
    tipo: 'aula',
    frequencia: 'semanal',
    data: '02/09/2026',
    dia: 'Terça',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '02/09/2026',
    recorrenciaDataFim: '30/09/2026',
    serieOrigemId: 'S0',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    googleCalendarEventId: 'evt-s1'
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, serieFilha], compromisso: serieFilha, dataAlvoStr: '07/09/2026' });
  const resumo = context.window.montarResumoExclusaoCadeiaSerie(serieFilha);
  const opcoes = context.window.montarOpcoesExclusaoSlot(serieFilha, '07/09/2026');

  assert.equal(opcoes.length, 3);
  assert.deepEqual(Array.from(opcoes.map((item) => item.acao)), ['instancia', 'daqui', 'serie']);
  assert.match(opcoes[2].detalhe, new RegExp(String(resumo.total)));
});

test('montarOpcoesExclusaoSlot devolve uma opcao para avulsa', () => {
  const avulsa = {
    id: 'A1',
    tipo: 'aula',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    dia: 'Quarta',
    horarioInicio: '11:00',
    horarioFim: '12:00',
    googleCalendarEventId: null
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [avulsa], compromisso: avulsa, dataAlvoStr: '08/09/2026' });
  const opcoes = context.window.montarOpcoesExclusaoSlot(avulsa, '08/09/2026');

  assert.equal(opcoes.length, 1);
  assert.equal(opcoes[0].acao, 'instancia');
});

function criarSerieFamiliaBase(overrides = {}) {
  return {
    id: 'serie-mae',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    dataCriacao: '30/08/2026',
    recorrenciaEscopo: 'fromDate',
    recorrenciaDataInicio: '31/08/2026',
    ...overrides
  };
}

test('modal atualiza aviso de conflito em occurrence com família em ignorarIds', () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosNoDia',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  context.window.atualizarAvisoConflitoEdicao();
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('modal atualiza aviso de conflito em recorrente com família em ignorarIds', () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getDatasConflitoRecorrencia = () => ['2026-09-02'];
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'fromDate';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  context.window.atualizarAvisoConflitoEdicao();
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('submit occurrence propaga família em ignorarIds', async () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosNoDia',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editCompromissoFrequencia').value = 'semanal';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  await form.listeners.submit({ preventDefault() {} });
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('submit entireSeries propaga família em ignorarIds', async () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getDatasConflitoRecorrencia = () => ['2026-09-02'];
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'entireSeries';
  context.document.getElementById('editCompromissoFrequencia').value = 'semanal';
  context.document.getElementById('editHoraInicio').value = '09:30';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  await form.listeners.submit({ preventDefault() {} });
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('submit fromDate propaga família em ignorarIds', async () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getDatasConflitoRecorrencia = () => ['2026-09-02'];
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'fromDate';
  context.document.getElementById('editCompromissoFrequencia').value = 'semanal';
  context.document.getElementById('editHoraInicio').value = '09:45';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  await form.listeners.submit({ preventDefault() {} });
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('submit monthOfDate propaga família em ignorarIds', async () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getDatasConflitoRecorrencia = () => ['2026-09-02'];
  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosRecorrenciaEmDatas',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'monthOfDate';
  context.document.getElementById('editCompromissoFrequencia').value = 'semanal';
  context.document.getElementById('editHoraInicio').value = '10:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  await form.listeners.submit({ preventDefault() {} });
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('submit de frequência uma_vez propaga família em ignorarIds', async () => {
  const { serieMae, serieFilha, avulsa, aulas } = criarFamiliaContinuaBase();
  const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.chamadasConflito = [];
  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
    context.chamadasConflito.push({
      fn: 'getConflitosNoDia',
      ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
    });
    return [];
  };

  context.document.getElementById('editEscopoRecorrencia').value = 'fromDate';
  context.document.getElementById('editCompromissoFrequencia').value = 'uma_vez';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  await form.listeners.submit({ preventDefault() {} });
  assertIgnorarIdsRecebidos(context, [serieMae.id, serieFilha.id, avulsa.id]);
});

test('avulsa criada por occurrence guarda a série mãe direta em serieOrigemId', async () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const aulas = [serieMae];
  const { form, context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';

  await form.listeners.submit({ preventDefault() {} });

  const avulsa = aulas.find((item) => item.id !== 'serie-mae');
  assert.ok(avulsa);
  assert.equal(avulsa.frequencia, 'uma_vez');
  assert.equal(avulsa.serieOrigemId, 'serie-mae');
});

test('avulsa criada por occurrence nao herda campos de recorrencia', async () => {
  const serieMae = criarSerieFamiliaBase({
    id: 'serie-mae-limpa-recorrencia',
    tipoRecorrencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    intervaloRecorrencia: 2,
    recorrenciaEscopo: 'entireSeries',
    recorrenciaDataInicio: '01/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaQuantidadeOcorrencias: 8,
  });
  const aulas = [serieMae];
  const { form, context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';

  await form.listeners.submit({ preventDefault() {} });

  const avulsa = aulas.find((item) => item.id !== 'serie-mae-limpa-recorrencia');
  assert.ok(avulsa);
  for (const campo of [
    'tipoRecorrencia',
    'diasSemana',
    'intervaloRecorrencia',
    'recorrenciaEscopo',
    'recorrenciaDataInicio',
    'recorrenciaFimCondicao',
    'recorrenciaDataFim',
    'recorrenciaQuantidadeOcorrencias',
  ]) {
    assert.strictEqual(Object.hasOwn(avulsa, campo), false, `campo ${campo} nao deveria existir na avulsa`);
  }
  assert.equal(avulsa.frequencia, 'uma_vez');
  assert.equal(avulsa.data, '31/08/2026');
  assert.equal(avulsa.dia, 'Segunda');
  assert.equal(avulsa.horarioInicio, '09:00');
  assert.equal(avulsa.horarioFim, '10:00');
  assert.equal(avulsa.serieOrigemId, 'serie-mae-limpa-recorrencia');
});

test('split fromDate mantém tipoRecorrencia e diasSemana na serie nova', async () => {
  const serieMae = criarSerieFamiliaBase({
    id: 'serie-split-recorrencia',
    data: '01/09/2026',
    tipoRecorrencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    intervaloRecorrencia: 1,
    recorrenciaDataInicio: '01/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  });
  const aulas = [serieMae];
  const { form, context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '02/09/2026' });
  context.document.getElementById('editEscopoRecorrencia').value = 'fromDate';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';

  await form.listeners.submit({ preventDefault() {} });

  const serieNova = aulas.find((item) => item.id !== 'serie-split-recorrencia');
  assert.ok(serieNova);
  assert.equal(serieNova.tipoRecorrencia, 'semanal');
  assert.deepEqual(serieNova.diasSemana, ['Segunda', 'Terça', 'Quarta']);
  assert.equal(serieNova.recorrenciaDataInicio, '02/09/2026');
});

test('reagendar reposicao cria avulsa sem campos de recorrencia herdados', async () => {
  const rep = {
    id: 'rep-1',
    alunoId: 'aluno-1',
    dataCancelamento: '01/09/2026',
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [], compromisso: null, dataAlvoStr: '31/08/2026' });
  context.window.aulasParaRepor = [rep];
  context.window.reagendamentoDirectCardId = rep.id;
  context.document.getElementById('reagendarDia').value = 'Segunda';
  context.document.getElementById('reagendarHoraInicio').value = '09:00';
  context.document.getElementById('reagendarDuracao').value = '60';
  context.window.apiFetchBackend = async () => ({ ok: true, json: async () => ({}) });

  await context.document.getElementById('formReagendarAula').listeners.submit({ preventDefault() {} });

  const novaAula = context.window.aulas.find((item) => item.id.startsWith('ag-'));
  assert.ok(novaAula);
  assert.equal(novaAula.frequencia, 'uma_vez');
  assert.equal(novaAula.isReposicao, true);
  for (const campo of [
    'tipoRecorrencia',
    'diasSemana',
    'intervaloRecorrencia',
    'recorrenciaEscopo',
    'recorrenciaDataInicio',
    'recorrenciaFimCondicao',
    'recorrenciaDataFim',
    'recorrenciaQuantidadeOcorrencias',
  ]) {
    assert.strictEqual(Object.hasOwn(novaAula, campo), false, `campo ${campo} nao deveria existir na reposicao reagendada`);
  }
});

test('split encadeado mantém a mãe direta em serieOrigemId da avulsa', async () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const serieFilha = criarSerieFamiliaBase({ id: 'serie-filha', serieOrigemId: 'serie-mae' });
  const aulas = [serieMae, serieFilha];
  const { form, context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';

  await form.listeners.submit({ preventDefault() {} });

  const avulsa = aulas.find((item) => item.id !== 'serie-mae' && item.id !== 'serie-filha');
  assert.ok(avulsa);
  assert.equal(avulsa.frequencia, 'uma_vez');
  assert.equal(avulsa.serieOrigemId, 'serie-filha');
});

test('resolverFamiliaSerie devolve a série, a continuação e as avulsas transitivamente', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const serieFilha = criarSerieFamiliaBase({ id: 'serie-filha', serieOrigemId: 'serie-mae' });
  const avulsaFilha = {
    ...serieFilha,
    id: 'avulsa-filha',
    frequencia: 'uma_vez',
    serieOrigemId: 'serie-filha',
  };
  const serieNeta = criarSerieFamiliaBase({ id: 'serie-neta', serieOrigemId: 'serie-filha' });
  const avulsaNeta = {
    ...serieNeta,
    id: 'avulsa-neta',
    frequencia: 'uma_vez',
    serieOrigemId: 'serie-neta',
  };
  const aulas = [serieMae, serieFilha, serieNeta, avulsaFilha, avulsaNeta];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });

  const ids = Array.from(context.window.resolverFamiliaSerie('serie-mae').map((item) => item.id)).sort();
  assert.deepEqual(ids, ['avulsa-filha', 'avulsa-neta', 'serie-filha', 'serie-mae', 'serie-neta']);
});

test('resolverFamiliaSerie nao entra em laço infinito com vínculo circular', () => {
  const itemA = { id: 'A', serieOrigemId: 'B' };
  const itemB = { id: 'B', serieOrigemId: 'A' };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [itemA, itemB], compromisso: itemA, dataAlvoStr: '31/08/2026' });

  const ids = Array.from(context.window.resolverFamiliaSerie('A').map((item) => item.id)).sort();
  assert.deepEqual(ids, ['A', 'B']);
});

test('resolverFamiliaDescendenteSerie nao sobe para o pai historico', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const serieFilha = criarSerieFamiliaBase({ id: 'serie-filha', serieOrigemId: 'serie-mae' });
  const avulsa = {
    ...serieFilha,
    id: 'avulsa-filha',
    frequencia: 'uma_vez',
    serieOrigemId: 'serie-filha',
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, serieFilha, avulsa], compromisso: serieFilha, dataAlvoStr: '02/09/2026' });

  const ids = Array.from(context.window.resolverFamiliaDescendenteSerie('serie-filha').map((item) => item.id)).sort();
  assert.deepEqual(ids, ['avulsa-filha', 'serie-filha']);
});

test('modal usa família completa em ignorarIds para editar ocorrência da continuação', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae', alunoId: 'aluno-1' });
  const serieFilha = criarSerieFamiliaBase({ id: 'serie-filha', serieOrigemId: 'serie-mae', alunoId: 'aluno-1' });
  const aulas = [serieMae, serieFilha];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  const impacto = context.document.getElementById('editEscopoImpacto');
  const escopo = context.document.getElementById('editEscopoRecorrencia');
  escopo.value = 'occurrence';
  context.document.getElementById('editHoraInicio').value = '09:00';
  context.document.getElementById('editDuracao').value = '60';
  context.window.dataAlvoAcaoStr = '02/09/2026';

  context.window.atualizarAvisoConflitoEdicao();

  assert.equal(impacto.textContent.includes('Conflito detectado'), false);
  const idsFamilia = Array.from(context.window.resolverFamiliaSerie('serie-filha').map((item) => item.id)).sort();
  assert.equal(idsFamilia.join(','), 'serie-filha,serie-mae');
});

test('removerFamiliaSerie remove só a família da série e preserva o restante', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const serieFilha = criarSerieFamiliaBase({ id: 'serie-filha', serieOrigemId: 'serie-mae' });
  const avulsa = {
    ...serieMae,
    id: 'avulsa-1',
    frequencia: 'uma_vez',
    serieOrigemId: 'serie-mae',
    alunoId: 'aluno-1',
  };
  const outroAluno = {
    ...serieMae,
    id: 'outro-1',
    alunoId: 'aluno-2',
    serieOrigemId: undefined,
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, serieFilha, avulsa, outroAluno], compromisso: serieMae, dataAlvoStr: '31/08/2026' });

  const count = context.window.removerFamiliaSerie('serie-mae');
  assert.equal(count, 3);
  assert.deepEqual(context.aulas.map((item) => item.id).sort(), ['outro-1']);
});

test('removerFamiliaSerie nao remove aulas de outro aluno nem sem vínculo', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const semVinculo = {
    ...serieMae,
    id: 'nao-vinculada',
    alunoId: 'aluno-3',
    serieOrigemId: undefined,
  };
  const outroAluno = {
    ...serieMae,
    id: 'outro-aluno',
    alunoId: 'aluno-2',
    serieOrigemId: undefined,
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, semVinculo, outroAluno], compromisso: serieMae, dataAlvoStr: '31/08/2026' });

  const count = context.window.removerFamiliaSerie('serie-mae');
  assert.equal(count, 1);
  assert.deepEqual(context.aulas.map((item) => item.id).sort(), ['nao-vinculada', 'outro-aluno']);
});

test('removerFamiliaSerie preserva reposições e explica a decisão conservadora', () => {
  const serieMae = criarSerieFamiliaBase({ id: 'serie-mae' });
  const reposicao = {
    ...serieMae,
    id: 'repo-1',
    isReposicao: true,
    reposicaoId: 'rep-xyz',
    serieOrigemId: 'serie-mae',
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, reposicao], compromisso: serieMae, dataAlvoStr: '31/08/2026' });

  const count = context.window.removerFamiliaSerie('serie-mae');
  assert.equal(count, 1);
  assert.deepEqual(context.aulas.map((item) => item.id), ['repo-1']);
});

test('montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva reposições', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '13/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
  };
  const serieNeta = {
    ...serieMae,
    id: 'S2',
    data: '05/09/2026',
    recorrenciaDataInicio: '05/09/2026',
    serieOrigemId: 'S1',
  };
  const avulsa = {
    ...serieMae,
    id: 'A1',
    frequencia: 'uma_vez',
    data: '06/09/2026',
    recorrenciaDataInicio: '06/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const reposicao = {
    ...serieMae,
    id: 'R',
    isReposicao: true,
    data: '07/09/2026',
    recorrenciaDataInicio: '07/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, serieNeta, avulsa, reposicao];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1');
  assert.equal(resumo.total, 4);
  assert.equal(resumo.reposicoesPreservadas, 1);
  assert.ok(resumo.ids.includes('S0'));
  assert.equal(resumo.ids.includes('R'), false);
  assert.equal(resumo.desde, '31/08/2026');
  assert.equal(resumo.ate, '13/09/2026');
});

test('removerCadeiaCompletaSerie remove o mesmo total que o resumo anunciou', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '13/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
  };
  const serieNeta = {
    ...serieMae,
    id: 'S2',
    data: '05/09/2026',
    recorrenciaDataInicio: '05/09/2026',
    serieOrigemId: 'S1',
  };
  const avulsa = {
    ...serieMae,
    id: 'A1',
    frequencia: 'uma_vez',
    data: '06/09/2026',
    recorrenciaDataInicio: '06/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const reposicao = {
    ...serieMae,
    id: 'R',
    isReposicao: true,
    data: '07/09/2026',
    recorrenciaDataInicio: '07/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, serieNeta, avulsa, reposicao];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1');
  const removidas = context.window.removerCadeiaCompletaSerie('S1');

  assert.equal(resumo.total, 4);
  assert.equal(removidas, resumo.total);
  assert.equal(context.aulas.some((item) => item.id === 'S0'), false);
  assert.equal(context.aulas.some((item) => item.id === 'R'), true);
});

test('aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const serieNeta = {
    ...serieMae,
    id: 'S3',
    data: '05/09/2026',
    recorrenciaDataInicio: '05/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const reposicao = {
    ...serieMae,
    id: 'R',
    isReposicao: true,
    data: '07/09/2026',
    recorrenciaDataInicio: '07/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, serieNeta, reposicao];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultado.aparadas, 2);
  assert.equal(resultado.removidas, 0);
  assert.equal(resultado.reposicoesPreservadas, 1);
  assert.equal(resultado.ids.includes('S1'), true);
  assert.equal(resultado.ids.includes('S3'), true);
  assert.equal(context.aulas.some((item) => item.id === 'S0'), true);
  assert.equal(context.aulas.some((item) => item.id === 'R'), true);
  assert.equal(serieFilha.recorrenciaDataFim, '06/09/2026');
  assert.equal(serieNeta.recorrenciaDataFim, '06/09/2026');
});

test('aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const serieNeta = {
    ...serieMae,
    id: 'S3',
    data: '05/09/2026',
    recorrenciaDataInicio: '05/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const avulsa = {
    ...serieMae,
    id: 'A1',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    recorrenciaDataInicio: '08/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const reposicao = {
    ...serieMae,
    id: 'R',
    isReposicao: true,
    data: '07/09/2026',
    recorrenciaDataInicio: '07/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, serieNeta, avulsa, reposicao];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultado.aparadas, 2);
  assert.equal(resultado.removidas, 1);
  assert.equal(resultado.reposicoesPreservadas, 1);
  assert.equal(context.aulas.some((item) => item.id === 'S3'), true);
  assert.equal(context.aulas.some((item) => item.id === 'A1'), false);
  assert.equal(serieNeta.recorrenciaDataFim, '06/09/2026');
  assert.equal(resultado.ids.includes('A1'), true);
});

test('aparaCadeiaSerieAPartirDe remove a série quando o aparo não deixa ocorrência', () => {
  const serie = {
    id: 'S1',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '07/09/2026',
    dia: 'Quarta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '07/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '07/09/2026',
    diasSemana: ['Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: 'S0',
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '07/09/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultado.aparadas, 0);
  assert.equal(resultado.removidas, 1);
  assert.equal(resultado.reposicoesPreservadas, 0);
  assert.equal(context.aulas.some((item) => item.id === 'S1'), false);
  assert.equal(resultado.ids.includes('S1'), true);
});

test('aparaCadeiaSerieAPartirDe não toca em descendente que termina antes do corte', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const serieAntesDoCorte = {
    ...serieMae,
    id: 'S3',
    data: '01/09/2026',
    recorrenciaDataInicio: '01/09/2026',
    serieOrigemId: 'S1',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '04/09/2026',
  };

  const aulas = [serieMae, serieFilha, serieAntesDoCorte];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultado.aparadas, 1);
  assert.equal(resultado.removidas, 0);
  assert.equal(resultado.reposicoesPreservadas, 0);
  assert.equal(context.aulas.some((item) => item.id === 'S3'), true);
  assert.equal(serieAntesDoCorte.recorrenciaDataFim, '04/09/2026');
  assert.equal(serieFilha.recorrenciaDataFim, '06/09/2026');
});

test('aparaCadeiaSerieAPartirDe não remove o ancestral avulso', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const avulsaPai = {
    ...serieMae,
    id: 'P',
    frequencia: 'uma_vez',
    data: '10/09/2026',
    recorrenciaDataInicio: '10/09/2026',
    serieOrigemId: undefined,
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const serieFilha = {
    ...serieMae,
    id: 'C',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'P',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };

  const aulas = [avulsaPai, serieFilha];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('C', '07/09/2026');

  assert.equal(resultado.aparadas, 1);
  assert.equal(resultado.removidas, 0);
  assert.equal(resultado.reposicoesPreservadas, 0);
  assert.equal(context.aulas.some((item) => item.id === 'P'), true);
  assert.equal(serieFilha.recorrenciaDataFim, '06/09/2026');
});

test('aparaCadeiaSerieAPartirDe preserva reposição irmã e a contabiliza', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };
  const avulsaIrma = {
    ...serieMae,
    id: 'A1',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    recorrenciaDataInicio: '08/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const reposicaoIrma = {
    ...serieMae,
    id: 'REP',
    frequencia: 'uma_vez',
    isReposicao: true,
    data: '09/09/2026',
    recorrenciaDataInicio: '09/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, avulsaIrma, reposicaoIrma];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '31/08/2026' });

  const resultado = context.window.aparaCadeiaSerieAPartirDe('S1', '07/09/2026');

  assert.equal(resultado.aparadas, 1);
  assert.equal(resultado.removidas, 1);
  assert.equal(resultado.reposicoesPreservadas, 1);
  assert.equal(context.aulas.some((item) => item.id === 'REP'), true);
  assert.equal(context.aulas.some((item) => item.id === 'A1'), false);
  assert.equal(serieFilha.recorrenciaDataFim, '06/09/2026');
});

test('executarExclusaoSerieAPartirDe apara a série e preserva o histórico', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
  };
  const avulsaIrma = {
    ...serieMae,
    id: 'A1',
    frequencia: 'uma_vez',
    data: '08/09/2026',
    recorrenciaDataInicio: '08/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };
  const reposicaoIrma = {
    ...serieMae,
    id: 'REP',
    frequencia: 'uma_vez',
    isReposicao: true,
    data: '09/09/2026',
    recorrenciaDataInicio: '09/09/2026',
    serieOrigemId: 'S0',
    recorrenciaFimCondicao: undefined,
    recorrenciaDataFim: undefined,
  };

  const aulas = [serieMae, serieFilha, avulsaIrma, reposicaoIrma];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '07/09/2026' });
  context.window.confirm = () => true;
  context.window.dataAlvoAcaoStr = '07/09/2026';
  context.window.obterCompromissoSelecionado = () => serieFilha;

  const previsao = context.window.aparaCadeiaSerieAPartirDe(serieFilha, '07/09/2026', { simular: true });
  let chamadasFechar = 0;
  context.window.fecharModalAcaoSlot = () => {
    chamadasFechar += 1;
  };

  context.window.executarExclusaoSerieAPartirDe();

  assert.ok(context.aulas.some((item) => item.id === 'S0'), 'a série anterior ao corte deve sobreviver');
  assert.equal(context.aulas.some((item) => item.id === 'A1'), false, 'a avulsa depois do corte deve ser removida');
  assert.equal(context.aulas.find((item) => item.id === 'S1')?.recorrenciaDataFim, '06/09/2026', 'a série selecionada deve ser aparada no corte');
  assert.equal(previsao.aparadas + previsao.removidas, 2, 'o resumo da ação deve refletir o aparo e a remoção previstos');
  assert.ok(chamadasFechar >= 1, 'executarExclusaoSerieAPartirDe deveria fechar o modal pai');
});

test('cancelar a escolha de cobrança não deixa a operação pendurada', async () => {
  const serie = {
    id: 'S42',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
  };

  const modal = {
    style: { display: '' },
    querySelectorAll: () => [],
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '31/08/2026' });
  const originalGetElementById = context.document.getElementById;
  context.document.getElementById = (id) => {
    if (id === 'modalEscolhaCobrancaReposicao') return modal;
    return originalGetElementById.call(context.document, id);
  };
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });

  const callback = () => {
    throw new Error('o callback não deve ser executado no cancelamento');
  };

  const promessa = context.window.abrirModalEscolhaCobrancaReposicao(serie, callback);
  context.window.fecharModalEscolhaCobrancaReposicao();

  const SENTINELA = Symbol('pendurada');
  const resultado = await Promise.race([
    promessa.then(() => 'resolveu'),
    new Promise((resolver) => setTimeout(() => resolver(SENTINELA), 50)),
  ]);

  context.document.getElementById = originalGetElementById;

  assert.notEqual(resultado, SENTINELA, 'a Promise ficou pendurada após o cancelar');
  assert.equal(modal.style.display, 'none', 'o modal da escolha de cobrança deve fechar');
});

test('montarOpcoesExclusaoSlot concorda o plural com uma aula só', () => {
  const serie = {
    id: 'S1',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    serieOrigemId: null,
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '31/08/2026' });
  const hoje = new Date(2026, 8, 2);
  const opcoes = context.window.montarOpcoesExclusaoSlot(serie, '31/08/2026', { hoje });
  const serieOpcao = opcoes.find((opcao) => opcao.acao === 'serie');

  assert.ok(serieOpcao, 'deve existir a opção de excluir a série');
  assert.match(serieOpcao.detalhe, /As 2 aulas do passado/);
  assert.doesNotMatch(serieOpcao.detalhe, /As 1 aulas/);
});

test('resumo conta as ocorrências passadas da cadeia inteira', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '13/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };
  const serieFilha = { ...serieMae, id: 'S1', data: '02/09/2026', recorrenciaDataInicio: '02/09/2026', serieOrigemId: 'S0' };
  const serieNeta = { ...serieMae, id: 'S2', data: '05/09/2026', recorrenciaDataInicio: '05/09/2026', serieOrigemId: 'S1' };
  const aulas = [serieMae, serieFilha, serieNeta];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  const hoje = new Date(2026, 8, 7);

  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1', { hoje });

  assert.equal(resumo.total, 3);
  assert.equal(resumo.ocorrenciasPassadas, 4);
  assert.equal(resumo.temAulaFutura, true);
});

test('dia em exceção não entra na contagem de passado', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '13/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
    excecoes: ['01/09/2026'],
  };
  const serieFilha = { ...serieMae, id: 'S1', data: '02/09/2026', recorrenciaDataInicio: '02/09/2026', serieOrigemId: 'S0' };
  const serieNeta = { ...serieMae, id: 'S2', data: '05/09/2026', recorrenciaDataInicio: '05/09/2026', serieOrigemId: 'S1' };
  const aulas = [serieMae, serieFilha, serieNeta];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  const hoje = new Date(2026, 8, 7);

  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1', { hoje });

  assert.equal(resumo.ocorrenciasPassadas, 3);
  assert.equal(resumo.temAulaFutura, true);
});

test('série encerrada não promete aulas futuras', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '10/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };
  const serieFilha = { ...serieMae, id: 'S1', data: '02/09/2026', recorrenciaDataInicio: '02/09/2026', serieOrigemId: 'S0' };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae, serieFilha], compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  const hoje = new Date(2026, 8, 20);
  const opcoes = context.window.montarOpcoesExclusaoSlot(serieFilha, '02/09/2026', { hoje });
  const serieOpcao = opcoes.find((opcao) => opcao.acao === 'serie');

  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1', { hoje });

  assert.equal(resumo.temAulaFutura, false);
  assert.match(serieOpcao.detalhe, /todas no passado/);
  assert.doesNotMatch(serieOpcao.detalhe, /futuras/);
});

test('série que começa amanhã não anuncia aulas passadas', () => {
  const serie = {
    id: 'S1',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '10/09/2026',
    dia: 'Quinta',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '10/09/2026',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Quinta'],
    serieOrigemId: null,
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '10/09/2026' });
  const hoje = new Date(2026, 8, 9);
  const resumo = context.window.montarResumoExclusaoCadeiaSerie('S1', { hoje });
  const opcoes = context.window.montarOpcoesExclusaoSlot(serie, '10/09/2026', { hoje });
  const serieOpcao = opcoes.find((opcao) => opcao.acao === 'serie');

  assert.equal(resumo.ocorrenciasPassadas, 0);
  assert.equal(resumo.temAulaFutura, true);
  assert.doesNotMatch(serieOpcao.detalhe, /0 aulas/);
});

test('as funções de execução de exclusão estão expostas', () => {
  const serie = {
    id: 'S1',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    serieOrigemId: null,
  };
  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '31/08/2026' });

  assert.equal(typeof context.window.executarExclusaoInstancia, 'function');
  assert.equal(typeof context.window.executarExclusaoSerie, 'function');
  assert.equal(typeof context.window.executarExclusaoAulaAvulsa, 'function');
});

test('executarExclusaoSerie remove o mesmo total que o modal anunciou', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '13/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };
  const serieFilha = {
    ...serieMae,
    id: 'S1',
    data: '02/09/2026',
    recorrenciaDataInicio: '02/09/2026',
    serieOrigemId: 'S0',
  };
  const serieNeta = {
    ...serieMae,
    id: 'S2',
    data: '05/09/2026',
    recorrenciaDataInicio: '05/09/2026',
    serieOrigemId: 'S1',
  };

  const aulas = [serieMae, serieFilha, serieNeta];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieFilha, dataAlvoStr: '02/09/2026' });
  context.window.confirm = () => true;

  const totalAntes = context.aulas.length;
  const resumoAntes = context.window.montarResumoExclusaoCadeiaSerie('S1');
  context.window.executarExclusaoSerie();

  assert.equal(totalAntes - context.aulas.length, resumoAntes.total);
  assert.equal(context.aulas.some((item) => item.id === 'S0'), false);
});

test('executarExclusaoInstancia remove a aula e persiste', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
  };

  const aulas = [serieMae];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.confirm = () => true;

  let salvarChamadas = 0;
  context.salvarDados = async () => {
    salvarChamadas += 1;
  };
  context.window.salvarDados = context.salvarDados;

  const snapshotAntes = JSON.stringify(context.aulas);
  context.window.executarExclusaoInstancia();

  assert.notEqual(JSON.stringify(context.aulas), snapshotAntes, 'o array de aulas deveria ter mudado');
  assert.ok(salvarChamadas >= 1, 'salvarDados deveria ter sido chamada ao menos uma vez');
});

test('exclusão de série só recarrega depois de a gravação confirmar', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae], compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.confirm = () => true;
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.window.mostrarToast = () => {};

  const eventos = [];
  context.window.salvarDados = async () => {
    await Promise.resolve();
    eventos.push('salvou');
    return { ok: true, motivo: 'sucesso' };
  };
  context.window.inicializarHome = async () => {
    eventos.push('recarregou');
  };

  const snapshotAntes = JSON.stringify(context.aulas);
  await context.window.executarExclusaoSerie();

  assert.ok(eventos.includes('salvou'), 'a gravação precisa confirmar antes do recarregamento');
  assert.ok(eventos.includes('recarregou'), 'a exclusão precisa recarregar após persistir');
  assert.ok(eventos.indexOf('salvou') < eventos.indexOf('recarregou'), 'o recarregamento só deve acontecer depois de salvar');
  assert.notEqual(JSON.stringify(context.aulas), snapshotAntes, 'a série deve permanecer excluída depois da confirmação');
});

test('falha de gravação desfaz a exclusão local e não recarrega', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae], compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.confirm = () => true;
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);

  const eventos = [];
  const toasts = [];
  context.window.salvarDados = async () => {
    eventos.push('salvou');
    return { ok: false, motivo: 'falha_remota' };
  };
  context.window.inicializarHome = async () => {
    eventos.push('recarregou');
  };
  context.window.mostrarToast = (...args) => {
    eventos.push('toast');
    toasts.push(args);
  };

  const idsAntes = context.aulas.map((item) => item.id);
  await context.window.executarExclusaoSerie();

  assert.deepEqual(context.aulas.map((item) => item.id), idsAntes, 'o array de aulas precisa voltar ao estado original em falha de gravação');
  assert.equal(eventos.includes('recarregou'), false, 'a falha não deve disparar recarga');
  assert.ok(toasts.some((args) => args[1] === 'error'), 'deve haver toast de erro ao falhar a persistência');
});

test('excluir daqui pra frente aguarda a gravação', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae], compromisso: serieMae, dataAlvoStr: '10/09/2026' });
  context.window.confirm = () => true;
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.window.mostrarToast = () => {};

  const eventos = [];
  context.window.salvarDados = async () => {
    await Promise.resolve();
    eventos.push('salvou');
    return { ok: true, motivo: 'sucesso' };
  };
  context.window.inicializarHome = async () => {
    eventos.push('recarregou');
  };

  await context.window.executarExclusaoSerieAPartirDe();

  assert.ok(eventos.includes('salvou'), 'a ação deve aguardar a persistência antes de recarregar');
  assert.ok(eventos.includes('recarregou'), 'a ação deve recarregar após a confirmação de persistência');
  assert.ok(eventos.indexOf('salvou') < eventos.indexOf('recarregou'), 'o recarregamento só deve vir depois do save');
});

test('falha de gravação restaura a série aparada', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serieMae], compromisso: serieMae, dataAlvoStr: '15/09/2026' });
  context.window.confirm = () => true;
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.window.mostrarToast = () => {};

  const eventos = [];
  context.window.salvarDados = async () => {
    eventos.push('salvou');
    return { ok: false, motivo: 'falha_remota' };
  };
  context.window.inicializarHome = async () => {
    eventos.push('recarregou');
  };

  const fimOriginal = context.aulas[0].recorrenciaDataFim;
  await context.window.executarExclusaoSerieAPartirDe();

  assert.equal(context.aulas[0].recorrenciaDataFim, fimOriginal, 'o aparo da série precisa ser revertido quando a gravação falha');
  assert.equal(eventos.includes('recarregou'), false, 'não deve recarregar em caso de falha de persistência');
});

test('as três ações de exclusão fecham o modal pai', () => {
  const criarSerie = () => ({
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  });

  ['executarExclusaoInstancia', 'executarExclusaoSerie', 'executarExclusaoAulaAvulsa'].forEach((nomeFuncao) => {
    const serie = criarSerie();
    const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '31/08/2026' });
    context.window.confirm = () => true;

    let chamadasFechar = 0;
    context.window.fecharModalAcaoSlot = () => {
      chamadasFechar += 1;
    };

    context.window[nomeFuncao]();

    assert.ok(chamadasFechar >= 1, `${nomeFuncao} deveria ter chamado fecharModalAcaoSlot`);
  });
});

test('exclusão bloqueada para aluno inativo', () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-inativo',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '30/09/2026',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    serieOrigemId: null,
  };

  const aulas = [serieMae];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.confirm = () => true;
  context.window.getAluno = (alunoId) => ({ id: alunoId, ativo: false });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);

  let salvarChamadas = 0;
  context.salvarDados = async () => {
    salvarChamadas += 1;
  };
  context.window.salvarDados = context.salvarDados;

  const totalAntes = context.aulas.length;
  context.window.executarExclusaoSerie();

  assert.equal(context.aulas.length, totalAntes, 'o array de aulas não deveria ter mudado');
  assert.equal(salvarChamadas, 0, 'salvarDados não deveria ter sido chamada');
});

test('envio para reposição em série preserva a série e marca exceção', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    excecoes: [],
  };

  const aulas = [serieMae];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.idCompromissoSelecionado = serieMae.id;
  context.window.dataAlvoAcaoStr = '31/08/2026';
  context.window.abrirModalEscolhaCobrancaReposicao = (_compromisso, callback) => {
    return callback(true);
  };
  context.window.apiFetchBackend = async () => ({
    ok: true,
    json: async () => ({ id: 'repo-serie-1', validoAte: '2026-09-15' }),
  });
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.salvarDados = async () => ({ ok: true });
  context.window.salvarDados = async () => ({ ok: true });
  context.window.carregarDados = async () => {};
  context.window.inicializarHome = async () => {};
  context.window.fecharModalAcaoSlot = () => {};
  context.window.formatarDataPtBr = (valor) => valor || '';

  const totalAntes = context.aulas.length;
  await context.window.executarEnvioParaReposicao();

  assert.equal(context.aulas.length, totalAntes, 'a série não deve ser removida do array');
  assert.ok(context.aulas[0].excecoes.includes('31/08/2026'), 'a data alvo deve entrar em excecoes');
});

test('envio para reposição em avulsa remove a aula', async () => {
  const avulsa = {
    id: 'A0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'uma_vez',
    data: '31/08/2026',
    horarioInicio: '09:00',
    horarioFim: '10:00',
  };

  const aulas = [avulsa];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: avulsa, dataAlvoStr: '31/08/2026' });
  context.window.idCompromissoSelecionado = avulsa.id;
  context.window.dataAlvoAcaoStr = '31/08/2026';
  context.window.abrirModalEscolhaCobrancaReposicao = (_compromisso, callback) => {
    return callback(true);
  };
  context.window.apiFetchBackend = async () => ({
    ok: true,
    json: async () => ({ id: 'repo-avulsa-1' }),
  });
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);

  let salvarChamadas = 0;
  context.salvarDados = async () => {
    salvarChamadas += 1;
    return { ok: true };
  };
  context.window.salvarDados = async () => {
    salvarChamadas += 1;
    return { ok: true };
  };
  context.window.carregarDados = async () => {};
  context.window.inicializarHome = async () => {};
  context.window.fecharModalAcaoSlot = () => {};

  await context.window.executarEnvioParaReposicao();

  assert.equal(context.aulas.length, 0, 'a aula avulsa deve sair do array');
  assert.equal(salvarChamadas, 1, 'a persistência da avulsa deve ser chamada');
});

test('os dois botões despacham para a mesma função', async () => {
  const serie = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-1',
    frequencia: 'semanal',
    data: '31/08/2026',
    horarioInicio: '09:00',
    horarioFim: '10:00',
  };

  const { context } = criarHarnessModalAcaoSlot({ aulas: [serie], compromisso: serie, dataAlvoStr: '31/08/2026' });
  context.window.idCompromissoSelecionado = serie.id;
  context.window.dataAlvoAcaoStr = '31/08/2026';
  context.window.abrirModalEscolhaCobrancaReposicao = (_compromisso, callback) => {
    return callback(true);
  };
  context.window.apiFetchBackend = async () => ({
    ok: true,
    json: async () => ({ id: 'repo-click-1' }),
  });
  context.window.getAluno = (id) => ({ id, nome: 'Aluno Teste', ativo: true });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.salvarDados = async () => ({ ok: true });
  context.window.salvarDados = async () => ({ ok: true });
  context.window.carregarDados = async () => {};
  context.window.inicializarHome = async () => {};
  context.window.fecharModalAcaoSlot = () => {};

  const btnMandar = context.document.getElementById('btnMandarParaReposicao');
  const btnReagendar = context.document.getElementById('btnReagendarInstancia');
  assert.ok(btnMandar && btnReagendar, 'ambos os botões devem existir no harness');
  assert.equal(btnMandar.listeners.click, btnReagendar.listeners.click, 'os dois botões devem compartilhar o mesmo dispatcher');

  const chamadas = [];
  const original = btnMandar.listeners.click;
  btnMandar.listeners.click = async (...args) => {
    chamadas.push('mandar');
    return original.apply(btnMandar, args);
  };
  btnReagendar.listeners.click = async (...args) => {
    chamadas.push('reagendar');
    return original.apply(btnReagendar, args);
  };

  await btnMandar.listeners.click();
  await btnReagendar.listeners.click();

  assert.deepEqual(chamadas, ['mandar', 'reagendar']);
});

test('envio para reposição bloqueado para aluno inativo', async () => {
  const serieMae = {
    id: 'S0',
    tipo: 'aula',
    alunoId: 'aluno-inativo',
    frequencia: 'semanal',
    data: '31/08/2026',
    dia: 'Segunda',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipoRecorrencia: 'semanal',
    intervaloRecorrencia: 1,
    recorrenciaDataInicio: '31/08/2026',
    recorrenciaDataFim: '30/09/2026',
    recorrenciaFimCondicao: 'untilDate',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    excecoes: [],
  };

  const aulas = [serieMae];
  const { context } = criarHarnessModalAcaoSlot({ aulas, compromisso: serieMae, dataAlvoStr: '31/08/2026' });
  context.window.idCompromissoSelecionado = serieMae.id;
  context.window.dataAlvoAcaoStr = '31/08/2026';
  context.window.getAluno = (id) => ({ id, ativo: false });
  context.window.alunoEstaAtivo = (aluno) => Boolean(aluno && aluno.ativo);
  context.window.abrirModalEscolhaCobrancaReposicao = () => {
    throw new Error('não deveria abrir o modal quando o aluno está inativo');
  };

  let salvarChamadas = 0;
  context.window.salvarDados = async () => {
    salvarChamadas += 1;
    return { ok: true };
  };

  const totalAntes = context.aulas.length;
  await context.window.executarEnvioParaReposicao();

  assert.equal(context.aulas.length, totalAntes, 'o array não deve ser alterado para aluno inativo');
  assert.equal(salvarChamadas, 0, 'a persistência não deve ocorrer para aluno inativo');
});

