const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getHorarioPadraoFim,
  montarTituloEvento,
  resolverDataISO,
  isAppOwnedEvent,
  deveIgnorarEventoDeLeitura,
} = require('../src/services/gcalSyncService');

test('getHorarioPadraoFim usa +60 minutos em horário normal', () => {
  assert.equal(getHorarioPadraoFim({ horarioInicio: '09:30' }), '10:30');
});

test('getHorarioPadraoFim cruza para o dia seguinte na meia-noite', () => {
  assert.equal(getHorarioPadraoFim({ horarioInicio: '23:30' }), '00:30');
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
    extendedProperties: { private: { app_origin: 'corepersonal' } }
  }), true);

  assert.equal(isAppOwnedEvent({
    extendedProperties: { private: { app_origin: 'google' } }
  }), false);

  assert.equal(isAppOwnedEvent({ summary: 'Evento externo' }), false);
});

test('deveIgnorarEventoDeLeitura bloqueia app-owned cancelled sem apagar agendamento', () => {
  const eventoCanceladoDoApp = {
    status: 'cancelled',
    extendedProperties: { private: { app_origin: 'corepersonal' } }
  };

  assert.equal(deveIgnorarEventoDeLeitura(eventoCanceladoDoApp), true);
});
