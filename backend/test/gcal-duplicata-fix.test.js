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
    error() {}
  };

  vm.runInNewContext(script, context, { filename: scriptPath });
  return context;
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
      select: () => ({
        lean: async () => ({ googleCalendarEventId: 'evt-existente-1' })
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
      select: () => ({
        lean: async () => ({ googleCalendarEventId: 'evt-serie-1' })
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
      select: () => ({
        lean: async () => ({ googleCalendarEventId: 'evt-serie-1' })
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
    assert.deepEqual(updatesMongo[1].update.$unset, { gcalSyncPendingAt: 1 });
    assert.equal(res.body.gcalSyncPendingAt, undefined);
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
      select: () => ({
        lean: async () => ({ googleCalendarEventId: 'evt-portao-1' })
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
