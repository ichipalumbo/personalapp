const test = require('node:test');
const assert = require('node:assert/strict');
const Agendamento = require('../src/models/Agendamento');
const GoogleCalendarConnection = require('../src/models/GoogleCalendarConnection');
const GcalReconciliationQueue = require('../src/models/GcalReconciliationQueue');
const gcalSyncService = require('../src/services/gcalSyncService');
const {
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento
} = require('../src/controllers/agendamentoController');

function criarRespostaMock() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

test('criarAgendamento sem Google Calendar conectado salva com gcalStatus desconectado e sem pendencias de erro', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;

  try {
    Agendamento.findOne = () => null;
    Agendamento.findOneAndUpdate = async (filtro, update) => {
      return {
        id: filtro.id,
        ownerEmail: filtro.ownerEmail,
        ...(update.$set || {})
      };
    };

    gcalSyncService.pushEventToGoogle = async () => {
      const erro = new Error('Google Calendar connection not found for the authenticated owner.');
      erro.statusCode = 404;
      throw erro;
    };

    const req = {
      auth: { ownerEmail: 'personal@example.com' },
      body: {
        id: 'ag-sem-calendario-1',
        data: '2026-11-10',
        horarioInicio: '08:00',
        horarioFim: '09:00',
        tipo: 'aula'
      }
    };
    const res = criarRespostaMock();

    await criarAgendamento(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.gcalSyncFailed, undefined, 'Não deve retornar flag de falha');
    assert.equal(res.body.gcalStatus, 'desconectado', 'gcalStatus deve ser desconectado');
    assert.equal(res.body.gcalSyncPendingAt, undefined, 'Não deve marcar retry');
    assert.equal(res.body.gcalSyncPendingTentativas, undefined, 'Não deve incrementar tentativas');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
  }
});

test('atualizarAgendamento sem Google Calendar conectado enfileira reconciliacao se ja possuia googleCalendarEventId', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOneAndUpdateQueue = GcalReconciliationQueue.findOneAndUpdate;

  let filaReconciliacaoAtualizada = null;

  try {
    Agendamento.findOne = () => ({
      id: 'ag-edit-desconectado-1',
      ownerEmail: 'personal@example.com',
      googleCalendarEventId: 'evt-google-123',
      data: '2026-11-10',
      horarioInicio: '08:00',
      horarioFim: '09:00',
      select: () => ({ id: 'ag-edit-desconectado-1', googleCalendarEventId: 'evt-google-123' }),
      lean: () => ({ id: 'ag-edit-desconectado-1', googleCalendarEventId: 'evt-google-123' })
    });

    Agendamento.findOneAndUpdate = async (filtro, update) => {
      return {
        id: filtro.id,
        ownerEmail: filtro.ownerEmail,
        ...(update.$set || {})
      };
    };

    gcalSyncService.updateEventInGoogle = async () => {
      const erro = new Error('Google Calendar connection not found for the authenticated owner.');
      erro.statusCode = 404;
      throw erro;
    };

    GcalReconciliationQueue.findOneAndUpdate = async (filtro, update) => {
      filaReconciliacaoAtualizada = { ...filtro, ...(update.$set || {}) };
      return filaReconciliacaoAtualizada;
    };

    const req = {
      auth: { ownerEmail: 'personal@example.com' },
      params: { id: 'ag-edit-desconectado-1' },
      body: {
        id: 'ag-edit-desconectado-1',
        data: '2026-11-10',
        horarioInicio: '10:00',
        horarioFim: '11:00',
        googleCalendarEventId: 'evt-google-123'
      }
    };
    const res = criarRespostaMock();

    await atualizarAgendamento(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.gcalStatus, 'desconectado');
    assert.ok(filaReconciliacaoAtualizada, 'Deve ter registrado na fila de reconciliação');
    assert.equal(filaReconciliacaoAtualizada.action, 'update');
    assert.equal(filaReconciliacaoAtualizada.googleCalendarEventId, 'evt-google-123');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    GcalReconciliationQueue.findOneAndUpdate = originalFindOneAndUpdateQueue;
  }
});

