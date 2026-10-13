// T04 (D4=B): prévia do ajuste — GET /api/financas/:cicloId/simulacao-ajuste.
// Garante paridade com o ajuste oficial (`atualizarAjusteCiclo`) para o mesmo
// ciclo/snapshot/ajuste proposto, piso zero, valor_fixo, snapshot diferente do
// preço atual do aluno, isolamento por dono, rejeição de ciclo pago e ausência
// de qualquer gravação (somente leitura).

const test = require('node:test');
const assert = require('node:assert/strict');

const CicloFinanceiro = require('../src/models/CicloFinanceiro');
const Aluno = require('../src/models/Aluno');
const {
  simularAjusteCiclo,
  atualizarAjusteCiclo,
} = require('../src/services/financasService');

function criarCicloMock(overrides = {}) {
  return {
    _id: 'ciclo-1',
    alunoId: 'aluno-1',
    cicloInicio: '2026-09-01',
    cicloFim: '2026-09-30',
    aulasContadas: 4,
    aulasManuaisExtras: 0,
    observacaoAjuste: '',
    metodoCobranca: 'por_aula',
    precoAulaSnapshot: 60,
    valorFixoSnapshot: null,
    valorTotalCiclo: 240,
    status: 'em_aberto',
    dataPagamento: null,
    salvamentos: 0,
    save: async function () {
      this.salvamentos += 1;
      return this;
    },
    toObject() {
      return { ...this };
    },
    ...overrides,
  };
}

async function comModelos(mapeamento, executar) {
  const originais = {
    cicloFindOne: CicloFinanceiro.findOne,
    cicloCreate: CicloFinanceiro.create,
    alunoFindOne: Aluno.findOne,
  };
  const registro = { filtrosCiclo: [], criacoes: 0 };
  try {
    CicloFinanceiro.findOne = async (filtro) => {
      registro.filtrosCiclo.push(filtro);
      return mapeamento.ciclo || null;
    };
    CicloFinanceiro.create = async () => {
      registro.criacoes += 1;
      throw new Error('A simulação não pode criar ciclo.');
    };
    Aluno.findOne = async () => {
      if (mapeamento.aluno === undefined) {
        throw new Error('Aluno não deveria ser carregado quando o ciclo já está pago.');
      }
      return mapeamento.aluno;
    };
    const resultado = await executar(registro);
    return { resultado, registro };
  } finally {
    CicloFinanceiro.findOne = originais.cicloFindOne;
    CicloFinanceiro.create = originais.cicloCreate;
    Aluno.findOne = originais.alunoFindOne;
  }
}

function simular(ciclo, aluno, valor) {
  return comModelos({ ciclo, aluno }, () => simularAjusteCiclo('pro@example.com', ciclo._id, valor));
}

function aplicarOficial(ciclo, aluno, valor) {
  return comModelos(
    { ciclo, aluno },
    () => atualizarAjusteCiclo('pro@example.com', ciclo._id, { aulasManuaisExtras: valor }, new Date('2026-09-18T12:00:00')),
  );
}

test('simulação coincide com o ajuste oficial em por_aula com ajuste positivo', async () => {
  const cicloSimulado = criarCicloMock();
  const { resultado: simulacao } = await simular(cicloSimulado, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 60 }, '2');

  const cicloOficial = criarCicloMock();
  const { resultado: oficial } = await aplicarOficial(cicloOficial, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 60 }, '2');

  assert.equal(simulacao.totalAulasCobradas, 6);
  assert.equal(simulacao.valorTotalCiclo, 360);
  assert.equal(simulacao.valorTotalCiclo, oficial.valorTotalCiclo);
  assert.equal(simulacao.totalAulasCobradas, oficial.aulasContadas + oficial.aulasManuaisExtras);
  assert.equal(cicloSimulado.salvamentos, 0, 'a prévia não pode gravar o ciclo');
  assert.equal(cicloOficial.salvamentos, 1, 'o ajuste oficial grava o ciclo');
});

