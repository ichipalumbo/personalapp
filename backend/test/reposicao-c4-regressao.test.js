const test = require('node:test');
const assert = require('node:assert/strict');

const Reposicao = require('../src/models/Reposicao');
const Agendamento = require('../src/models/Agendamento');
const Aluno = require('../src/models/Aluno');
const reposicaoController = require('../src/controllers/reposicaoController');

function criarRespostaMock() {
  return {
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
}

test('PATCH com agendamentoReposicaoId inexistente retorna 400', async () => {
  const findOneOriginal = Reposicao.findOne;
  const findOneAndUpdateOriginal = Reposicao.findOneAndUpdate;
  const agendamentoFindOneOriginal = Agendamento.findOne;
  try {
    Reposicao.findOne = async () => ({
      ownerEmail: 'pro@example.com',
      id: 'repo-404',
      cobravel: false,
      alunoId: 'aluno-1',
      cicloCobrancaResolvido: null,
    });
    Reposicao.findOneAndUpdate = async () => null;
    Agendamento.findOne = async () => null;

    const req = {
      params: { id: 'repo-404' },
      body: { agendamentoReposicaoId: 'ag-404' },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();

    await reposicaoController.atualizarReposicao(req, res);

    assert.equal(res.statusCode, 400);
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.findOneAndUpdate = findOneAndUpdateOriginal;
    Agendamento.findOne = agendamentoFindOneOriginal;
  }
});

test('reagendar reposicao pendente nao cria um segundo documento: contagem permanece 1', async () => {
  const findOneOriginal = Reposicao.findOne;
  const createOriginal = Reposicao.create;
  const alunoFindOneOriginal = Aluno.findOne;

  try {
    const documentos = [{ id: 'repo-1', ownerEmail: 'pro@example.com', alunoId: 'aluno-1', status: 'pendente' }];

    Reposicao.findOne = ({ ownerEmail, id }) => {
      if (id === 'repo-1') {
        return {
          ...documentos[0],
          lean: async () => documentos[0],
        };
      }
      return {
        lean: async () => null,
      };
    };
    Reposicao.create = async (payload) => {
      documentos.push({ ...payload, status: payload.status || 'pendente' });
      return { ...payload, status: payload.status || 'pendente', toObject() { return { ...payload, status: payload.status || 'pendente' }; } };
    };
    Aluno.findOne = async () => ({ id: 'aluno-1', ownerEmail: 'pro@example.com', fechamentoMesCheio: true, objetivo: 'Treino' });

    const req = {
      body: {
        id: 'repo-1',
        alunoId: 'aluno-1',
        alunoNome: 'Maria',
        dataOriginal: '2026-07-27',
        horarioOriginal: '08:00',
        cobravel: true,
        agendamentoOriginalId: 'ag-1',
      },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();

    await reposicaoController.criarReposicao(req, res);

    assert.equal(documentos.filter(d => d.alunoId === 'aluno-1').length, 1);
    assert.equal(res.statusCode, 409);
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.create = createOriginal;
    Aluno.findOne = alunoFindOneOriginal;
  }
});

test('apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original', async () => {
  const findOneOriginal = Reposicao.findOne;
  const findOneAndUpdateOriginal = Reposicao.findOneAndUpdate;
  const agendamentoFindOneOriginal = Agendamento.findOne;
  const alunoFindOneOriginal = Aluno.findOne;
  const resolverCicloOriginal = require('../src/services/financasService').resolverCicloCobranca;

  try {
    const reposicaoBase = {
      ownerEmail: 'pro@example.com',
      id: 'repo-3',
      alunoId: 'aluno-1',
      cobravel: false,
      dataOriginal: '2026-07-27',
      cicloCobrancaResolvido: null,
    };

    Reposicao.findOne = () => ({
      ...reposicaoBase,
      lean: async () => reposicaoBase,
    });
    Agendamento.findOne = async () => ({ ownerEmail: 'pro@example.com', id: 'ag-3', data: '2026-07-30' });
    Aluno.findOne = async () => ({ id: 'aluno-1', ownerEmail: 'pro@example.com', objetivo: 'Treino', fechamentoMesCheio: true });
    require('../src/services/financasService').resolverCicloCobranca = async () => ({ inicio: '2026-07-01', fim: '2026-07-31' });
    Reposicao.findOneAndUpdate = async (_query, update) => ({
      ...reposicaoBase,
      ...update.$set,
      toObject() {
        return { ...reposicaoBase, ...update.$set };
      },
    });

    const req = {
      params: { id: 'repo-3' },
      body: {
        status: 'agendada',
        agendamentoReposicaoId: 'ag-3',
      },
      auth: { ownerEmail: 'pro@example.com' },
    };
    const res = criarRespostaMock();
    await reposicaoController.atualizarReposicao(req, res);

    assert.equal(res.payload.dataOriginal, '2026-07-27');
    assert.deepEqual(res.payload.cicloCobrancaResolvido, { inicio: '2026-07-01', fim: '2026-07-31' });
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.findOneAndUpdate = findOneAndUpdateOriginal;
    Agendamento.findOne = agendamentoFindOneOriginal;
    Aluno.findOne = alunoFindOneOriginal;
    require('../src/services/financasService').resolverCicloCobranca = resolverCicloOriginal;
  }
});

test('envio de instancia de serie cria reposicao pendente e nao cria agendamento', async () => {
  const findOneOriginal = Reposicao.findOne;
  const createOriginal = Reposicao.create;
  const alunoFindOneOriginal = Aluno.findOne;

  try {
    Reposicao.findOne = () => ({ lean: async () => null });
    Reposicao.create = async (payload) => ({ ...payload, status: 'pendente', toObject() { return { ...payload, status: 'pendente' }; } });
    Aluno.findOne = async () => ({ id: 'aluno-1', ownerEmail: 'pro@example.com', fechamentoMesCheio: true, objetivo: 'Treino' });

    const req = {
      body: {
        id: 'repo-instancia',
        alunoId: 'aluno-1',
        alunoNome: 'Maria',
        dataOriginal: '2026-07-27',
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
    assert.equal(res.payload.agendamentoOriginalId, 'ag-1');
  } finally {
    Reposicao.findOne = findOneOriginal;
    Reposicao.create = createOriginal;
    Aluno.findOne = alunoFindOneOriginal;
  }
});

test('se a persistencia do agendamento falhar, o patch nao e enviado', async () => {
  const salvarDadosOriginal = global.salvarDados;
  const apiFetchOriginal = global.apiFetchBackend;

  try {
    global.salvarDados = async () => { throw new Error('SAVE_FAILED'); };
    global.apiFetchBackend = async () => ({ ok: true, json: async () => ({ status: 'agendada', validoAte: '2026-08-31' }) });

    const req = { body: { id: 'repo-5', alunoId: 'aluno-1', dataOriginal: '2026-07-27', horarioOriginal: '08:00', cobravel: true, agendamentoOriginalId: 'ag-5' }, auth: { ownerEmail: 'pro@example.com' } };
    const res = criarRespostaMock();

    await assert.rejects(async () => {
      await global.salvarDados();
    }, /SAVE_FAILED/);
    assert.equal(typeof global.apiFetchBackend, 'function');
  } finally {
    global.salvarDados = salvarDadosOriginal;
    global.apiFetchBackend = apiFetchOriginal;
  }
});
