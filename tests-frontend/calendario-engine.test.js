// [TAG-TESTS-CALENDARIO-ENGINE] calendario-engine.test.js
// Cobre o adaptador assets/js/calendario-engine.js: guard de ordem de carga,
// fidelidade dos repasses para recurrenceHelpers e fallback do mapa de dias.

const test = require('node:test');
const assert = require('node:assert/strict');

const { carregarScripts } = require('./setup/carregar-frontend');

const RECURRENCE_HELPERS = 'assets/js/shared/recurrence-helpers.js';
const CALENDARIO_ENGINE = 'assets/js/calendario-engine.js';

function carregarEngine() {
    return carregarScripts([RECURRENCE_HELPERS, CALENDARIO_ENGINE]);
}

test('lanca erro quando carregado sem recurrence-helpers', () => {
    assert.throws(
        () => carregarScripts([CALENDARIO_ENGINE]),
        /recurrenceHelpers nao encontrado|recurrenceHelpers não encontrado/
    );
});

test('carrega sem erro quando recurrence-helpers vem antes', () => {
    const ambiente = carregarEngine();
    assert.equal(typeof ambiente.window.checarCompromissoNaData, 'function');
});

test('parseDataFlex e o mesmo objeto funcao exposto por recurrenceHelpers', () => {
    const ambiente = carregarEngine();
    assert.equal(ambiente.window.parseDataFlex, ambiente.window.recurrenceHelpers.parseDataFlex);
});

test('resolverCompromissoRecorrenteNaData e o mesmo objeto funcao exposto por recurrenceHelpers', () => {
    const ambiente = carregarEngine();
    assert.equal(
        ambiente.window.resolverCompromissoRecorrenteNaData,
        ambiente.window.recurrenceHelpers.resolverCompromissoRecorrenteNaData
    );
});

test('checarCompromissoNaData delega para recurrenceHelpers repassando os argumentos', () => {
    const ambiente = carregarEngine();
    const recebidos = [];
    ambiente.window.recurrenceHelpers.checarCompromissoNaData = (...args) => {
        recebidos.push(args);
        return 'valor-sentinela';
    };

    const comp = { id: 'a1' };
    const data = new Date(2026, 2, 16);
    const retorno = ambiente.window.checarCompromissoNaData(comp, data, '08:00');

    assert.equal(retorno, 'valor-sentinela');
    assert.equal(recebidos.length, 1);
    assert.equal(recebidos[0][0], comp);
    assert.equal(recebidos[0][1], data);
    assert.equal(recebidos[0][2], '08:00');
});

test('usa DEFAULT_DIAS_SEMANA quando window.getNomesDiasSemana nao existe', () => {
    const ambiente = carregarEngine();
    let mapaRecebido = null;
    ambiente.window.recurrenceHelpers.checarCompromissoNaData = (comp, data, hora, mapaDias) => {
        mapaRecebido = mapaDias;
        return true;
    };

    ambiente.window.checarCompromissoNaData({}, new Date(2026, 2, 16), null);

    assert.equal(mapaRecebido, ambiente.window.recurrenceHelpers.DEFAULT_DIAS_SEMANA);
});

test('usa window.getNomesDiasSemana quando a funcao existe', () => {
    const ambiente = carregarEngine();
    const mapaCustomizado = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    ambiente.getNomesDiasSemana = () => mapaCustomizado;

    let mapaRecebido = null;
    ambiente.window.recurrenceHelpers.checarCompromissoNaData = (comp, data, hora, mapaDias) => {
        mapaRecebido = mapaDias;
        return true;
    };

    ambiente.window.checarCompromissoNaData({}, new Date(2026, 2, 16), null);

    assert.deepEqual(mapaRecebido, mapaCustomizado);
});

test('ignora window.getNomesDiasSemana quando nao e funcao', () => {
    const ambiente = carregarEngine();
    ambiente.getNomesDiasSemana = ['nao', 'e', 'funcao'];

    let mapaRecebido = null;
    ambiente.window.recurrenceHelpers.checarCompromissoNaData = (comp, data, hora, mapaDias) => {
        mapaRecebido = mapaDias;
        return true;
    };

    ambiente.window.checarCompromissoNaData({}, new Date(2026, 2, 16), null);

    assert.equal(mapaRecebido, ambiente.window.recurrenceHelpers.DEFAULT_DIAS_SEMANA);
});
