const test = require('node:test');
const assert = require('node:assert/strict');

const Agendamento = require('../src/models/Agendamento');
const Aluno = require('../src/models/Aluno');
const BloqueioExterno = require('../src/models/BloqueioExterno');
const {
  APP_ORIGIN,
  adicionarDiasISO,
  classificarEventoDeLeitura,
  getHorarioPadraoFim,
  listCalendarEvents,
  montarEventoGoogle,
  montarRecurrence,
  montarTituloEvento,
  persistSyncResults,
  resolverDataISO,
  isAppOwnedEvent,
} = require('../src/services/gcalSyncService');
const { montarPayloadGCal } = require('../src/controllers/agendamentoController');
const recurrenceHelpers = require('../../assets/js/shared/recurrence-helpers');

test('getHorarioPadraoFim usa +60 minutos em horário normal', () => {
  assert.equal(getHorarioPadraoFim({ horarioInicio: '09:30' }), '10:30');
});

test('getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite', () => {
  assert.equal(getHorarioPadraoFim({ horarioInicio: '23:30' }), '00:30');
});

test('adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito', () => {
  assert.equal(adicionarDiasISO('2026-01-31', 1), '2026-02-01');
  assert.equal(adicionarDiasISO('2026-12-31', 1), '2027-01-01');
});

test('montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite', () => {
  const timezoneAnterior = process.env.GCAL_TIMEZONE;
  process.env.GCAL_TIMEZONE = 'America/Sao_Paulo';

  try {
    const evento = montarEventoGoogle({
      data: '2026-08-25',
      horarioInicio: '23:30',
      tipo: 'aula'
    });

    assert.deepEqual(evento.start, {
      dateTime: '2026-08-25T23:30:00',
      timeZone: 'America/Sao_Paulo'
    });
    assert.deepEqual(evento.end, {
      dateTime: '2026-08-26T00:30:00',
      timeZone: 'America/Sao_Paulo'
    });
  } finally {
    process.env.GCAL_TIMEZONE = timezoneAnterior;
  }
});

test('montarEventoGoogle mantém start e end no mesmo dia em aula normal', () => {
  const timezoneAnterior = process.env.GCAL_TIMEZONE;
  process.env.GCAL_TIMEZONE = 'America/Sao_Paulo';

  try {
    const evento = montarEventoGoogle({
      data: '2026-08-25',
      horarioInicio: '09:00',
      horarioFim: '10:00',
      tipo: 'aula'
    });

    assert.equal(evento.start.dateTime, '2026-08-25T09:00:00');
    assert.equal(evento.end.dateTime, '2026-08-25T10:00:00');
    assert.equal(evento.start.timeZone, 'America/Sao_Paulo');
    assert.equal(evento.end.timeZone, 'America/Sao_Paulo');
  } finally {
    process.env.GCAL_TIMEZONE = timezoneAnterior;
  }
});

test('montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início', () => {
  const timezoneAnterior = process.env.GCAL_TIMEZONE;
  process.env.GCAL_TIMEZONE = 'America/Sao_Paulo';

  try {
    const evento = montarEventoGoogle({
      data: '2026-08-25',
      horarioInicio: '23:00',
      horarioFim: '00:30',
      tipo: 'aula'
    });

    assert.equal(evento.start.dateTime, '2026-08-25T23:00:00');
    assert.equal(evento.end.dateTime, '2026-08-26T00:30:00');
  } finally {
    process.env.GCAL_TIMEZONE = timezoneAnterior;
  }
});

test('montarEventoGoogle não transforma duração zero em evento de 24 horas', () => {
  const timezoneAnterior = process.env.GCAL_TIMEZONE;
  process.env.GCAL_TIMEZONE = 'America/Sao_Paulo';

  try {
    const evento = montarEventoGoogle({
      data: '2026-08-25',
      horarioInicio: '09:00',
      horarioFim: '09:00',
      tipo: 'aula'
    });

    assert.equal(evento.start.dateTime, '2026-08-25T09:00:00');
    assert.equal(evento.end.dateTime, '2026-08-25T09:00:00');
  } finally {
    process.env.GCAL_TIMEZONE = timezoneAnterior;
  }
});

test('montarTituloEvento combina objetivo e nome', () => {
  const titulo = montarTituloEvento({ objetivo: 'Hipertrofia', alunoNome: 'João' });
  assert.equal(titulo, 'Hipertrofia - João');
});