test('excluirAgendamento sem Google Calendar conectado enfileira delecao no Google e apaga do MongoDB', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindOneAndDeleteAgendamento = Agendamento.findOneAndDelete;
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalFindOneAndUpdateQueue = GcalReconciliationQueue.findOneAndUpdate;

  let filaDelecao = null;
  let apagadoDoMongo = false;

  try {
    Agendamento.findOne = async () => ({
      id: 'ag-del-1',
      ownerEmail: 'personal@example.com',
      googleCalendarEventId: 'evt-google-del-456'
    });

    Agendamento.findOneAndDelete = async () => {
      apagadoDoMongo = true;
      return { id: 'ag-del-1' };
    };

    gcalSyncService.deleteEventFromGoogle = async () => {
      const erro = new Error('Google Calendar connection not found for the authenticated owner.');
      erro.statusCode = 404;
      throw erro;
    };

    GcalReconciliationQueue.findOneAndUpdate = async (filtro, update) => {
      filaDelecao = { ...filtro, ...(update.$set || {}) };
      return filaDelecao;
    };

    const req = {
      auth: { ownerEmail: 'personal@example.com' },
      params: { id: 'ag-del-1' }
    };
    const res = criarRespostaMock();

    await excluirAgendamento(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.deleted, true);
    assert.equal(apagadoDoMongo, true, 'Deve apagar do MongoDB');
    assert.ok(filaDelecao, 'Deve enfileirar deleção para quando reconectar');
    assert.equal(filaDelecao.action, 'delete');
    assert.equal(filaDelecao.googleCalendarEventId, 'evt-google-del-456');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.findOneAndDelete = originalFindOneAndDeleteAgendamento;
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    GcalReconciliationQueue.findOneAndUpdate = originalFindOneAndUpdateQueue;
  }
});

test('reconcileAndSyncRetroactiveAppointments processa exclusoes da fila e publica aulas desconectadas', async () => {
  const originalFindQueue = GcalReconciliationQueue.find;
  const originalDeleteOneQueue = GcalReconciliationQueue.deleteOne;
  const originalFindAgendamento = Agendamento.find;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;

  const deletedFromGoogle = [];
  const pushedToGoogle = [];
  const queueItemsDeleted = [];

  try {
    GcalReconciliationQueue.find = async () => [
      { _id: 'queue-1', action: 'delete', googleCalendarEventId: 'evt-old-1' }
    ];

    GcalReconciliationQueue.deleteOne = async (filtro) => {
      queueItemsDeleted.push(filtro._id);
    };

    gcalSyncService.deleteEventFromGoogle = async (_email, eventId) => {
      deletedFromGoogle.push(eventId);
    };

    Agendamento.find = async () => [
      {
        id: 'ag-retro-1',
        data: '2099-01-01',
        horarioInicio: '08:00',
        horarioFim: '09:00',
        gcalStatus: 'desconectado'
      }
    ];

    gcalSyncService.pushEventToGoogle = async (_email, payload) => {
      pushedToGoogle.push(payload.id);
      return { googleCalendarEventId: `evt-${payload.id}` };
    };

    Agendamento.findOneAndUpdate = async () => {};

    const resultado = await gcalSyncService.reconcileAndSyncRetroactiveAppointments('personal@example.com');

    assert.equal(resultado.ok, true);
    assert.equal(resultado.reconciledDeletions, 1);
    assert.deepEqual(deletedFromGoogle, ['evt-old-1']);
    assert.deepEqual(queueItemsDeleted, ['queue-1']);
    assert.equal(resultado.syncedCount, 1);
    assert.deepEqual(pushedToGoogle, ['ag-retro-1']);
  } finally {
    GcalReconciliationQueue.find = originalFindQueue;
    GcalReconciliationQueue.deleteOne = originalDeleteOneQueue;
    Agendamento.find = originalFindAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
  }
});

test('erro invalid_grant transiciona conexao para expired e agendamento para desconectado', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalFindOneAndUpdateConn = GoogleCalendarConnection.findOneAndUpdate;
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;

  let connectionStatusSet = null;
  let agendamentoStatusSet = null;

  try {
    Agendamento.findOne = () => null;
    Agendamento.findOneAndUpdate = async (_filtro, update) => {
      if (update.$set && update.$set.gcalStatus) {
        agendamentoStatusSet = update.$set.gcalStatus;
      }
      return { id: 'ag-expired-1', gcalStatus: agendamentoStatusSet };
    };

    GoogleCalendarConnection.findOneAndUpdate = async (_filtro, update) => {
      if (update.$set && update.$set.status) {
        connectionStatusSet = update.$set.status;
      }
      return { status: connectionStatusSet };
    };

    gcalSyncService.pushEventToGoogle = async () => {
      const err = new Error('invalid_grant');
      err.code = 'invalid_grant';
      throw err;
    };

    const req = {
      auth: { ownerEmail: 'personal@example.com' },
      body: {
        id: 'ag-expired-1',
        data: '2026-11-10',
        horarioInicio: '08:00',
        horarioFim: '09:00',
        tipo: 'aula'
      }
    };
    const res = criarRespostaMock();

    await criarAgendamento(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.tokenExpired, true);
    assert.equal(res.body.needsReconnect, true);
    assert.equal(connectionStatusSet, 'expired', 'Conexão deve ser marcada como expired');
    assert.equal(agendamentoStatusSet, 'desconectado', 'Agendamento deve ser marcado como desconectado');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    GoogleCalendarConnection.findOneAndUpdate = originalFindOneAndUpdateConn;
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
  }
});
