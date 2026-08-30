const test = require('node:test');
const assert = require('node:assert/strict');
const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');

const Agendamento = require('../src/models/Agendamento');
const Aluno = require('../src/models/Aluno');
const BloqueioExterno = require('../src/models/BloqueioExterno');
const GoogleCalendarConnection = require('../src/models/GoogleCalendarConnection');
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
  renewWebhookChannelForOwner,
  resolverDataISO,
  isAppOwnedEvent,
} = require('../src/services/gcalSyncService');
const { montarPayloadGCal } = require('../src/controllers/agendamentoController');
const { encryptRefreshToken } = require('../src/utils/gcalCrypto');
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
     lean: async () => ({
       id: 'ag-200',
       alunoId: 'al-111',
       data: '2026-08-25',
       horarioInicio: '09:00',
       horarioFim: '10:00',
       tipo: 'aula',
       googleCalendarEventId: 'evt-123'
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

test('montarEventoGoogle alinha DTSTART para a primeira ocorrencia semanal fora do BYDAY', () => {
  const evento = montarEventoGoogle({
    id: 'ag-2026-08-30',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 10,
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.equal(evento.start.dateTime, '2026-08-31T09:00:00');
  assert.equal(evento.end.dateTime, '2026-08-31T10:00:00');
  assert.ok(evento.recurrence[0].includes('BYDAY=MO,TU,WE'));
  assert.ok(evento.recurrence[0].includes('COUNT=10'));
});

test('montarEventoGoogle não realinha DTSTART quando a data base já atende ao BYDAY', () => {
  const evento = montarEventoGoogle({
    id: 'ag-2026-08-25',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-25',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 4,
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.equal(evento.start.dateTime, '2026-08-25T09:00:00');
  assert.equal(evento.end.dateTime, '2026-08-25T10:00:00');
});

test('montarEventoGoogle alinha DTSTART para BYDAY em recorrencia mensal', () => {
  const evento = montarEventoGoogle({
    id: 'ag-mensal-bydays',
    tipo: 'aula',
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    diasSemana: ['Domingo'],
    recorrenciaDataInicio: '2026-08-31',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 4,
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.equal(evento.start.dateTime, '2026-09-06T09:00:00');
  assert.ok(evento.recurrence[0].includes('FREQ=MONTHLY'));
  assert.ok(evento.recurrence[0].includes('BYDAY=SU'));
});

test('montarEventoGoogle não alinha DTSTART quando a recorrência não gera BYDAY', () => {
  const diaria = montarEventoGoogle({
    tipo: 'aula',
    data: '2026-08-30',
    tipoRecorrencia: 'diaria',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-01',
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  const mensalPorDiaDoMes = montarEventoGoogle({
    tipo: 'aula',
    data: '2026-08-30',
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-30',
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  const anual = montarEventoGoogle({
    tipo: 'aula',
    data: '2026-08-30',
    tipoRecorrencia: 'anual',
    frequencia: 'semanal',
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2027-08-30',
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  const avulso = montarEventoGoogle({
    tipo: 'aula',
    data: '2026-08-30',
    horarioInicio: '09:00',
    horarioFim: '10:00',
    frequencia: 'uma_vez'
  });

  assert.equal(diaria.start.dateTime, '2026-08-30T09:00:00');
  assert.equal(mensalPorDiaDoMes.start.dateTime, '2026-08-30T09:00:00');
  assert.equal(anual.start.dateTime, '2026-08-30T09:00:00');
  assert.equal(avulso.start.dateTime, '2026-08-30T09:00:00');
});

test('montarEventoGoogle preserva duração após alinhamento do DTSTART', () => {
  const cruzandoMeiaNoite = montarEventoGoogle({
    id: 'ag-alinhamento-meia-noite',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 4,
    horarioInicio: '23:00',
    horarioFim: '00:30'
  });

  const diaInteiro = montarEventoGoogle({
    id: 'ag-alinhamento-dia-inteiro',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 4,
    fullDay: true,
    horarioInicio: '00:00',
    horarioFim: '23:59'
  });

  assert.equal(cruzandoMeiaNoite.start.dateTime, '2026-08-31T23:00:00');
  assert.equal(cruzandoMeiaNoite.end.dateTime, '2026-09-01T00:30:00');
  assert.equal(new Date(cruzandoMeiaNoite.end.dateTime) - new Date(cruzandoMeiaNoite.start.dateTime), 90 * 60 * 1000);

  assert.equal(diaInteiro.start.date, '2026-08-31');
  assert.equal(diaInteiro.end.date, '2026-09-01');
});

test('montarRecurrence devolve null para monthOfDate quando DTSTART alinhado cruza o mês', () => {
  const recurrence = montarRecurrence({
    id: 'ag-monthofdate-cruza-mes',
    tipoRecorrencia: 'mensal',
    frequencia: 'semanal',
    diasSemana: ['Domingo'],
    recorrenciaDataInicio: '2026-08-31',
    recorrenciaEscopo: 'monthOfDate'
  });

  assert.equal(recurrence, null);
});

test('montarRecurrence devolve null para untilDate quando DTSTART alinhado ultrapassa o UNTIL', () => {
  const recurrence = montarRecurrence({
    id: 'ag-untildate-ultrapassa',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Domingo'],
    recorrenciaDataInicio: '2026-08-31',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-02',
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.equal(recurrence, null);
});

test('recorrenciaDataInicio tem precedência sobre data como origem do DTSTART alinhado', () => {
  const evento = montarEventoGoogle({
    id: 'ag-precedencia-recorrencia',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça'],
    data: '2026-08-24',
    recorrenciaDataInicio: '2026-08-27',
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.ok(evento.start.dateTime.startsWith('2026-08-31'));
  assert.notEqual(evento.start.dateTime.startsWith('2026-08-24'), true);
  assert.ok(evento.start.dateTime >= '2026-08-27T09:00:00');
});

test('montarEventoGoogle preserva COUNT ao alinhar DTSTART com BYDAY', () => {
  const evento = montarEventoGoogle({
    id: 'ag-count-alinhado',
    tipo: 'aula',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'occurrences',
    recorrenciaQuantidadeOcorrencias: 10,
    horarioInicio: '09:00',
    horarioFim: '10:00'
  });

  assert.ok(evento.recurrence[0].includes('COUNT=10'));
  assert.equal(evento.start.dateTime, '2026-08-31T09:00:00');
});

test('montarRecurrence gera EXDATE no primeiro dia e respeita bordas de início/fim da série', () => {
  const primeiroDia = montarRecurrence({
    id: 'ag-exdate-primeiro-dia',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-03',
    timeZone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    excecoesDetalhadas: [{ data: '2026-08-30', horarioInicio: '09:00' }]
  });
  assert.ok(primeiroDia.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260830T090000')));

  const umDiaAntes = montarRecurrence({
    id: 'ag-exdate-um-dia-antes',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-03',
    timeZone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    excecoesDetalhadas: [{ data: '2026-08-29', horarioInicio: '09:00' }]
  });
  assert.equal(umDiaAntes.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260829T090000')), false);

  const ultimoDia = montarRecurrence({
    id: 'ag-exdate-ultimo-dia',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-03',
    timeZone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    excecoesDetalhadas: [{ data: '2026-09-03', horarioInicio: '09:00' }]
  });
  assert.ok(ultimoDia.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260903T090000')));

  const umDiaDepois = montarRecurrence({
    id: 'ag-exdate-um-dia-depois',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-03',
    timeZone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    excecoesDetalhadas: [{ data: '2026-09-04', horarioInicio: '09:00' }]
  });
  assert.equal(umDiaDepois.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260904T090000')), false);

  const dataDivergeDaRecorrencia = montarRecurrence({
    id: 'ag-exdate-primeiro-dia-data-diverge',
    tipoRecorrencia: 'semanal',
    frequencia: 'semanal',
    diasSemana: ['Segunda', 'Terça', 'Quarta'],
    data: '2026-08-24',
    recorrenciaDataInicio: '2026-08-30',
    recorrenciaFimCondicao: 'untilDate',
    recorrenciaDataFim: '2026-09-03',
    timeZone: 'America/Sao_Paulo',
    horarioInicio: '09:00',
    excecoesDetalhadas: [{ data: '2026-08-30', horarioInicio: '09:00' }]
  });
  assert.ok(dataDivergeDaRecorrencia.some((entrada) => entrada.includes('EXDATE;TZID=America/Sao_Paulo:20260830T090000')));
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

function prepararHarnessRenovacaoCanal(opcoes = {}) {
  const originalFetch = global.fetch;
  const originalGoogleCalendar = google.calendar;
  const originalGetAccessToken = OAuth2Client.prototype.getAccessToken;
  const originalFindOne = GoogleCalendarConnection.findOne;
  const originalFindByIdAndUpdate = GoogleCalendarConnection.findByIdAndUpdate;
  const originalBloqueioFind = BloqueioExterno.find;
  const originalBloqueioFindOneAndUpdate = BloqueioExterno.findOneAndUpdate;
  const originalBloqueioFindOneAndDelete = BloqueioExterno.findOneAndDelete;
  const originalEncryptionKey = process.env.ENCRYPTION_KEY;
  const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
  const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const originalBackendUrl = process.env.BACKEND_URL;
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-gcal-key';
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
  process.env.BACKEND_URL = process.env.BACKEND_URL || 'https://example.com';

  const canario = encryptRefreshToken('token-refresh-de-teste');
  const connection = {
    _id: 'conn-123',
    ownerEmail: 'joao@example.com',
    googleEmail: 'joao@example.com',
    calendarId: 'primary',
    refreshTokenEncrypted: canario.encrypted,
    refreshTokenIv: canario.iv,
    channelId: 'old-channel-id',
    channelResourceId: 'old-channel-resource-id',
    channelExpiration: Object.prototype.hasOwnProperty.call(opcoes, 'channelExpiration')
      ? opcoes.channelExpiration
      : new Date(Date.now() + (3 * 24 * 60 * 60 * 1000)),
    syncToken: null,
    ...opcoes.connectionOverrides
  };

  const estado = {
    watchCalls: 0,
    stopCalls: 0
  };

  global.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => ({
      items: [
        ...(Array.isArray(opcoes.activeItems) ? opcoes.activeItems : []),
        ...(Array.isArray(opcoes.cancelledItems) ? opcoes.cancelledItems : [])
      ],
      nextSyncToken: 'sync-token-recuperado'
    })
  });

  GoogleCalendarConnection.findOne = async () => connection;
  GoogleCalendarConnection.findByIdAndUpdate = async (_id, update) => ({
    ...connection,
    ...update.$set,
    _id
  });
  BloqueioExterno.find = () => ({
    select: () => ({
      lean: async () => []
    })
  });
  BloqueioExterno.findOneAndUpdate = async (_query, _update) => ({
    _id: 'local-block-' + Date.now(),
    googleCalendarEventId: (_query && _query.googleCalendarEventId) || 'stubbed-external-event'
  });
  BloqueioExterno.findOneAndDelete = async () => ({
    _id: 'deleted-local-block'
  });

  google.calendar = () => ({
    events: {
      watch: async () => {
        estado.watchCalls += 1;
        return {
          data: {
            id: 'new-channel-id',
            resourceId: 'new-channel-resource-id',
            expiration: String(Date.now() + (30 * 24 * 60 * 60 * 1000))
          }
        };
      }
    },
    channels: {
      stop: async () => {
        estado.stopCalls += 1;
        if (opcoes.stopThrows) {
          throw new Error('stop failed');
        }
      }
    }
  });

  OAuth2Client.prototype.getAccessToken = async () => 'stubbed-access-token';

  return {
    connection,
    estado,
    restore: () => {
      global.fetch = originalFetch;
      google.calendar = originalGoogleCalendar;
      OAuth2Client.prototype.getAccessToken = originalGetAccessToken;
      GoogleCalendarConnection.findOne = originalFindOne;
      GoogleCalendarConnection.findByIdAndUpdate = originalFindByIdAndUpdate;
      BloqueioExterno.find = originalBloqueioFind;
      BloqueioExterno.findOneAndUpdate = originalBloqueioFindOneAndUpdate;
      BloqueioExterno.findOneAndDelete = originalBloqueioFindOneAndDelete;
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
      if (originalBackendUrl === undefined) {
        delete process.env.BACKEND_URL;
      } else {
        process.env.BACKEND_URL = originalBackendUrl;
      }
    }
  };
}

test('expiração distante → não renova, não sincroniza', async () => {
  const harness = await prepararHarnessRenovacaoCanal({
    channelExpiration: new Date(Date.now() + (3 * 24 * 60 * 60 * 1000))
  });

  try {
    const resultado = await renewWebhookChannelForOwner('joao@example.com');

    assert.equal(resultado.renewed, false);
    assert.equal(resultado.synced, false);
    assert.equal(resultado.activeItems, 0);
    assert.equal(resultado.cancelledItems, 0);
    assert.equal(harness.estado.watchCalls, 0);
    assert.equal(harness.estado.stopCalls, 0);
  } finally {
    harness.restore();
  }
});

test('expiração dentro da margem de 24h → renova e sincroniza', async () => {
  const harness = await prepararHarnessRenovacaoCanal({
    channelExpiration: new Date(Date.now() + (12 * 60 * 60 * 1000)),
    activeItems: [{ id: 'evt-1', status: 'confirmed' }, { id: 'evt-2', status: 'confirmed' }],
    cancelledItems: [{ id: 'evt-3', status: 'cancelled' }]
  });

  try {
    const resultado = await renewWebhookChannelForOwner('joao@example.com');

    assert.equal(resultado.renewed, true);
    assert.equal(resultado.synced, true);
    assert.equal(resultado.activeItems, 2);
    assert.equal(resultado.cancelledItems, 1);
    assert.equal(harness.estado.watchCalls, 1);
    assert.equal(harness.estado.stopCalls, 1);
  } finally {
    harness.restore();
  }
});

test('expiração nula → renova e sincroniza', async () => {
  const harness = await prepararHarnessRenovacaoCanal({
    channelExpiration: null,
    activeItems: [{ id: 'evt-10', status: 'confirmed' }],
    cancelledItems: []
  });

  try {
    const resultado = await renewWebhookChannelForOwner('joao@example.com');

    assert.equal(resultado.renewed, true);
    assert.equal(resultado.synced, true);
    assert.equal(resultado.activeItems, 1);
    assert.equal(harness.estado.watchCalls, 1);
  } finally {
    harness.restore();
  }
});

test('falha ao encerrar canal antigo → segue e renova mesmo assim', async () => {
  const harness = await prepararHarnessRenovacaoCanal({
    channelExpiration: new Date(Date.now() + (6 * 60 * 60 * 1000)),
    stopThrows: true,
    activeItems: [{ id: 'evt-20', status: 'confirmed' }],
    cancelledItems: []
  });

  try {
    const resultado = await renewWebhookChannelForOwner('joao@example.com');

    assert.equal(resultado.renewed, true);
    assert.equal(resultado.synced, true);
    assert.equal(harness.estado.stopCalls, 1);
    assert.equal(harness.estado.watchCalls, 1);
  } finally {
    harness.restore();
  }
});

test('duas chamadas concorrentes → um único registro de canal', async () => {
  const harness = await prepararHarnessRenovacaoCanal({
    channelExpiration: new Date(Date.now() + (10 * 60 * 60 * 1000)),
    activeItems: [{ id: 'evt-30', status: 'confirmed' }],
    cancelledItems: []
  });

  try {
    const [primeira, segunda] = await Promise.all([
      renewWebhookChannelForOwner('joao@example.com'),
      renewWebhookChannelForOwner('joao@example.com')
    ]);

    assert.equal(harness.estado.watchCalls, 1);
    assert.equal(harness.estado.stopCalls, 1);
    assert.equal(primeira.renewed, true);
    assert.equal(segunda.renewed, true);
    assert.equal(primeira.synced, true);
    assert.equal(segunda.synced, true);
  } finally {
    harness.restore();
  }
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

test('montarRecurrence aceita diasSemana sem acento, abreviado, numérico e dispara warning para inválido', () => {
  const originalWarn = console.warn;
  const avisos = [];
  console.warn = (...args) => avisos.push(args.map((arg) => String(arg)).join(' '));

  try {
    const semAcento = montarRecurrence({
      tipoRecorrencia: 'semanal',
      frequencia: 'semanal',
      diasSemana: ['Terca', 'Quinta']
    });
    const abreviado = montarRecurrence({
      tipoRecorrencia: 'semanal',
      frequencia: 'semanal',
      diasSemana: ['ter', 'qui']
    });
    const numerico = montarRecurrence({
      tipoRecorrencia: 'semanal',
      frequencia: 'semanal',
      diasSemana: [2, 4]
    });
    const invalido = montarRecurrence({
      tipoRecorrencia: 'semanal',
      frequencia: 'semanal',
      diasSemana: ['Terca', 'Banana']
    });

    assert.ok(semAcento.some((entrada) => entrada.includes('BYDAY=TU,TH')));
    assert.ok(abreviado.some((entrada) => entrada.includes('BYDAY=TU,TH')));
    assert.ok(numerico.some((entrada) => entrada.includes('BYDAY=TU,TH')));
    assert.ok(invalido.some((entrada) => entrada.includes('BYDAY=TU')));
    assert.ok(avisos.some((aviso) => aviso.includes('Dia da semana ignorado na recorrência')));
  } finally {
    console.warn = originalWarn;
  }
});
