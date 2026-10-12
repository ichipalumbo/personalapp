// [TAG-TESTS-AGENDA-CONFLITOS] agenda-conflitos.test.js
// Fecha as lacunas de assets/js/agenda-conflitos.js apontadas no inventário T01
// (plano 2026-10-12): colisão parcial/total/adjacente, ignorarIds simples, labels,
// resumo de datas (dedupe/limite), dedupe de entrada e escopo legado monthOfDate.
// Não duplica os 5 testes de backend/test/agenda-conflitos.test.js
// (serialização, UNTIL, série aparada/continuação e ignorarIds de família).

const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const { carregarScripts } = require('./setup/carregar-frontend');

// Prefixo da ordem do index.html necessário para agenda-conflitos.js.
const SCRIPTS = [
    'backend/shared/recurrence-helpers.js',
    'assets/js/state.js',
    'assets/js/utils-datetime.js',
    'assets/js/alunos-helpers.js',
    'assets/js/calendario-engine.js',
    'assets/js/agenda-conflitos.js',
];

// `aulas` e `alunos` são lexicais do state.js — entram por script no contexto.
function criarAmbienteConflitos({ aulas = [], alunos = [] } = {}) {
    const ambiente = carregarScripts(SCRIPTS);
    vm.runInContext(
        `aulas = ${JSON.stringify(aulas)};\nalunos = ${JSON.stringify(alunos)};`,
        ambiente
    );
    return ambiente;
}

const DATA_ALVO_PT_BR = '31/08/2026'; // segunda-feira

function dataAlvo() {
    return new Date(2026, 7, 31, 12, 0, 0);
}

function aulaUnica(overrides = {}) {
    return {
        id: 'aula-1',
        tipo: 'aula',
        alunoId: 'aluno-1',
        frequencia: 'uma_vez',
        data: DATA_ALVO_PT_BR,
        excecoes: [],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        ...overrides,
    };
}

