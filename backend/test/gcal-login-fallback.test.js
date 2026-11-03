const test = require('node:test');
const assert = require('node:assert/strict');
const Agendamento = require('../src/models/Agendamento');
const GoogleCalendarConnection = require('../src/models/GoogleCalendarConnection');
const GcalReconciliationQueue = require('../src/models/GcalReconciliationQueue');
const gcalSyncService = require('../src/services/gcalSyncService');
const {
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  sincronizarPendentesGcal
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

test('criarAgendamento sem Google Calendar conectado salva com gcalStatus pendente no POST e transiciona para desconectado no flush sem pendencias de erro', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindAgendamento = Agendamento.find;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalFindQueue = GcalReconciliationQueue.find;
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;
  let docPersistido = null;

  try {
    Agendamento.findOne = async () => docPersistido;
    Agendamento.find = async () => (docPersistido ? [docPersistido] : []);
    Agendamento.findOneAndUpdate = async (filtro, update) => {
      docPersistido = {
        ...(docPersistido || {}),
        id: filtro.id,
        ownerEmail: filtro.ownerEmail,
        ...(update.$set || {})
      };
      return docPersistido;
    };
    GcalReconciliationQueue.find = async () => [];

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
    const resPost = criarRespostaMock();

    await criarAgendamento(req, resPost);

    assert.equal(resPost.statusCode, 200);
    assert.equal(resPost.body.gcalStatus, 'pendente', 'POST deve marcar gcalStatus como pendente sem bloquear');

    const resFlush = criarRespostaMock();
    await sincronizarPendentesGcal(req, resFlush);

    assert.equal(resFlush.statusCode, 200);
    assert.equal(resFlush.body.gcalSyncFailed, false, 'Não deve retornar flag de falha');
    assert.equal(resFlush.body.agendamento.gcalStatus, 'desconectado', 'gcalStatus deve transicionar para desconectado no flush');
    assert.equal(resFlush.body.agendamento.gcalSyncPendingAt, undefined, 'Não deve marcar retry');
    assert.equal(resFlush.body.agendamento.gcalSyncPendingTentativas, undefined, 'Não deve incrementar tentativas');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.find = originalFindAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    GcalReconciliationQueue.find = originalFindQueue;
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
  }
});

