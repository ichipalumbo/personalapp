const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PRAZO_MINIMO_REPOSICAO_DIAS,
  calcularPrazoReposicao,
} = require('../src/services/financasService');

function criarAlunoFechamentoMesCheio(overrides = {}) {
  return {
    objetivo: 'Treino',
    fechamentoMesCheio: true,
    ...overrides,
  };
}

function criarAlunoVencimento(dia, overrides = {}) {
  return {
    objetivo: 'Treino',
    fechamentoMesCheio: false,
    diaVencimento: dia,
    ...overrides,
  };
}

function criarAlunoSemCiclo(overrides = {}) {
  return {
    objetivo: 'Treino',
    fechamentoMesCheio: false,
    diaVencimento: null,
    ...overrides,
  };
}

test('PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7', () => {
  assert.equal(PRAZO_MINIMO_REPOSICAO_DIAS, 7);
});

test('Aluno sem ciclo configurado retorna prazo nulo', () => {
  const aluno = criarAlunoSemCiclo();
  assert.deepEqual(calcularPrazoReposicao(aluno, '2024-04-10'), {
    validoAte: null,
    pisoAplicado: false,
  });
});

test('dataOriginal inválida retorna prazo nulo', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  assert.deepEqual(calcularPrazoReposicao(aluno, 'nao-e-data'), {
    validoAte: null,
    pisoAplicado: false,
  });
});

test('dataOriginal nula retorna prazo nulo', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  assert.deepEqual(calcularPrazoReposicao(aluno, null), {
    validoAte: null,
    pisoAplicado: false,
  });
});

test('Fechamento mensal: data no começo do mês usa fim do mesmo ciclo', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-04-01');
  assert.deepEqual(resultado, {
    validoAte: '2024-04-30',
    pisoAplicado: false,
  });
});

test('Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-04-28');
  assert.deepEqual(resultado, {
    validoAte: '2024-05-31',
    pisoAplicado: true,
  });
});

test('Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-04-23');
  assert.deepEqual(resultado, {
    validoAte: '2024-04-30',
    pisoAplicado: false,
  });
});

test('Fechamento mensal: data a 1 dia do fim do ciclo aplica piso', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-04-29');
  assert.deepEqual(resultado, {
    validoAte: '2024-05-31',
    pisoAplicado: true,
  });
});

test('Dia de vencimento: data no meio do ciclo usa fim do ciclo atual', () => {
  const aluno = criarAlunoVencimento(10);
  const resultado = calcularPrazoReposicao(aluno, '2024-04-11');
  assert.deepEqual(resultado, {
    validoAte: '2024-05-10',
    pisoAplicado: false,
  });
});

test('Dia de vencimento: data a 2 dias do fim do ciclo aplica piso', () => {
  const aluno = criarAlunoVencimento(10);
  const resultado = calcularPrazoReposicao(aluno, '2024-05-08');
  assert.deepEqual(resultado, {
    validoAte: '2024-06-10',
    pisoAplicado: true,
  });
});

test('Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso', () => {
  const aluno = criarAlunoVencimento(10);
  const resultado = calcularPrazoReposicao(aluno, '2024-05-03');
  assert.deepEqual(resultado, {
    validoAte: '2024-05-10',
    pisoAplicado: false,
  });
});

test('Virada de ano: piso em dezembro aponta para janeiro do ano seguinte', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-12-30');
  assert.deepEqual(resultado, {
    validoAte: '2025-01-31',
    pisoAplicado: true,
  });
});

test('Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, '2024-12-01');
  assert.deepEqual(resultado, {
    validoAte: '2024-12-31',
    pisoAplicado: false,
  });
});

test('Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const primeiro = calcularPrazoReposicao(aluno, '2024-04-28');
  const segundo = calcularPrazoReposicao(aluno, '2024-04-28');
  assert.deepEqual(primeiro, segundo);
  assert.deepEqual(segundo, {
    validoAte: '2024-05-31',
    pisoAplicado: true,
  });
});

test('Determinismo: resultado não depende da data do sistema, apenas da dataOriginal', () => {
  const aluno = criarAlunoVencimento(10);
  const resultadoA = calcularPrazoReposicao(aluno, '2024-05-08');
  const resultadoB = calcularPrazoReposicao(aluno, '2024-05-08');
  assert.deepEqual(resultadoA, resultadoB);
  assert.deepEqual(resultadoA, {
    validoAte: '2024-06-10',
    pisoAplicado: true,
  });
});

test('Aceita dataOriginal em formato Date object com a mesma regra', () => {
  const aluno = criarAlunoFechamentoMesCheio();
  const resultado = calcularPrazoReposicao(aluno, new Date('2024-04-28T12:00:00Z'));
  assert.deepEqual(resultado, {
    validoAte: '2024-05-31',
    pisoAplicado: true,
  });
});

test('Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês', () => {
  const aluno = {
    objetivo: 'Consultoria Online',
    fechamentoMesCheio: true,
  };
  assert.deepEqual(calcularPrazoReposicao(aluno, '2024-04-10'), {
    validoAte: '2024-04-30',
    pisoAplicado: false,
  });
});