test('montarTituloEvento usa apenas objetivo quando não há nome', () => {
  const titulo = montarTituloEvento({ objetivo: 'Hipertrofia' });
  assert.equal(titulo, 'Hipertrofia');
});

test('montarTituloEvento usa fallback por tipo quando objetivo e nome não existem', () => {
  const titulo = montarTituloEvento({ tipo: 'bloqueio' });
  assert.equal(titulo, 'Bloqueio');
});

test('montarTituloEvento trata tipo reposicao com nome do aluno', () => {
  const titulo = montarTituloEvento({ tipo: 'reposicao', alunoNome: 'Maria' });
  assert.equal(titulo, 'Reposição - Maria');
});

test('resolverDataISO converte ISO e PT-BR e rejeita entrada inválida', () => {
  assert.equal(resolverDataISO({ data: '2026-08-25' }), '2026-08-25');
  assert.equal(resolverDataISO({ data: '25/08/2026' }), '2026-08-25');

  const hoje = new Date().toISOString().slice(0, 10);
  assert.match(resolverDataISO({ data: 'data incorreta' }), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(resolverDataISO({ data: 'data incorreta' }), hoje);
});

test('isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties', () => {
  assert.equal(isAppOwnedEvent({
    extendedProperties: { private: { app_origin: APP_ORIGIN } }
  }), true);

  assert.equal(isAppOwnedEvent({
    extendedProperties: { private: { app_origin: 'google' } }
  }), false);

  assert.equal(isAppOwnedEvent({ summary: 'Evento externo' }), false);
});

test('classificarEventoDeLeitura ignora evento sem id', () => {
  assert.equal(classificarEventoDeLeitura({ status: 'confirmed' }), 'ignorar');
});

test('classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado', () => {
  assert.equal(classificarEventoDeLeitura({
    id: 'evt-app-cancelled',
    status: 'cancelled',
    extendedProperties: { private: { app_origin: APP_ORIGIN } }
  }), 'ignorar');
});

test('classificarEventoDeLeitura remove evento externo cancelado', () => {
  assert.equal(classificarEventoDeLeitura({
    id: 'evt-externo-cancelado',
    status: 'cancelled',
    extendedProperties: { private: { app_origin: 'google' } }
  }), 'remover');
});

test('classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties', () => {
  assert.equal(classificarEventoDeLeitura({
    id: 'evt-externo-ativo',
    status: 'confirmed'
  }), 'upsert');
});

test('atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update', async () => {
  const controllerPath = require.resolve('../src/controllers/agendamentoController');
  const gcalSyncService = require('../src/services/gcalSyncService');
  const originalUpdateEventInGoogle = gcalSyncService.updateEventInGoogle;
  const originalFindOneAndUpdate = Agendamento.findOneAndUpdate;
  const originalFindOne = Agendamento.findOne;
  const originalAlunoFindOne = Aluno.findOne;
  const corpoResposta = {};

  try {
   delete require.cache[controllerPath];
   gcalSyncService.updateEventInGoogle = async (ownerEmail, payload) => {
     corpoResposta.ownerEmail = ownerEmail;
     corpoResposta.payload = payload;
     return { googleCalendarEventId: 'evt-789' };
   };

   Agendamento.findOne = () => ({
     select: () => ({
       lean: async () => ({ googleCalendarEventId: 'evt-123' })
     })
   });
   Agendamento.findOneAndUpdate = async (query, update, options) => {
     if (query && query.id === 'ag-200') {
       return {
         id: 'ag-200',
         alunoId: 'al-111',
         data: '2026-08-25',
         horarioInicio: '09:00',
         horarioFim: '10:00',
         tipo: 'aula',
         googleCalendarEventId: 'evt-123'
       };
     }
     return { id: 'ag-200', googleCalendarEventId: 'evt-789' };
   };
   Aluno.findOne = () => ({
     lean: async () => ({ id: 'al-111', nome: 'João', objetivo: 'Hipertrofia' })
   });

   const { atualizarAgendamento } = require('../src/controllers/agendamentoController');
   const req = {
     params: { id: 'ag-200' },
     body: {
       id: 'ag-200',
       alunoId: 'al-111',
       data: '2026-08-25',
       horarioInicio: '09:00',
       horarioFim: '10:00',
       tipo: 'aula'
     },
     auth: { ownerEmail: 'joao@example.com' }
   };
   const res = {
     json: (body) => {
       corpoResposta.response = body;
       return body;
     }
   };

   await atualizarAgendamento(req, res);

   assert.equal(corpoResposta.payload.alunoNome, 'João');
   assert.equal(corpoResposta.payload.objetivo, 'Hipertrofia');
   assert.equal(montarTituloEvento(corpoResposta.payload), 'Hipertrofia - João');
   assert.equal(corpoResposta.response.alunoNome, undefined);
   assert.equal(corpoResposta.response.objetivo, undefined);
  } finally {
   gcalSyncService.updateEventInGoogle = originalUpdateEventInGoogle;
   Agendamento.findOneAndUpdate = originalFindOneAndUpdate;
   Agendamento.findOne = originalFindOne;
   Aluno.findOne = originalAlunoFindOne;
   delete require.cache[controllerPath];
  }
});

test('montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC', () => {
  const recurrence = montarRecurrence({
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    intervaloRecorrencia: 2,
    diasSemana: ['Segunda', 'Quinta'],
    recorrenciaDataInicio: '2026-08-20',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '27/08/2026'
  });

  assert.deepEqual(recurrence, [
    'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH;UNTIL=20260827T235959Z'
  ]);
});

test('montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL', () => {
  const countRule = montarRecurrence({
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-02-10',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 3,
    recorrenciaEscopo: 'monthOfDate'
  });

  assert.deepEqual(countRule, [
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=10;COUNT=3'
  ]);

  const monthRule = montarRecurrence({
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-02-15',
    recorrenciaEscopo: 'monthOfDate'
  });

  assert.deepEqual(monthRule, [
    'RRULE:FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20260228T235959Z'
  ]);
});

test('montarRecurrence devolve null para agendamento avulso ou com dia inválido', () => {
  assert.equal(montarRecurrence({ tipo: 'aula', data: '2026-08-25', frequencia: 'uma_vez' }), null);
  assert.equal(montarRecurrence({
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Dia imaginário'],
    recorrenciaDataInicio: '2026-08-25'
  }), null);
});

test('montarRecurrence devolve null quando a data de início é inválida', () => {
  assert.equal(montarRecurrence({
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    recorrenciaDataInicio: 'data invalida',
    recorrenciaEscopo: 'monthOfDate'
  }), null);
});

test('count de recorrencia inclui excecoes sem reduzir a contagem', () => {
  const comp = {
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Terça'],
    recorrenciaDataInicio: '2026-08-18',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 2,
    horarioInicio: '09:00',
    excecoes: ['25/08/2026']
  };

  const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  assert.equal(recurrenceHelpers.checarCompromissoNaData(comp, new Date(2026, 7, 18), '09:00', dias), true);
  assert.equal(recurrenceHelpers.checarCompromissoNaData(comp, new Date(2026, 7, 25), '09:00', dias), false);
  assert.equal(recurrenceHelpers.checarCompromissoNaData(comp, new Date(2026, 8, 1), '09:00', dias), false);
});

test('montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada', () => {
  const agendamento = {
    id: 'ag-123',
    alunoId: 'al-456',
    alunoNome: 'Maria',
    objetivo: 'Hipertrofia',
    data: '2026-08-20',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    descricao: 'Aula recorrente',
    local: 'Academia',
    fullDay: false,
    googleCalendarEventId: 'evt-123',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    intervaloRecorrencia: 2,
    diasSemana: ['Segunda', 'Quinta'],
    dia: 'Segunda',
    recorrenciaEscopo: 'monthOfDate',
    recorrenciaDataInicio: '2026-08-20',
    recorrenciaDataFim: '27/08/2026',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaQuantidadeOcorrencias: 10,
    dataCriacao: '2026-08-15',
    excecoes: ['25/08/2026'],
    excecoesDetalhadas: [{ data: '25/08/2026', horarioInicio: '09:00' }],
    timeZone: 'America/Sao_Paulo',
    _id: 'mongo-id',
    __v: 1,
    ownerEmail: 'maria@example.com'
  };

  const payload = montarPayloadGCal(agendamento);

  assert.equal(payload.tipoRecorrencia, 'semanal');
  assert.equal(payload.frequencia, 'semanal');
  assert.equal(payload.intervaloRecorrencia, 2);
  assert.deepEqual(payload.diasSemana, ['Segunda', 'Quinta']);
  assert.equal(payload.recorrenciaFimCondicao, 'untilDate');
  assert.equal(payload.recorrenciaDataFim, '27/08/2026');
  assert.equal(payload.dataCriacao, '2026-08-15');
  assert.deepEqual(payload.excecoes, ['25/08/2026']);
  assert.equal(payload.timeZone, 'America/Sao_Paulo');
  assert.equal(payload._id, undefined);
  assert.equal(payload.__v, undefined);
  assert.equal(payload.ownerEmail, undefined);

  const evento = montarEventoGoogle(payload);
  assert.ok(Array.isArray(evento.recurrence));
  assert.equal(evento.recurrence[0].startsWith('RRULE:'), true);
  assert.match(evento.recurrence[0], /^RRULE:FREQ=WEEKLY/);
  assert.ok(evento.recurrence[0].includes('BYDAY=MO,TH'));
  assert.ok(evento.recurrence[0].includes('UNTIL=20260827T235959Z'));

  const agendamentoAvulso = {
    id: 'ag-999',
    data: '2026-08-20',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    local: 'Academia',
    fullDay: false,
    googleCalendarEventId: 'evt-999'
  };

  const eventoAvulso = montarEventoGoogle(montarPayloadGCal(agendamentoAvulso));
  assert.equal(eventoAvulso.recurrence, undefined);

  const payloadSemArrays = montarPayloadGCal({
    id: 'ag-100',
    data: '2026-08-20',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    tipoRecorrencia: 'semanal'
  });

  assert.deepEqual(payloadSemArrays.diasSemana, []);
  assert.deepEqual(payloadSemArrays.excecoes, []);
  assert.deepEqual(payloadSemArrays.excecoesDetalhadas, []);
});

test('montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro', () => {
  const recorrenciaTemporizada = montarRecurrence({
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Terça'],
    recorrenciaDataInicio: '2026-08-25',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-08-27',
    horarioInicio: '09:00',
    timeZone: 'America/Sao_Paulo',
    excecoesDetalhadas: [{ data: '2026-08-26', horarioInicio: '09:00' }]
  });

  assert.ok(recorrenciaTemporizada.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260826T090000')));

  const recorrenciaDiaInteiro = montarRecurrence({
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Quarta'],
    recorrenciaDataInicio: '2026-08-26',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-08-27',
    fullDay: true,
    excecoes: ['27/08/2026']
  });

  assert.ok(recorrenciaDiaInteiro.some((entrada) => entrada.includes('EXDATE;VALUE=DATE:20260827')));
});

test('montarEventoGoogle inclui recurrence em serie e omite quando avulso', () => {
  const recorrente = montarEventoGoogle({
    data: '2026-08-25',
    horarioInicio: '23:00',
    horarioFim: '00:30',
    tipo: 'aula',
    tipoRecorrencia: 'diaria',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-08-25',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-08-27'
  });

  assert.ok(Array.isArray(recorrente.recurrence));
  assert.match(recorrente.recurrence[0], /^RRULE:FREQ=DAILY/);
  assert.equal(recorrente.start.dateTime, '2026-08-25T23:00:00');
  assert.equal(recorrente.end.dateTime, '2026-08-26T00:30:00');

  const avulso = montarEventoGoogle({
    data: '2026-08-25',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    tipo: 'aula',
    frequencia: 'uma_vez'
  });

  assert.equal(avulso.recurrence, undefined);
});

test('listCalendarEvents inclui janela consultada no full sync e null no incremental', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ items: [] })
  });

  try {
    const full = await listCalendarEvents({
      getAccessToken: async () => 'token-test'
    }, {
      ownerEmail: 'joao@example.com',
      calendarId: 'primary',
      syncToken: null
    });

    assert.ok(full.timeMin);
    assert.ok(full.timeMax);
    assert.ok(full.timeMin < full.timeMax);

    const incremental = await listCalendarEvents({
      getAccessToken: async () => 'token-test'
    }, {
      ownerEmail: 'joao@example.com',
      calendarId: 'primary',
      syncToken: 'sync-token-123'
    });

    assert.equal(incremental.timeMin, null);
    assert.equal(incremental.timeMax, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('full sync não apaga bloqueio local fora da janela consultada', async () => {
  const originalFind = BloqueioExterno.find;
  const originalDelete = BloqueioExterno.findOneAndDelete;
  const deletados = [];

  BloqueioExterno.find = () => ({
    select: () => ({
      lean: async () => [{
        googleCalendarEventId: 'evt-fora-janela',
        data: '2026-05-01'
      }]
    })
  });
  BloqueioExterno.findOneAndDelete = async ({ googleCalendarEventId }) => {
    deletados.push(googleCalendarEventId);
    return { googleCalendarEventId };
  };

  try {
    await persistSyncResults({ ownerEmail: 'joao@example.com', syncToken: null }, {
      activeItems: [],
      cancelledItems: [],
      timeMin: '2026-07-01T00:00:00.000Z',
      timeMax: '2026-09-30T23:59:59.999Z'
    });

    assert.deepEqual(deletados, []);
  } finally {
    BloqueioExterno.find = originalFind;
    BloqueioExterno.findOneAndDelete = originalDelete;
  }
});

test('full sync apaga bloqueio local dentro da janela que não veio do remoto', async () => {
  const originalFind = BloqueioExterno.find;
  const originalDelete = BloqueioExterno.findOneAndDelete;
  const deletados = [];

  BloqueioExterno.find = () => ({
    select: () => ({
      lean: async () => [{
        googleCalendarEventId: 'evt-fora-janela',
        data: '2026-05-01'
      }, {
        googleCalendarEventId: 'evt-dentro-janela',
        data: '2026-08-15'
      }]
    })
  });
  BloqueioExterno.findOneAndDelete = async ({ googleCalendarEventId }) => {
    deletados.push(googleCalendarEventId);
    return { googleCalendarEventId };
  };

  try {
    await persistSyncResults({ ownerEmail: 'joao@example.com', syncToken: null }, {
      activeItems: [],
      cancelledItems: [],
      timeMin: '2026-07-01T00:00:00.000Z',
      timeMax: '2026-09-30T23:59:59.999Z'
    });

    assert.deepEqual(deletados, ['evt-dentro-janela']);
  } finally {
    BloqueioExterno.find = originalFind;
    BloqueioExterno.findOneAndDelete = originalDelete;
  }
});

test('sync incremental não dispara purge por varredura', async () => {
  const originalFind = BloqueioExterno.find;
  const originalDelete = BloqueioExterno.findOneAndDelete;
  const deletados = [];

  BloqueioExterno.find = () => ({
    select: () => ({
      lean: async () => [{
        googleCalendarEventId: 'evt-local',
        data: '2026-08-15'
      }]
    })
  });
  BloqueioExterno.findOneAndDelete = async ({ googleCalendarEventId }) => {
    deletados.push(googleCalendarEventId);
    return { googleCalendarEventId };
  };

  try {
    await persistSyncResults({ ownerEmail: 'joao@example.com', syncToken: 'sync-token-123' }, {
      activeItems: [],
      cancelledItems: [],
      timeMin: '2026-07-01T00:00:00.000Z',
      timeMax: '2026-09-30T23:59:59.999Z'
    });

    assert.deepEqual(deletados, []);
  } finally {
    BloqueioExterno.find = originalFind;
    BloqueioExterno.findOneAndDelete = originalDelete;
  }
});

test('janela ausente ou inválida não dispara delete em full sync', async () => {
  const originalFind = BloqueioExterno.find;
  const originalDelete = BloqueioExterno.findOneAndDelete;
  const deletados = [];

  BloqueioExterno.find = () => ({
    select: () => ({
      lean: async () => [{
        googleCalendarEventId: 'evt-local',
        data: '2026-08-15'
      }]
    })
  });
  BloqueioExterno.findOneAndDelete = async ({ googleCalendarEventId }) => {
    deletados.push(googleCalendarEventId);
    return { googleCalendarEventId };
  };

  try {
    await persistSyncResults({ ownerEmail: 'joao@example.com', syncToken: null }, {
      activeItems: [],
      cancelledItems: []
    });
    await persistSyncResults({ ownerEmail: 'joao@example.com', syncToken: null }, {
      activeItems: [],
      cancelledItems: [],
      timeMin: 'invalido',
      timeMax: '2026-09-30T23:59:59.999Z'
    });

    assert.deepEqual(deletados, []);
  } finally {
    BloqueioExterno.find = originalFind;
    BloqueioExterno.findOneAndDelete = originalDelete;
  }
});