test('atualizarAgendamento sem Google Calendar conectado enfileira reconciliacao no flush se ja possuia googleCalendarEventId', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindAgendamento = Agendamento.find;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindQueue = GcalReconciliationQueue.find;
  const originalFindOneAndUpdateQueue = GcalReconciliationQueue.findOneAndUpdate;

  let filaReconciliacaoAtualizada = null;
  let docPersistido = {
    id: 'ag-edit-desconectado-1',
    ownerEmail: 'personal@example.com',
    googleCalendarEventId: 'evt-google-123',
    data: '2026-11-10',
    horarioInicio: '08:00',
    horarioFim: '09:00'
  };

  try {
    Agendamento.findOne = () => ({
      ...docPersistido,
      select: () => ({ id: docPersistido.id, googleCalendarEventId: docPersistido.googleCalendarEventId }),
      lean: () => ({ ...docPersistido })
    });
    Agendamento.find = async () => [{ ...docPersistido }];

    Agendamento.findOneAndUpdate = async (filtro, update) => {
      docPersistido = {
        ...docPersistido,
        id: filtro.id,
        ownerEmail: filtro.ownerEmail,
        ...(update.$set || {})
      };
      return docPersistido;
    };

    gcalSyncService.updateEventInGoogle = async () => {
      const erro = new Error('Google Calendar connection not found for the authenticated owner.');
      erro.statusCode = 404;
      throw erro;
    };

    GcalReconciliationQueue.find = async () => [];
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
    const resPut = criarRespostaMock();
    await atualizarAgendamento(req, resPut);
    assert.equal(resPut.statusCode, 200);
    assert.equal(resPut.body.gcalStatus, 'pendente');

    const resFlush = criarRespostaMock();
    await sincronizarPendentesGcal(req, resFlush);

    assert.equal(resFlush.statusCode, 200);
    assert.equal(resFlush.body.agendamento.gcalStatus, 'desconectado');
    assert.ok(filaReconciliacaoAtualizada, 'Deve ter registrado na fila de reconciliação');
    assert.equal(filaReconciliacaoAtualizada.action, 'update');
    assert.equal(filaReconciliacaoAtualizada.googleCalendarEventId, 'evt-google-123');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.find = originalFindAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
    GcalReconciliationQueue.find = originalFindQueue;
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

test('reconcileAndSyncRetroactiveAppointments filtra por ownerEmail ao remover itens da fila (delete e update)', async () => {
  const originalFindQueue = GcalReconciliationQueue.find;
  const originalDeleteOneQueue = GcalReconciliationQueue.deleteOne;
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindAgendamento = Agendamento.find;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalDeleteEventFromGoogle = gcalSyncService.deleteEventFromGoogle;
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;

  const filtrosRemocao = [];
  const atualizadosNoGoogle = [];

  try {
    GcalReconciliationQueue.find = async () => [
      { _id: 'queue-del', action: 'delete', googleCalendarEventId: 'evt-del' },
      { _id: 'queue-upd', action: 'update', agendamentoId: 'ag-upd', googleCalendarEventId: 'evt-upd' }
    ];
    GcalReconciliationQueue.deleteOne = async (filtro) => {
      filtrosRemocao.push(filtro);
    };
    gcalSyncService.deleteEventFromGoogle = async () => {};
    gcalSyncService.updateEventInGoogle = async (_email, payload) => {
      atualizadosNoGoogle.push(payload.id);
      return { googleCalendarEventId: 'evt-upd' };
    };
    Agendamento.findOne = async () => ({ id: 'ag-upd', alunoNome: 'Aluno', data: '2026-11-10' });
    Agendamento.find = async () => [];
    Agendamento.findOneAndUpdate = async () => {};

    const resultado = await gcalSyncService.reconcileAndSyncRetroactiveAppointments('personal@example.com');

    assert.equal(resultado.reconciledDeletions, 1);
    assert.equal(resultado.reconciledUpdates, 1);
    assert.deepEqual(atualizadosNoGoogle, ['ag-upd']);
    assert.equal(filtrosRemocao.length, 2, 'as duas ramificações da fila removem o item consumido');
    assert.deepEqual(
      filtrosRemocao.map((filtro) => filtro._id),
      ['queue-del', 'queue-upd'],
    );
    for (const filtro of filtrosRemocao) {
      assert.equal(
        filtro.ownerEmail,
        'personal@example.com',
        'remoção da fila precisa ser escopada por ownerEmail (regra 4.1)',
      );
    }
  } finally {
    GcalReconciliationQueue.find = originalFindQueue;
    GcalReconciliationQueue.deleteOne = originalDeleteOneQueue;
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.find = originalFindAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    gcalSyncService.deleteEventFromGoogle = originalDeleteEventFromGoogle;
    gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
  }
});

test('erro invalid_grant transiciona conexao para expired e agendamento para desconectado no flush', async () => {
  const originalFindOneAgendamento = Agendamento.findOne;
  const originalFindAgendamento = Agendamento.find;
  const originalFindOneAndUpdateAgendamento = Agendamento.findOneAndUpdate;
  const originalFindOneAndUpdateConn = GoogleCalendarConnection.findOneAndUpdate;
  const originalFindQueue = GcalReconciliationQueue.find;
  const originalPushEventToGoogle = gcalSyncService.pushEventToGoogle;

  let connectionStatusSet = null;
  let agendamentoStatusSet = null;
  let docPersistido = null;

  try {
    Agendamento.findOne = () => null;
    Agendamento.find = async () => (docPersistido ? [docPersistido] : []);
    Agendamento.findOneAndUpdate = async (_filtro, update) => {
      if (update.$set && update.$set.gcalStatus) {
        agendamentoStatusSet = update.$set.gcalStatus;
      }
      docPersistido = {
        ...(docPersistido || {}),
        id: 'ag-expired-1',
        ...(update.$set || {}),
        gcalStatus: agendamentoStatusSet
      };
      return docPersistido;
    };
    GcalReconciliationQueue.find = async () => [];

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
    const resPost = criarRespostaMock();
    await criarAgendamento(req, resPost);
    assert.equal(resPost.statusCode, 200);
    assert.equal(resPost.body.gcalStatus, 'pendente');

    const resFlush = criarRespostaMock();
    await sincronizarPendentesGcal(req, resFlush);

    assert.equal(resFlush.statusCode, 200);
    assert.equal(resFlush.body.tokenExpired, true);
    assert.equal(resFlush.body.needsReconnect, true);
    assert.equal(connectionStatusSet, 'expired', 'Conexão deve ser marcada como expired');
    assert.equal(agendamentoStatusSet, 'desconectado', 'Agendamento deve ser marcado como desconectado');
  } finally {
    Agendamento.findOne = originalFindOneAgendamento;
    Agendamento.find = originalFindAgendamento;
    Agendamento.findOneAndUpdate = originalFindOneAndUpdateAgendamento;
    GoogleCalendarConnection.findOneAndUpdate = originalFindOneAndUpdateConn;
    GcalReconciliationQueue.find = originalFindQueue;
    gcalSyncService.pushEventToGoogle = originalPushEventToGoogle;
  }
});
