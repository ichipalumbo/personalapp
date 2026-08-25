const test = require('node:test');
const assert = require('node:assert/strict');

const { montarExtratoDoCiclo } = require('../src/services/financasService');

function criarAluno(overrides = {}) {
  return {
    id: 'aluno-1',
    nome: 'Aluno Teste',
    objetivo: 'Treino',
    fechamentoMesCheio: true,
    metodoCobranca: 'por_aula',
    ...overrides,
  };
}

function criarReposicao(overrides = {}) {
  return {
    id: 'repos-1',
    alunoId: 'aluno-1',
    cobravel: false,
    status: 'pendente',
    dataOriginal: '2024-04-10',
    validoAte: '2024-04-30',
    ...overrides,
  };
}

function linhaPorTipo(linhas, tipo) {
  return linhas.find((linha) => linha.tipo === tipo) || null;
}

test('reposição pendente com validoAte no ciclo mostra prazo na nota', () => {
  const aluno = criarAluno();
  const ciclo = {
    alunoId: 'aluno-1',
    cicloInicio: '2024-04-01',
    cicloFim: '2024-04-30',
    precoAulaSnapshot: 100,
    aulasContadas: 0,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 0,
    metodoCobranca: 'por_aula',
  };

  const linhas = montarExtratoDoCiclo(ciclo, aluno, [], [criarReposicao()]);
  const linha = linhaPorTipo(linhas, 'reposicao_pendente');

  assert.ok(linha);
  assert.match(linha.nota, /válida até 30\/04/);
  assert.equal(linha.valorTotal, 0);
});

test('reposição pendente com validoAte nulo mantém nota antiga', () => {
  const aluno = criarAluno();
  const ciclo = {
    alunoId: 'aluno-1',
    cicloInicio: '2024-04-01',
    cicloFim: '2024-04-30',
    precoAulaSnapshot: 100,
    aulasContadas: 0,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 0,
    metodoCobranca: 'por_aula',
  };

  const linhas = montarExtratoDoCiclo(ciclo, aluno, [], [criarReposicao({ validoAte: null })]);
  const linha = linhaPorTipo(linhas, 'reposicao_pendente');

  assert.ok(linha);
  assert.equal(linha.nota, 'aguardando reagendamento; não cobrada');
  assert.equal(linha.valorTotal, 0);
});

test('invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo', () => {
  const aluno = criarAluno();
  const ciclo = {
    alunoId: 'aluno-1',
    cicloInicio: '2024-04-01',
    cicloFim: '2024-04-30',
    precoAulaSnapshot: 100,
    aulasContadas: 1,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 100,
    metodoCobranca: 'por_aula',
  };

  const agendamento = {
    alunoId: 'aluno-1',
    tipo: 'aula',
    frequencia: 'uma_vez',
    data: '2024-04-10',
  };

  const comPrazo = montarExtratoDoCiclo(ciclo, aluno, [agendamento], [criarReposicao()]);
  const semPrazo = montarExtratoDoCiclo(ciclo, aluno, [agendamento], [criarReposicao({ validoAte: null })]);

  const somaComPrazo = comPrazo.reduce((total, linha) => total + Number(linha.valorTotal || 0), 0);
  const somaSemPrazo = semPrazo.reduce((total, linha) => total + Number(linha.valorTotal || 0), 0);

  assert.equal(somaComPrazo, somaSemPrazo);
  assert.ok(somaComPrazo > 0);
});

test('reposição expirada com validoAte dentro do ciclo usa ramo expirado', () => {
  const aluno = criarAluno();
  const ciclo = {
    alunoId: 'aluno-1',
    cicloInicio: '2024-04-01',
    cicloFim: '2024-04-30',
    precoAulaSnapshot: 100,
    aulasContadas: 0,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 0,
    metodoCobranca: 'por_aula',
  };

  const linhas = montarExtratoDoCiclo(ciclo, aluno, [], [
    criarReposicao({
      id: 'repos-expirada',
      status: 'expirada',
      dataOriginal: '2024-04-15',
      validoAte: '2024-04-20',
    }),
  ]);

  const linha = linhaPorTipo(linhas, 'reposicao_expirada');
  assert.ok(linha);
  assert.match(linha.nota, /prazo expirado em 20\/04/);
});
