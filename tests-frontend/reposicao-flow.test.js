// [TAG-TESTS-REPOSICAO-FLOW] reposicao-flow.test.js
// Cobre backend/shared/reposicao-flow-helpers.js: a regra de alerta "a vencer"
// (limite de dias e resumo por aluno) usada pelo card do aluno e pelo painel
// de pendentes. Divergencia aqui faz os avisos mostrarem prazo diferente da regra.

const test = require('node:test');
const assert = require('node:assert/strict');

const helpers = require('../backend/shared/reposicao-flow-helpers');

// Monta uma data ISO (YYYY-MM-DD) em dias de hoje, para o teste ser independente da data de execução.
function isoADias(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0')
    ].join('-');
}

test('DIAS_ALERTA_REPOSICAO usa o limite de 5 dias', () => {
    assert.equal(helpers.DIAS_ALERTA_REPOSICAO, 5);
});

test('diasAteDataISO conta os dias de hoje até a data ISO', () => {
    assert.equal(helpers.diasAteDataISO(isoADias(0)), 0);
    assert.equal(helpers.diasAteDataISO(isoADias(3)), 3);
    assert.equal(helpers.diasAteDataISO(isoADias(-2)), -2);
});

test('diasAteDataISO devolve null para entrada inválida', () => {
    assert.equal(helpers.diasAteDataISO('nao-e-data'), null);
    assert.equal(helpers.diasAteDataISO(''), null);
    assert.equal(helpers.diasAteDataISO(null), null);
    assert.equal(helpers.diasAteDataISO(undefined), null);
});

test('resumoReposicoesAluno devolve null quando nao ha pendentes com prazo no aluno', () => {
    assert.equal(helpers.resumoReposicoesAluno([], 'a1'), null);
    assert.equal(helpers.resumoReposicoesAluno(
        [{ alunoId: 'outro', status: 'pendente', validoAte: isoADias(1) }], 'a1'), null);
    assert.equal(helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'agendada', validoAte: isoADias(1) }], 'a1'), null);
    assert.equal(helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente' }], 'a1'), null);
});

test('resumoReposicoesAluno agrega somente o aluno, filtra status e usa a validade mais proxima', () => {
    const lista = [
        { alunoId: 'a1', status: 'pendente', validoAte: isoADias(3) },
        { alunoId: 'a1', status: 'pendente', validoAte: isoADias(9) },
        { alunoId: 'a1', status: 'agendada', validoAte: isoADias(1) },
        { alunoId: 'a1', status: 'pendente' },
        { alunoId: 'a2', status: 'pendente', validoAte: isoADias(1) }
    ];
    assert.deepEqual(helpers.resumoReposicoesAluno(lista, 'a1'), {
        total: 2,
        diasProximaValidade: 3,
        aVencer: true
    });
    assert.deepEqual(helpers.resumoReposicoesAluno(lista, 'a2'), {
        total: 1,
        diasProximaValidade: 1,
        aVencer: true
    });
    assert.deepEqual(helpers.resumoReposicoesAluno(lista, 'a3'), null);
});

test('resumoReposicoesAluno sinaliza aVencer no limite exato de 5 dias', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(5) }], 'a1');
    assert.equal(resumo.aVencer, true);
});

test('resumoReposicoesAluno nao sinaliza aVencer a partir de 6 dias', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(6) }], 'a1');
    assert.equal(resumo.aVencer, false);
});

test('resumoReposicoesAluno trata prazo ja vencido como aVencer', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(-1) }], 'a1');
    assert.equal(resumo.diasProximaValidade, -1);
    assert.equal(resumo.aVencer, true);
});
