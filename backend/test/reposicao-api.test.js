const test = require('node:test');
const assert = require('node:assert/strict');

const reposicaoController = require('../src/controllers/reposicaoController');
const Reposicao = require('../src/models/Reposicao');
const Aluno = require('../src/models/Aluno');
const Agendamento = require('../src/models/Agendamento');
const financasService = require('../src/services/financasService');
const { calcularAulasContadasDoCiclo } = financasService;

function criarRespostaMock() {
  const resposta = {
    statusCode: 200,
    payload: null,
    status(valor) {
      this.statusCode = valor;
      return this;
    },
    json(valor) {
      this.payload = valor;
      return this;
    },
  };
  return resposta;
}

test('POST cria reposicao com status pendente e validoAte derivado', async () => {
  const findOneOriginal = Reposicao.findOne;
  const createOriginal = Reposicao.create;
  const alunoFindOneOriginal = Aluno.findOne;
  const calcularPrazoOriginal = financasService.calcularPrazoReposicao;

  try {
    Reposicao.findOne = ({ ownerEmail, id }) => ({
      lean: async () => null,
      ownerEmail,
      id,
    });

    Aluno.findOne = async ({ ownerEmail, id }) => ({
      id,
      ownerEmail,
      objetivo: 'Treino',
      fechamentoMesCheio: true,
    });

    financasService.calcularPrazoReposicao = () => ({
      validoAte: '2026-08-31',
      pisoAplicado: true,
    });

    Reposicao.create = async (payload) => ({
      ...payload,
      status: payload.status || 'pendente',
      toObject() {
        return { ...payload, status: payload.status || 'pendente' };
      },
    });

    const req = {
      body: {
        id: 'repo-1',
        alunoId: 'aluno-1',
        alunoNome: 'Maria',
        dataOriginal: '27/07/2026',
        horarioOriginal: '08:00',
        cobravel: false,
        agendamentoOriginalId: 'ag-1',
      },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();

    await reposicaoController.criarReposicao(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.payload.status, 'pendente');
    assert.equal(res.payload.dataOriginal, '2026-07-27');
    assert.equal(res.payload.validoAte, '2026-08-31');
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.create = createOriginal;
    Aluno.findOne = alunoFindOneOriginal;
    financasService.calcularPrazoReposicao = calcularPrazoOriginal;
  }
});

test('POST rejeita payload com validoAte ou cicloCobrancaResolvido', async () => {
  const reqBase = {
    body: {
      id: 'repo-2',
      alunoId: 'aluno-1',
      alunoNome: 'Maria',
      dataOriginal: '2026-07-27',
      horarioOriginal: '08:00',
      cobravel: false,
      validoAte: '2026-08-31',
    },
    auth: { ownerEmail: 'pro@example.com' },
  };

  const res1 = criarRespostaMock();
  await reposicaoController.criarReposicao(reqBase, res1);
  assert.equal(res1.statusCode, 400);

  const res2 = criarRespostaMock();
  await reposicaoController.criarReposicao({
    ...reqBase,
    body: {
      ...reqBase.body,
      validoAte: undefined,
      cicloCobrancaResolvido: { inicio: '2026-07-01', fim: '2026-07-31' },
    },
  }, res2);
  assert.equal(res2.statusCode, 400);
});

test('PATCH move reposicao para agendada e grava agendamentoReposicaoId', async () => {
  const findOneOriginal = Reposicao.findOne;
  const findOneAndUpdateOriginal = Reposicao.findOneAndUpdate;
  const agendamentoFindOneOriginal = Agendamento.findOne;
  const resolverCicloOriginal = financasService.resolverCicloCobranca;

  try {
    Reposicao.findOne = async ({ ownerEmail, id }) => ({
      ownerEmail,
      id,
      cobravel: false,
      alunoId: 'aluno-1',
      cicloCobrancaResolvido: null,
    });
    Reposicao.findOneAndUpdate = async (query, update) => ({
      ...query,
      ...update.$set,
      status: 'agendada',
      agendamentoReposicaoId: update.$set.agendamentoReposicaoId,
      toObject() {
        return { status: 'agendada', agendamentoReposicaoId: update.$set.agendamentoReposicaoId };
      },
    });
    Agendamento.findOne = async ({ ownerEmail, id }) => ({
      ownerEmail,
      id,
      data: '2026-07-30',
    });
    Aluno.findOne = async ({ ownerEmail, id }) => ({
      ownerEmail,
      id,
      objetivo: 'Treino',
      fechamentoMesCheio: true,
    });
    financasService.resolverCicloCobranca = async () => ({
      inicio: '2026-07-01',
      fim: '2026-07-31',
    });

    const req = {
      params: { id: 'repo-3' },
      body: { status: 'agendada', agendamentoReposicaoId: 'ag-123' },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();

    await reposicaoController.atualizarReposicao(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.status, 'agendada');
    assert.equal(res.payload.agendamentoReposicaoId, 'ag-123');
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.findOneAndUpdate = findOneAndUpdateOriginal;
    Agendamento.findOne = agendamentoFindOneOriginal;
    financasService.resolverCicloCobranca = resolverCicloOriginal;
  }
});

test('PATCH com agendamentoReposicaoId inexistente responde 400', async () => {
  const findOneOriginal = Reposicao.findOne;
  const agendamentoFindOneOriginal = Agendamento.findOne;

  try {
    Reposicao.findOne = async ({ ownerEmail, id }) => ({
      ownerEmail,
      id,
      cobravel: false,
      alunoId: 'aluno-1',
      cicloCobrancaResolvido: null,
    });
    Agendamento.findOne = async () => null;

    const req = {
      params: { id: 'repo-4' },
      body: { agendamentoReposicaoId: 'ag-missing' },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();

    await reposicaoController.atualizarReposicao(req, res);

    assert.equal(res.statusCode, 400);
  } finally {
    Reposicao.findOne = findOneOriginal;
    Agendamento.findOne = agendamentoFindOneOriginal;
  }
});

test('calcularAulasContadasDoCiclo não conta agendamento com reposicaoId', () => {
  const aluno = { id: 'aluno-1', metodoCobranca: 'por_aula', preco: 100 };
  const cicloInicio = new Date(2026, 6, 1);
  const cicloFim = new Date(2026, 6, 31);

  const total = calcularAulasContadasDoCiclo(
    aluno,
    [{ alunoId: 'aluno-1', tipo: 'aula', frequencia: 'uma_vez', data: '2026-07-27', reposicaoId: 'rep-9' }],
    [],
    cicloInicio,
    cicloFim,
  );

  assert.equal(total, 0);
});

test('calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio', () => {
  const aluno = { objetivo: 'Treino', fechamentoMesCheio: true };
  const prazo = require('../src/services/financasService').calcularPrazoReposicao(aluno, '2026-07-27');

  assert.equal(prazo.validoAte, '2026-08-31');
  assert.equal(prazo.pisoAplicado, true);
});
