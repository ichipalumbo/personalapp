// [TAG-TESTS-RECURRENCE-HELPERS] recurrence-helpers.test.js
// Cobre assets/js/shared/recurrence-helpers.js, o modulo isomorfico consumido
// pelo frontend (agenda) e pelo backend (financas). Divergencia aqui faz o app
// cobrar valor diferente do que mostra na agenda.

const test = require('node:test');
const assert = require('node:assert/strict');

const helpers = require('../assets/js/shared/recurrence-helpers');

const {
    DEFAULT_DIAS_SEMANA,
    parseDataFlex,
    resolverCompromissoRecorrenteNaData,
    checarCompromissoNaData,
    getDiasNoMes,
    getPrimeiroDiaSemana
} = helpers;

// 16/03/2026 e uma segunda-feira; as datas dos testes derivam dela.
const SEGUNDA_16_03 = new Date(2026, 2, 16);
const SEGUNDA_23_03 = new Date(2026, 2, 23);
const SEGUNDA_30_03 = new Date(2026, 2, 30);

test('DEFAULT_DIAS_SEMANA segue a ordem de Date.getDay()', () => {
    assert.deepEqual(DEFAULT_DIAS_SEMANA, [
        'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'
    ]);
    assert.equal(DEFAULT_DIAS_SEMANA[SEGUNDA_16_03.getDay()], 'Segunda');
});

test('parseDataFlex mantem o dia em data ISO, sem escorregar por fuso', () => {
    const data = parseDataFlex('2026-03-16');
    assert.equal(data.getFullYear(), 2026);
    assert.equal(data.getMonth(), 2);
    assert.equal(data.getDate(), 16);
});

test('parseDataFlex interpreta o formato pt-BR como dia/mes/ano', () => {
    const data = parseDataFlex('03/04/2026');
    assert.equal(data.getDate(), 3);
    assert.equal(data.getMonth(), 3);
    assert.equal(data.getFullYear(), 2026);
});

test('parseDataFlex normaliza Date para meia-noite local', () => {
    const data = parseDataFlex(new Date(2026, 2, 16, 23, 45, 30));
    assert.equal(data.getDate(), 16);
    assert.equal(data.getHours(), 0);
    assert.equal(data.getMinutes(), 0);
    assert.equal(data.getSeconds(), 0);
});

test('parseDataFlex retorna null para valor vazio ou tipo invalido', () => {
    assert.equal(parseDataFlex(null), null);
    assert.equal(parseDataFlex(''), null);
    assert.equal(parseDataFlex(undefined), null);
    assert.equal(parseDataFlex(42), null);
    assert.equal(parseDataFlex('nao-e-data'), null);
});

test('recorrencia semanal cai na mesma diaSemana da criacao', () => {
    const comp = {
        dataCriacao: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda']
    };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, SEGUNDA_23_03, 'Segunda'), true);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 2, 24), 'Terça'), false);
});

test('recorrencia semanal com intervalo 2 pula a semana intermediaria', () => {
    const comp = {
        dataCriacao: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 2,
        diasSemana: ['Segunda']
    };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, SEGUNDA_16_03, 'Segunda'), true);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, SEGUNDA_23_03, 'Segunda'), false);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, SEGUNDA_30_03, 'Segunda'), true);
});

test('recorrencia nunca resolve antes da data de criacao', () => {
    const comp = {
        dataCriacao: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda']
    };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 2, 9), 'Segunda'), false);
});

test('recorrencia diaria respeita o intervalo em dias', () => {
    const comp = { dataCriacao: '16/03/2026', tipoRecorrencia: 'diaria', intervaloRecorrencia: 3 };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 2, 19), 'Quinta'), true);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 2, 18), 'Quarta'), false);
});

test('recorrencia mensal sem diasSemana casa pelo dia do mes', () => {
    const comp = { dataCriacao: '16/03/2026', tipoRecorrencia: 'mensal', intervaloRecorrencia: 1 };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 3, 16), 'Quinta'), true);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2026, 3, 17), 'Sexta'), false);
});