const ALUNO_ANA = { id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo' };

test('colisão parcial e total conflitam; evento adjacente não', () => {
    const ambiente = criarAmbienteConflitos({
        aulas: [
            aulaUnica({ id: 'parcial', horarioInicio: '09:30', horarioFim: '10:30' }),
            aulaUnica({ id: 'total', horarioInicio: '09:15', horarioFim: '09:45' }),
            aulaUnica({ id: 'adjacente-depois', horarioInicio: '10:00', horarioFim: '11:00' }),
            aulaUnica({ id: 'adjacente-antes', horarioInicio: '08:00', horarioFim: '09:00' }),
        ],
        alunos: [ALUNO_ANA],
    });

    const conflitos = ambiente.window.getConflitosNoDia(aulaUnica({ id: 'candidato' }), dataAlvo());

    // Array.from: arrays do contexto vm têm protótipo próprio e quebram o deepStrictEqual.
    assert.deepEqual(
        Array.from(conflitos, (c) => c.id),
        ['parcial', 'total'],
        'fim igual ao início (dos dois lados) não é colisão',
    );
    assert.deepEqual({ ...conflitos[0] }, {
        id: 'parcial',
        data: '31/08/2026',
        faixa: '09:30 - 10:30',
        nome: 'Ana',
    });
});

test('ignorarIds remove o evento indicado da checagem', () => {
    const ambiente = criarAmbienteConflitos({
        aulas: [
            aulaUnica({ id: 'parcial', horarioInicio: '09:30', horarioFim: '10:30' }),
            aulaUnica({ id: 'total', horarioInicio: '09:15', horarioFim: '09:45' }),
        ],
        alunos: [ALUNO_ANA],
    });

    const conflitos = ambiente.window.getConflitosNoDia(aulaUnica({ id: 'candidato' }), dataAlvo(), {
        ignorarIds: ['parcial'],
    });

    assert.deepEqual(Array.from(conflitos, (c) => c.id), ['total']);
});

test('labels dos conflitos: nome do aluno, fallbacks e evento externo', () => {
    const ambiente = criarAmbienteConflitos({
        aulas: [
            aulaUnica({ id: 'l-aluno', alunoId: 'aluno-1' }),
            aulaUnica({ id: 'l-aula-sem-aluno', alunoId: 'inexistente' }),
            aulaUnica({ id: 'l-externo', tipo: 'bloqueio', source: 'google_external', descricao: 'Consulta' }),
            aulaUnica({ id: 'l-externo-sem-desc', tipo: 'bloqueio', source: 'google_external' }),
            aulaUnica({ id: 'l-bloqueio', tipo: 'bloqueio', alunoId: 'sem-aluno', descricao: 'Almoço' }),
            aulaUnica({ id: 'l-sem-desc', tipo: 'bloqueio', alunoId: 'sem-aluno' }),
        ],
        alunos: [ALUNO_ANA],
    });

    const conflitos = ambiente.window.getConflitosNoDia(aulaUnica({ id: 'candidato' }), dataAlvo());
    const nomePorId = Object.fromEntries(conflitos.map((c) => [c.id, c.nome]));

    assert.deepEqual(nomePorId, {
        'l-aluno': 'Ana',
        'l-aula-sem-aluno': 'Aula',
        'l-externo': 'Consulta [Google Agenda]',
        'l-externo-sem-desc': 'Evento externo [Google Agenda]',
        'l-bloqueio': 'Almoço',
        'l-sem-desc': 'Compromisso',
    });
});

test('aulas não-array: nenhuma colisão é reportada', () => {
    const ambiente = criarAmbienteConflitos();
    vm.runInContext('aulas = null;', ambiente);

    assert.deepEqual(
        Array.from(ambiente.window.getConflitosNoDia(aulaUnica({ id: 'candidato' }), dataAlvo())),
        [],
    );
});

test('gerarResumoConflitosDatas deduplica datas mantendo a ordem', () => {
    const ambiente = criarAmbienteConflitos();

    const resumo = ambiente.window.gerarResumoConflitosDatas([
        { data: '31/08/2026' },
        { data: '31/08/2026' },
        { data: '01/09/2026' },
        { data: '31/08/2026' },
    ]);

    assert.equal(resumo, 'seg., 31/08, ter., 01/09');
});

test('gerarResumoConflitosDatas limita a seis datas e resume o resto com "e mais N"', () => {
    const ambiente = criarAmbienteConflitos();
    const datas = [
        '25/08/2026', '26/08/2026', '27/08/2026', '28/08/2026', '29/08/2026',
        '30/08/2026', '31/08/2026', '01/09/2026', '02/09/2026',
    ];

    const resumo = ambiente.window.gerarResumoConflitosDatas(datas.map((d) => ({ data: d })));
    const previewEsperado = datas
        .slice(0, 6)
        .map((d) => ambiente.window.formatarDataPtBrLegivel(d))
        .join(', ');

    assert.equal(resumo, `${previewEsperado} e mais 3`);
});

test('gerarResumoConflitosDatas devolve vazio para entrada vazia ou sem data válida', () => {
    const ambiente = criarAmbienteConflitos();

    assert.equal(ambiente.window.gerarResumoConflitosDatas(null), '');
    assert.equal(ambiente.window.gerarResumoConflitosDatas([]), '');
    assert.equal(ambiente.window.gerarResumoConflitosDatas([{ faixa: 'x' }, null, { data: '' }]), '');
});

test('getConflitosRecorrenciaEmDatas deduplica as datas de entrada', () => {
    const ambiente = criarAmbienteConflitos({
        aulas: [aulaUnica({ id: 'parcial', horarioInicio: '09:30', horarioFim: '10:30' })],
        alunos: [ALUNO_ANA],
    });

    const conflitos = ambiente.window.getConflitosRecorrenciaEmDatas(
        aulaUnica({ id: 'candidato' }),
        ['31/08/2026', '31/08/2026', '31/08/2026', '01/09/2026'],
    );

    assert.equal(conflitos.length, 1, 'entradas repetidas viram uma avaliação; data sem ocorrência não conflita');
    assert.equal(conflitos[0].id, 'parcial');
});

test('getDatasConflitoRecorrencia: escopo legado monthOfDate corta no fim do mês de início', () => {
    const ambiente = criarAmbienteConflitos();

    const serie = {
        id: 'serie-a',
        tipo: 'aula',
        alunoId: 'aluno-1',
        frequencia: 'semanal',
        data: '10/08/2026',
        diasSemana: ['Segunda'],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        tipoRecorrencia: 'semanal',
        intervaloRecorrencia: 1,
        recorrenciaEscopo: 'monthOfDate',
        recorrenciaDataInicio: '10/08/2026',
    };

    const datas = ambiente.window.getDatasConflitoRecorrencia(serie, 20);
    assert.deepEqual(Array.from(datas), ['10/08/2026', '17/08/2026', '24/08/2026', '31/08/2026']);

    const semLegado = { ...serie, recorrenciaEscopo: 'fromDate' };
    const datasSeguem = ambiente.window.getDatasConflitoRecorrencia(semLegado, 5);
    assert.equal(datasSeguem.length, 5);
    assert.equal(datasSeguem[4], '07/09/2026', 'sem o escopo legado a série atravessa o mês');
});
