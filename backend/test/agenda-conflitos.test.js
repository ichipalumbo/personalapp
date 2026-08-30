const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function carregarAgendaConflitos() {
    const baseDir = path.resolve(__dirname, '..', '..');
    const context = {
        console: {
            log() {},
            info() {},
            warn() {},
            debug() {},
            error() {},
            group() {}
        },
        Date,
        JSON,
        Math,
        Array,
        Object,
        Set,
        Map,
        Number,
        String,
        Boolean,
        RegExp,
        URL,
        URLSearchParams,
        setTimeout,
        clearTimeout
    };

    context.window = context;
    context.aulas = [];
    context.window.getAluno = () => ({ nome: 'Aluno Teste' });
    context.window.converterPtBrParaISO = (valor) => {
        if (!valor || typeof valor !== 'string') return '';
        const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
        return match ? `${match[3]}-${match[2]}-${match[1]}` : valor;
    };
    context.window.getDataSelecionadaPtBr = () => '31/08/2026';
    context.log = context.console;

    const scripts = [
        'assets/js/shared/recurrence-helpers.js',
        'assets/js/calendario-engine.js',
        'assets/js/agenda-conflitos.js'
    ];

    scripts.forEach((scriptRel) => {
        const scriptPath = path.join(baseDir, scriptRel);
        const script = fs.readFileSync(scriptPath, 'utf8');
        vm.runInNewContext(script, context, { filename: scriptPath });
    });

    return context;
}

function criarSerie(overrides = {}) {
    return {
        id: 'S1',
        tipo: 'aula',
        frequencia: 'semanal',
        data: '31/08/2026',
        dia: '',
        diasSemana: ['Segunda', 'Terça', 'Quarta'],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        dataCriacao: '30/08/2026',
        recorrenciaEscopo: 'fromDate',
        recorrenciaDataInicio: '31/08/2026',
        recorrenciaFimCondicao: 'untilDate',
        recorrenciaDataFim: '01/09/2026',
        ...overrides
    };
}

function criarContinuacaoSerie(overrides = {}) {
    return {
        id: 'S2',
        tipo: 'aula',
        frequencia: 'semanal',
        data: '02/09/2026',
        dia: '',
        diasSemana: ['Segunda', 'Terça', 'Quarta'],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        dataCriacao: '30/08/2026',
        recorrenciaEscopo: 'fromDate',
        recorrenciaDataInicio: '02/09/2026',
        serieOrigemId: 'S1',
        ...overrides
    };
}

test('getCompromissoSerializadoParaConflito preserva o fim da série', () => {
    const { window } = carregarAgendaConflitos();
    const candidato = window.getCompromissoSerializadoParaConflito(criarSerie(), '31/08/2026');

    assert.equal(candidato.recorrenciaFimCondicao, 'untilDate');
    assert.equal(candidato.recorrenciaDataFim, '01/09/2026');
    assert.equal(candidato.recorrenciaQuantidadeOcorrencias, null);
});

test('candidato serializado não ocorre depois do UNTIL', () => {
    const { window } = carregarAgendaConflitos();
    const candidato = window.getCompromissoSerializadoParaConflito(criarSerie(), '31/08/2026');

    assert.equal(window.checarCompromissoNaData(candidato, new Date('2026-08-31T12:00:00')), true);
    assert.equal(window.checarCompromissoNaData(candidato, new Date('2026-09-01T12:00:00')), true);
    assert.equal(window.checarCompromissoNaData(candidato, new Date('2026-09-07T12:00:00')), false);
    assert.equal(window.checarCompromissoNaData(candidato, new Date('2026-09-14T12:00:00')), false);
});

test('série aparada não conflita com a própria continuação', () => {
    const { window } = carregarAgendaConflitos();
    const s1 = criarSerie();
    const s2 = criarContinuacaoSerie();
    window.aulas = [s1, s2];

    const candidato = window.getCompromissoSerializadoParaConflito(s1, '31/08/2026');
    const datas = window.getDatasConflitoRecorrencia(candidato, 20);
    const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, { ignorarIds: ['S1'] });

    assert.equal(conflitos.length, 0);
});

test('série sem campos de fim continua sendo tratada como infinita', () => {
    const { window } = carregarAgendaConflitos();
    const semFim = criarSerie({
        id: 'SemFim',
        recorrenciaFimCondicao: undefined,
        recorrenciaDataFim: undefined,
        recorrenciaQuantidadeOcorrencias: undefined
    });

    assert.equal(window.checarCompromissoNaData(semFim, new Date('2026-09-14T12:00:00')), true);
});
