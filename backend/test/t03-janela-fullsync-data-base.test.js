// [TAG-TESTES-T03] Cobertura do cartão T03 do plano de confiabilidade GCal:
// - janela do full sync ampliada para [-1 mês, +6 meses];
// - precedência canônica da data base (dataCriacao || recorrenciaDataInicio || data)
//   compartilhada entre recurrence-helpers.js e gcalSyncService.js.
const test = require('node:test');
const assert = require('node:assert/strict');

const recurrenceHelpers = require('../shared/recurrence-helpers');
const { listCalendarEvents, montarEventoGoogle } = require('../src/services/gcalSyncService');

const DIAS_EM_UM_MES = 30.44;

function diferencaEmDias(dataA, dataB) {
  return Math.abs(new Date(dataA).getTime() - new Date(dataB).getTime()) / 86400000;
}

test('T03-01: full sync consulta a janela de [-1 mês, +6 meses] no Google Calendar', async () => {
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return { ok: true, json: async () => ({ items: [] }) };
  };

  try {
    const resultado = await listCalendarEvents(
      { getAccessToken: async () => 'token-t03' },
      { ownerEmail: 'joao@example.com', calendarId: 'primary', syncToken: null }
    );

    assert.equal(urls.length, 1);
    const parametros = new URL(urls[0]).searchParams;
    const timeMin = parametros.get('timeMin');
    const timeMax = parametros.get('timeMax');
    assert.ok(timeMin && timeMax, 'a consulta de full sync precisa enviar timeMin e timeMax');

    const agora = new Date();
    const diasPassado = diferencaEmDias(agora, timeMin);
    const diasFuturo = diferencaEmDias(agora, timeMax);

    assert.ok(diasPassado >= 26 && diasPassado <= 35, `timeMin deveria ficar ~1 mês atrás, veio ${diasPassado} dias`);
    assert.ok(diasFuturo >= 175 && diasFuturo <= 190, `timeMax deveria ficar ~6 meses à frente, veio ${diasFuturo} dias`);

    assert.equal(resultado.timeMin, timeMin);
    assert.equal(resultado.timeMax, timeMax);
  } finally {
    global.fetch = originalFetch;
  }
});

test('T03-02: full sync mantém timeMin em -1 mês e não regride para +2 meses', async () => {
  const originalFetch = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(String(url));
    return { ok: true, json: async () => ({ items: [] }) };
  };

  try {
    await listCalendarEvents(
      { getAccessToken: async () => 'token-t03' },
      { ownerEmail: 'joao@example.com', calendarId: 'primary', syncToken: null }
    );

    const parametros = new URL(urls[0]).searchParams;
    const janelaEmDias = diferencaEmDias(parametros.get('timeMin'), parametros.get('timeMax'));

    assert.ok(janelaEmDias >= 200 && janelaEmDias <= 230, `janela total deveria ser ~7 meses, veio ${janelaEmDias} dias`);
    assert.ok(
      janelaEmDias > DIAS_EM_UM_MES * 3,
      'janela total confirma que o limite superior deixou de ser +2 meses'
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test('T03-03: recurrence-helpers expõe a precedência canônica dataCriacao || recorrenciaDataInicio || data', () => {
  assert.equal(typeof recurrenceHelpers.resolverDataBaseCompromisso, 'function');

  const completo = recurrenceHelpers.resolverDataBaseCompromisso({
    dataCriacao: '2026-03-15',
    recorrenciaDataInicio: '2026-04-20',
    data: '2026-05-10'
  });
  assert.deepEqual(
    [completo.getFullYear(), completo.getMonth(), completo.getDate()],
    [2026, 2, 15]
  );

  const semCriacao = recurrenceHelpers.resolverDataBaseCompromisso({
    recorrenciaDataInicio: '20/04/2026',
    data: '2026-05-10'
  });
  assert.deepEqual(
    [semCriacao.getFullYear(), semCriacao.getMonth(), semCriacao.getDate()],
    [2026, 3, 20]
  );

  const apenasData = recurrenceHelpers.resolverDataBaseCompromisso({ data: '2026-05-10' });
  assert.deepEqual(
    [apenasData.getFullYear(), apenasData.getMonth(), apenasData.getDate()],
    [2026, 4, 10]
  );

  assert.equal(recurrenceHelpers.resolverDataBaseCompromisso({}), null);
});

test('T03-04: gcalSyncService resolve a mesma data base que recurrence-helpers quando os campos divergem', () => {
  const agendamento = {
    id: 'ag-t03-4',
    tipoRecorrencia: 'anual',
    dataCriacao: '2026-03-15',
    recorrenciaDataInicio: '2026-04-20',
    data: '2026-05-10',
    horarioInicio: '08:00',
    horarioFim: '09:00'
  };

  const canonical = recurrenceHelpers.resolverDataBaseCompromisso(agendamento);
  const evento = montarEventoGoogle(agendamento);
  const rrule = (evento.recurrence || []).find((linha) => linha.startsWith('RRULE:'));

  assert.ok(rrule, 'o agendamento anual precisa gerar RRULE');
  assert.match(rrule, /BYMONTH=3;/, 'BYMONTH deve vir da dataCriacao, não de recorrenciaDataInicio');
  assert.match(rrule, /BYMONTHDAY=15/, 'BYMONTHDAY deve vir da dataCriacao, não de recorrenciaDataInicio');
  assert.deepEqual([canonical.getMonth() + 1, canonical.getDate()], [3, 15]);
});

test('T03-05: sem dataCriacao, gcalSyncService usa recorrenciaDataInicio antes de data', () => {
  const evento = montarEventoGoogle({
    id: 'ag-t03-5',
    tipoRecorrencia: 'anual',
    recorrenciaDataInicio: '20/04/2026',
    data: '2026-05-10',
    horarioInicio: '08:00',
    horarioFim: '09:00'
  });

  const rrule = (evento.recurrence || []).find((linha) => linha.startsWith('RRULE:'));
  assert.ok(rrule);
  assert.match(rrule, /BYMONTH=4;/, 'BYMONTH deve vir de recorrenciaDataInicio');
  assert.match(rrule, /BYMONTHDAY=20/, 'BYMONTHDAY deve vir de recorrenciaDataInicio');
});
