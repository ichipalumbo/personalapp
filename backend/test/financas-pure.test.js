const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calcularCicloVigente,
  calcularValorTotalCiclo,
  calcularTotalAulasCobradas,
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
