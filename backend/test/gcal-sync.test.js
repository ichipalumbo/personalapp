const test = require('node:test');
const assert = require('node:assert/strict');

const {
  APP_ORIGIN,
  adicionarDiasISO,
  classificarEventoDeLeitura,
  getHorarioPadraoFim,
  montarEventoGoogle,
  montarTituloEvento,
  resolverDataISO,
  isAppOwnedEvent,
} = require('../src/services/gcalSyncService');

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
