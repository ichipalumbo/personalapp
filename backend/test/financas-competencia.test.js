const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularAulasContadasDoCiclo,
  montarExtratoDoCiclo,
} = require('../src/services/financasService');

const aluno = { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 100 };
// calcularAulasContadasDoCiclo é sempre chamada em produção com Date locais (ver
// normalizarDateOnly/calcularCicloVigente); os testes replicam esse contrato.
const cicloInicio = new Date(2026, 2, 1);
const cicloFim = new Date(2026, 2, 31);
const cicloInicioISO = '2026-03-01';
const cicloFimISO = '2026-03-31';

function agendamentoAvulso(overrides) {
  return {
    alunoId: 'aluno-1',
    tipo: 'aula',
    frequencia: 'uma_vez',
    data: '2026-03-10',
    ...overrides,
  };
}

test('calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A)', () => {
  const agendamentos = [agendamentoAvulso({ reposicaoId: 'rep-1' })];
  const total = calcularAulasContadasDoCiclo(aluno, agendamentos, [], cicloInicio, cicloFim);
  assert.equal(total, 0);
});

test('calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B)', () => {
  const reposicoes = [
    {
      alunoId: 'aluno-1',
      cobravel: true,
      status: 'pendente',
      dataOriginal: '2026-03-15',
    },
  ];
  const total = calcularAulasContadasDoCiclo(aluno, [], reposicoes, cicloInicio, cicloFim);
  assert.equal(total, 1);
});

test('calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate', () => {
  const reposicaoSemResolucao = {
    alunoId: 'aluno-1',
    cobravel: false,
    status: 'pendente',
    dataOriginal: '2026-03-15',
  };
  const reposicaoResolvidaParaOutroCiclo = {
    alunoId: 'aluno-1',
    cobravel: false,
    status: 'realizada',
    cicloCobrancaResolvido: { inicio: '2026-04-01', fim: '2026-04-30' },
  };
  const reposicaoResolvidaParaEsteCiclo = {
    alunoId: 'aluno-1',
    cobravel: false,
    status: 'realizada',
    cicloCobrancaResolvido: { inicio: cicloInicioISO, fim: cicloFimISO },
  };

  assert.equal(
    calcularAulasContadasDoCiclo(aluno, [], [reposicaoSemResolucao], cicloInicio, cicloFim),
    0,
  );
  assert.equal(
    calcularAulasContadasDoCiclo(aluno, [], [reposicaoResolvidaParaOutroCiclo], cicloInicio, cicloFim),
    0,
  );
  assert.equal(
    calcularAulasContadasDoCiclo(aluno, [], [reposicaoResolvidaParaEsteCiclo], cicloInicio, cicloFim),
    1,
  );
});

test('montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo', () => {
  const ciclo = {
    cicloInicio,
    cicloFim,
    alunoId: 'aluno-1',
    metodoCobranca: 'por_aula',
    precoAulaSnapshot: 100,
    aulasContadas: 1,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 100,
  };
  const agendamentos = [agendamentoAvulso()];
  const linhas = montarExtratoDoCiclo(ciclo, aluno, agendamentos, []);
  const soma = linhas.reduce((total, linha) => total + Number(linha.valorTotal || 0), 0);
  assert.equal(soma, ciclo.valorTotalCiclo);
});

test('montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo', () => {
  const ciclo = {
    cicloInicio,
    cicloFim,
    alunoId: 'aluno-1',
    metodoCobranca: 'por_aula',
    precoAulaSnapshot: 100,
    aulasContadas: 2,
    aulasManuaisExtras: -1,
    valorTotalCiclo: 100,
  };
  const agendamentos = [
    agendamentoAvulso({ data: '2026-03-05' }),
    agendamentoAvulso({ data: '2026-03-20' }),
  ];
  const linhas = montarExtratoDoCiclo(ciclo, aluno, agendamentos, []);
  const soma = linhas.reduce((total, linha) => total + Number(linha.valorTotal || 0), 0);
  assert.equal(soma, ciclo.valorTotalCiclo);
  const linhaAjuste = linhas.find((linha) => linha.tipo === 'ajuste_manual');
  assert.ok(linhaAjuste);
  assert.equal(linhaAjuste.quantidade, -1);
});

test('montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo', () => {
  const ciclo = {
    cicloInicio,
    cicloFim,
    alunoId: 'aluno-1',
    metodoCobranca: 'por_aula',
    precoAulaSnapshot: 100,
    aulasContadas: 1,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 100,
  };
  const reposicoes = [
    {
      alunoId: 'aluno-1',
      cobravel: true,
      status: 'realizada',
      dataOriginal: '2026-03-12',
    },
  ];
  const linhas = montarExtratoDoCiclo(ciclo, aluno, [], reposicoes);
  const soma = linhas.reduce((total, linha) => total + Number(linha.valorTotal || 0), 0);
  assert.equal(soma, ciclo.valorTotalCiclo);
  const linhaOrigem = linhas.find((linha) => linha.tipo === 'reposicao_cobravel_origem');
  assert.ok(linhaOrigem);
});

test('montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha', () => {
  const ciclo = {
    cicloInicio,
    cicloFim,
    alunoId: 'aluno-1',
    metodoCobranca: 'por_aula',
    precoAulaSnapshot: 100,
    aulasContadas: 1,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 100,
  };
  const reposicoes = [
    {
      alunoId: 'aluno-1',
      cobravel: true,
      status: 'expirada',
      dataOriginal: '2026-03-12',
      validoAte: '2026-03-20',
    },
  ];
  const linhas = montarExtratoDoCiclo(ciclo, aluno, [], reposicoes);
  const linhasDaReposicao = linhas.filter((linha) =>
    linha.tipo === 'reposicao_cobravel_origem' || linha.tipo === 'reposicao_expirada',
  );
  assert.equal(linhasDaReposicao.length, 1);
  assert.equal(linhasDaReposicao[0].tipo, 'reposicao_cobravel_origem');
});
