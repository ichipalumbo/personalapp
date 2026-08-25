const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APP_ORIGIN,
  adicionarDiasISO,
  classificarEventoDeLeitura,
  getHorarioPadraoFim,
  montarEventoGoogle,
  montarRecurrence,
  montarTituloEvento,
  resolverDataISO,
  isAppOwnedEvent,
} = require('../src/services/gcalSyncService');
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
