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

test('DIAS_ALERTA_REPOSICAO usa o limite de 7 dias', () => {
    assert.equal(helpers.DIAS_ALERTA_REPOSICAO, 7);
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

test('resumoReposicoesAluno sinaliza aVencer no limite exato de 7 dias', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(7) }], 'a1');
    assert.equal(resumo.aVencer, true);
});

test('resumoReposicoesAluno nao sinaliza aVencer a partir de 8 dias', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(8) }], 'a1');
    assert.equal(resumo.aVencer, false);
});

test('resumoReposicoesAluno trata prazo ja vencido como aVencer', () => {
    const resumo = helpers.resumoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(-1) }], 'a1');
    assert.equal(resumo.diasProximaValidade, -1);
    assert.equal(resumo.aVencer, true);
});

test('resumoHistoricoReposicoesAluno devolve estado neutro para aluno sem registros', () => {
    const resumo = helpers.resumoHistoricoReposicoesAluno([], 'a1');
    assert.equal(resumo.total, 0);
    assert.deepEqual(resumo.contagens, { pendente: 0, agendada: 0, realizada: 0, expirada: 0 });
    assert.equal(resumo.severidade, 'neutro');
    assert.equal(resumo.linhaPrincipal, 'Nenhuma reposição');
    assert.equal(resumo.linhaSecundaria, 'Ver histórico');
});

test('resumoHistoricoReposicoesAluno ignora outro aluno e status desconhecido', () => {
    const resumo = helpers.resumoHistoricoReposicoesAluno([
        { alunoId: 'a2', status: 'pendente', validoAte: isoADias(1) },
        { alunoId: 'a1', status: 'cancelada', validoAte: isoADias(1) }
    ], 'a1');
    assert.equal(resumo.total, 0);
    assert.equal(resumo.severidade, 'neutro');
});

test('resumoHistoricoReposicoesAluno resume historico sem pendencia', () => {
    const resumo = helpers.resumoHistoricoReposicoesAluno([
        { alunoId: 'a1', status: 'agendada' },
        { alunoId: 'a1', status: 'realizada' },
        { alunoId: 'a1', status: 'realizada' }
    ], 'a1');
    assert.equal(resumo.severidade, 'info');
    assert.equal(resumo.linhaPrincipal, 'Histórico disponível');
    assert.equal(resumo.linhaSecundaria, '1 agendada · 2 realizadas');
});

test('resumoHistoricoReposicoesAluno trata pendencia sem prazo', () => {
    const resumo = helpers.resumoHistoricoReposicoesAluno([
        { alunoId: 'a1', status: 'pendente' },
        { alunoId: 'a1', status: 'pendente' }
    ], 'a1');
    assert.equal(resumo.severidade, 'info');
    assert.equal(resumo.linhaPrincipal, '2 pendentes');
    assert.equal(resumo.linhaSecundaria, 'Sem prazo definido');
});

test('resumoHistoricoReposicoesAluno prioriza a urgencia mais grave', () => {
    const resumo = helpers.resumoHistoricoReposicoesAluno([
        { alunoId: 'a1', status: 'pendente', validoAte: isoADias(-2) },
        { alunoId: 'a1', status: 'pendente', validoAte: isoADias(0) },
        { alunoId: 'a1', status: 'pendente', validoAte: isoADias(4) }
    ], 'a1');
    assert.equal(resumo.severidade, 'critico');
    assert.equal(resumo.linhaPrincipal, '3 pendentes');
    assert.equal(resumo.linhaSecundaria, '1 com prazo encerrado');
});

test('resumoHistoricoReposicoesAluno trata limite de 7 dias e vencimento hoje', () => {
    const noLimite = helpers.resumoHistoricoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(7) }], 'a1');
    const hoje = helpers.resumoHistoricoReposicoesAluno(
        [{ alunoId: 'a1', status: 'pendente', validoAte: isoADias(0) }], 'a1');
    assert.equal(noLimite.severidade, 'alerta');
    assert.equal(hoje.linhaSecundaria, 'Vence hoje');
});

test('agruparHistoricoReposicoes omite vazios e ordena por data e horario', () => {
    const grupos = helpers.agruparHistoricoReposicoes([
        { alunoId: 'a1', status: 'expirada', dataOriginal: '2026-09-01' },
        { alunoId: 'a1', status: 'pendente', dataOriginal: '2026-09-10', horarioOriginal: '07:00' },
        { alunoId: 'a1', status: 'pendente', dataOriginal: '2026-09-18', horarioOriginal: '08:00' },
        { alunoId: 'a1', status: 'pendente', dataOriginal: '2026-09-18', horarioOriginal: '19:00' },
        { alunoId: 'a2', status: 'pendente', dataOriginal: '2026-09-20' }
    ], 'a1');
    assert.deepEqual(grupos.map((grupo) => grupo.status), ['pendente', 'expirada']);
    assert.deepEqual(
        grupos[0].itens.map((reposicao) => `${reposicao.dataOriginal} ${reposicao.horarioOriginal}`),
        ['2026-09-18 19:00', '2026-09-18 08:00', '2026-09-10 07:00']
    );
});