test('recorrencia anual exige mesmo dia e mes', () => {
    const comp = { dataCriacao: '16/03/2026', tipoRecorrencia: 'anual', intervaloRecorrencia: 1 };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2027, 2, 16), 'Terça'), true);
    assert.equal(resolverCompromissoRecorrenteNaData(comp, new Date(2027, 3, 16), 'Sexta'), false);
});

test('recorrencia com tipo desconhecido nao resolve', () => {
    const comp = { dataCriacao: '16/03/2026', tipoRecorrencia: 'quinzenal-inventada' };
    assert.equal(resolverCompromissoRecorrenteNaData(comp, SEGUNDA_23_03, 'Segunda'), false);
});

test('checarCompromissoNaData resolve compromisso unico por data pt-BR e ISO', () => {
    assert.equal(checarCompromissoNaData({ data: '16/03/2026' }, SEGUNDA_16_03), true);
    assert.equal(checarCompromissoNaData({ data: '2026-03-16' }, SEGUNDA_16_03), true);
    assert.equal(checarCompromissoNaData({ data: '16/03/2026' }, SEGUNDA_23_03), false);
});

test('checarCompromissoNaData filtra por horario de inicio', () => {
    const comp = { data: '16/03/2026', horarioInicio: '08:00', horarioFim: '09:00' };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03, '08:00'), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03, '09:00'), false);
});

test('bloqueio de dia inteiro aparece em qualquer horario consultado', () => {
    const comp = {
        tipo: 'bloqueio',
        data: '16/03/2026',
        horarioInicio: '00:00',
        horarioFim: '23:59'
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03, '14:00'), true);
});

test('excecao remove a ocorrencia da serie naquela data', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda'],
        excecoes: ['23/03/2026']
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03), false);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_30_03), true);
});

test('serie semanal nao aparece antes da data de inicio da recorrencia', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda']
    };
    assert.equal(checarCompromissoNaData(comp, new Date(2026, 2, 9)), false);
});

test('escopo monthOfDate limita a serie ao mes da data de inicio', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        recorrenciaEscopo: 'monthOfDate',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda']
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_30_03), true);
    assert.equal(checarCompromissoNaData(comp, new Date(2026, 3, 6)), false);
});

test('fim por untilDate corta a serie depois da data limite', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda'],
        recorrenciaFimCondicao: 'untilDate',
        recorrenciaDataFim: '23/03/2026'
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_30_03), false);
});

test('fim por occurrences corta a serie depois da quantidade contratada', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda'],
        recorrenciaFimCondicao: 'occurrences',
        recorrenciaQuantidadeOcorrencias: 2
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_30_03), false);
});

test('excecao dentro do limite ainda consome uma vaga do COUNT', () => {
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['Segunda'],
        recorrenciaFimCondicao: 'occurrences',
        recorrenciaQuantidadeOcorrencias: 2,
        excecoes: ['16/03/2026']
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_16_03), false);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_30_03), false);
});

test('diasSemanaMap customizado substitui o padrao na resolucao do dia', () => {
    const mapa = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const comp = {
        frequencia: 'semanal',
        dataCriacao: '16/03/2026',
        recorrenciaDataInicio: '16/03/2026',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        diasSemana: ['seg']
    };
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03, null, mapa), true);
    assert.equal(checarCompromissoNaData(comp, SEGUNDA_23_03, null), false);
});

test('getDiasNoMes cobre mes curto e fevereiro nao bissexto', () => {
    assert.equal(getDiasNoMes(1, 2026), 28);
    assert.equal(getDiasNoMes(1, 2028), 29);
    assert.equal(getDiasNoMes(3, 2026), 30);
    assert.equal(getDiasNoMes(2, 2026), 31);
});

test('getPrimeiroDiaSemana devolve o getDay do dia 1 do mes', () => {
    assert.equal(getPrimeiroDiaSemana(2, 2026), new Date(2026, 2, 1).getDay());
});
