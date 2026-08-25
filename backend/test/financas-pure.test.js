const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularCicloVigente,
  calcularValorTotalCiclo,
  calcularTotalAulasCobradas,
  filtrarHistoricoExcluindoCicloAtual,
  encerrarCicloSobrepostoSeNecessario,
} = require('../src/services/financasService');

test('calcularCicloVigente ajusta dia 31 em mês curto', () => {
  const aluno = {
    objetivo: 'Personal Trainer',
    fechamentoMesCheio: false,
    diaVencimento: 31,
    criadoEm: '2025-12-01T00:00:00',
  };

  const ciclo = calcularCicloVigente(aluno, new Date('2026-02-15T12:00:00'));

  assert.equal(ciclo.cicloInicioISO, '2026-02-01');
  assert.equal(ciclo.cicloFimISO, '2026-02-28');
});

test('calcularCicloVigente cruza o fim de ano corretamente', () => {
  const aluno = {
    objetivo: 'Personal Trainer',
    fechamentoMesCheio: false,
    diaVencimento: 15,
    criadoEm: '2026-11-01T00:00:00',
  };

  const ciclo = calcularCicloVigente(aluno, new Date('2027-01-10T12:00:00'));

  assert.equal(ciclo.cicloInicioISO, '2026-12-16');
  assert.equal(ciclo.cicloFimISO, '2027-01-15');
});

test('calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento', () => {
  const aluno = {
    objetivo: 'Personal Trainer',
    fechamentoMesCheio: true,
    diaVencimento: 10,
    criadoEm: '2025-07-05T00:00:00',
  };

  const ciclo = calcularCicloVigente(aluno, new Date('2025-08-18T12:00:00'));

  assert.equal(ciclo.cicloInicioISO, '2025-08-01');
  assert.equal(ciclo.cicloFimISO, '2025-08-31');
});

test('calcularTotalAulasCobradas respeita piso zero para ajuste negativo', () => {
  assert.equal(calcularTotalAulasCobradas(3, -10), 0);
  assert.equal(calcularTotalAulasCobradas(0, -1), 0);
});

test('calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo', () => {
  const aluno = {
    metodoCobranca: 'valor_fixo',
    valorFixoCiclo: 480,
  };

  assert.equal(calcularValorTotalCiclo(aluno, 20, 0), 480);
  assert.equal(calcularValorTotalCiclo(aluno, 0, -3), 480);
});

test('filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores', () => {
  const aluno = {
    objetivo: 'Personal Trainer',
    fechamentoMesCheio: false,
    diaVencimento: 15,
  };

  const ciclos = [
    { cicloInicio: new Date(2026, 0, 16), cicloFim: new Date(2026, 1, 15) },
    { cicloInicio: new Date(2026, 1, 16), cicloFim: new Date(2026, 2, 15) },
    { cicloInicio: new Date(2026, 2, 1), cicloFim: new Date(2026, 2, 15) },
    { cicloInicio: new Date(2026, 2, 16), cicloFim: new Date(2026, 3, 15) },
  ];

  const resultado = filtrarHistoricoExcluindoCicloAtual(aluno, new Date('2026-03-01T12:00:00'), ciclos);

  assert.equal(resultado.length, 3);
  assert.ok(resultado.every((ciclo) => ciclo.cicloInicio.toISOString().slice(0, 10) !== '2026-03-01'));
  assert.ok(resultado.some((ciclo) => ciclo.cicloInicio.toISOString().slice(0, 10) === '2026-02-16'));
  assert.ok(resultado.some((ciclo) => ciclo.cicloInicio.toISOString().slice(0, 10) === '2026-01-16'));
  assert.ok(resultado.some((ciclo) => ciclo.cicloInicio.toISOString().slice(0, 10) === '2026-03-16'));
});

test('encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo', () => {
  const cicloAnterior = {
    cicloInicio: '2026-07-17',
    cicloFim: '2026-08-16',
    status: 'em_aberto',
    dataPagamento: null,
  };

  const cicloNovo = {
    cicloInicio: new Date(2026, 7, 1),
    cicloFim: new Date(2026, 7, 31),
  };

  const resultado = encerrarCicloSobrepostoSeNecessario(cicloAnterior, cicloNovo);

  assert.equal(resultado.cicloFim, '2026-07-31');
  assert.equal(resultado.status, 'atrasado');
});