test('simulação coincide com o ajuste oficial em por_aula com ajuste negativo e piso zero', async () => {
  const cicloSimulado = criarCicloMock();
  const { resultado: simulacao } = await simular(cicloSimulado, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 60 }, '-10');

  const cicloOficial = criarCicloMock();
  const { resultado: oficial } = await aplicarOficial(cicloOficial, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 60 }, '-10');

  assert.equal(simulacao.totalAulasCobradas, 0);
  assert.equal(simulacao.valorTotalCiclo, 0);
  assert.equal(simulacao.valorTotalCiclo, oficial.valorTotalCiclo);
});

test('simulação coincide com o ajuste oficial em valor_fixo: total de aulas muda, valor permanece', async () => {
  const overrides = {
    metodoCobranca: 'valor_fixo',
    precoAulaSnapshot: null,
    valorFixoSnapshot: 220,
    aulasContadas: 6,
    valorTotalCiclo: 220,
  };
  const cicloSimulado = criarCicloMock(overrides);
  const { resultado: simulacao } = await simular(cicloSimulado, { id: 'aluno-1', metodoCobranca: 'valor_fixo', valorFixoCiclo: 220 }, '3');

  const cicloOficial = criarCicloMock(overrides);
  const { resultado: oficial } = await aplicarOficial(cicloOficial, { id: 'aluno-1', metodoCobranca: 'valor_fixo', valorFixoCiclo: 220 }, '3');

  assert.equal(simulacao.totalAulasCobradas, 9);
  assert.equal(simulacao.valorTotalCiclo, 220);
  assert.equal(simulacao.precoAula, null);
  assert.equal(simulacao.valorFixoCiclo, 220);
  assert.equal(simulacao.valorTotalCiclo, oficial.valorTotalCiclo);
});

test('simulação usa o snapshot do ciclo, nunca o preço atual do aluno', async () => {
  const ciclo = criarCicloMock(); // precoAulaSnapshot: 60
  const { resultado: simulacao } = await simular(ciclo, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 999 }, '1');

  assert.equal(simulacao.precoAula, 60);
  assert.equal(simulacao.valorTotalCiclo, 300, '5 aulas × R$ 60 do snapshot, não 5 × R$ 999 do aluno');
});

test('simulação é somente leitura: não grava ajuste, não persiste fallback de legado e não cria ciclo', async () => {
  const cicloLegado = criarCicloMock({ precoAulaSnapshot: null, valorTotalCiclo: 0 });
  const { resultado: simulacao, registro } = await simular(cicloLegado, { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 50 }, '0');

  assert.equal(simulacao.precoAula, 50, 'fallback de legado entra no cálculo da prévia');
  assert.equal(cicloLegado.precoAulaSnapshot, null, 'o documento original não pode ser mutado');
  assert.equal(cicloLegado.salvamentos, 0);
  assert.equal(registro.criacoes, 0, 'a simulação não pode criar ciclo');
});

test('simulação isola por dono e responde 404 para ciclo inexistente ou de outro owner', async () => {
  const { registro } = await simular(criarCicloMock(), { id: 'aluno-1' }, '1');
  assert.deepEqual(registro.filtrosCiclo, [{ _id: 'ciclo-1', ownerEmail: 'pro@example.com' }]);

  await assert.rejects(
    comModelos({ ciclo: null, aluno: { id: 'aluno-1' } }, () => simularAjusteCiclo('outro@example.com', 'ciclo-1', '1')),
    (erro) => erro && erro.statusCode === 404,
  );
});

test('simulação rejeita ciclo pago com 409 sem carregar o aluno', async () => {
  await assert.rejects(
    comModelos(
      { ciclo: criarCicloMock({ dataPagamento: '2026-09-30' }), aluno: undefined },
      () => simularAjusteCiclo('pro@example.com', 'ciclo-1', '1'),
    ),
    (erro) => erro && erro.statusCode === 409,
  );
});

test('simulação normaliza ajuste ausente ou inválido para zero (mesma regra do PATCH)', async () => {
  const { resultado: ausente } = await simular(criarCicloMock(), { id: 'aluno-1' }, undefined);
  const { resultado: invalido } = await simular(criarCicloMock(), { id: 'aluno-1' }, 'abc');

  assert.equal(ausente.aulasManuaisExtras, 0);
  assert.equal(ausente.totalAulasCobradas, 4);
  assert.equal(ausente.valorTotalCiclo, 240);
  assert.equal(invalido.aulasManuaisExtras, 0);
  assert.equal(invalido.valorTotalCiclo, 240);
});
