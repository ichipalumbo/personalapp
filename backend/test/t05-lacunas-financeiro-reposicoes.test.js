const test = require('node:test');
const assert = require('node:assert/strict');

const Aluno = require('../src/models/Aluno');
const Agendamento = require('../src/models/Agendamento');
const CicloFinanceiro = require('../src/models/CicloFinanceiro');
const Reposicao = require('../src/models/Reposicao');

const {
  listarFinancasDoOwner,
  obterHistoricoFinancasPorAluno,
  recalcularStatusCiclo,
} = require('../src/services/financasService');

const {
  obterMensagemFalhaPersistencia,
  agruparHistoricoReposicoes,
  resumoHistoricoReposicoesAluno,
} = require('../shared/reposicao-flow-helpers');

const OWNER = 'pro@example.com';
const HOJE = new Date(2026, 8, 1, 12); // ciclo vigente do aluno com diaVencimento 15
const CICLO_VIGENTE_INICIO = '2026-08-16';

function aluno(overrides) {
  return {
    id: 'aluno-1',
    objetivo: 'Personal Trainer',
    fechamentoMesCheio: false,
    diaVencimento: 15,
    metodoCobranca: 'por_aula',
    preco: 100,
    criadoEm: '2026-01-01T00:00:00',
    ...overrides,
  };
}

// Instala stubs nos models e devolve as chamadas registradas. Sempre usar dentro de
// try/finally com `restaurar()` — a suíte compartilha os models do processo.
function instalarStubs({
  alunos = [],
  ciclosHistorico = [],
  alunoEncontrado = null,
  dataPagamentoPorAluno = {},
  historicoPorAluno = {},
} = {}) {
  const chamadas = {
    aluno: [],
    alunoFindOne: [],
    agendamento: [],
    reposicao: [],
    cicloFind: [],
    cicloFindOne: [],
    cicloCount: [],
  };
  const original = {
    alunoFind: Aluno.find,
    alunoFindOne: Aluno.findOne,
    agendamentoFind: Agendamento.find,
    reposicaoFind: Reposicao.find,
    cicloFind: CicloFinanceiro.find,
    cicloFindOne: CicloFinanceiro.findOne,
    cicloCreate: CicloFinanceiro.create,
    cicloCount: CicloFinanceiro.countDocuments,
  };

  function documentoCiclo(filtro) {
    return {
      alunoId: filtro.alunoId,
      cicloInicio: CICLO_VIGENTE_INICIO,
      cicloFim: '2026-09-15',
      aulasContadas: 0,
      aulasManuaisExtras: 0,
      valorTotalCiclo: 0,
      metodoCobranca: 'por_aula',
      precoAulaSnapshot: 100,
      status: 'em_aberto',
      dataPagamento: dataPagamentoPorAluno[filtro.alunoId] || null,
      salvamentos: 0,
      save: async function salvar() {
        this.salvamentos += 1;
        return this;
      },
      toObject() {
        const copia = { ...this };
        delete copia.save;
        delete copia.toObject;
        return copia;
      },
    };
  }

  Aluno.find = async (filtro) => {
    chamadas.aluno.push(filtro);
    return alunos;
  };
  Aluno.findOne = async (filtro) => {
    chamadas.alunoFindOne.push(filtro);
    return alunoEncontrado;
  };
  Agendamento.find = async (filtro) => {
    chamadas.agendamento.push(filtro);
    return [];
  };
  Reposicao.find = async (filtro) => {
    chamadas.reposicao.push(filtro);
    return [];
  };
  // obterOuCriarCicloVigente filtra ciclos abertos por dataPagamento; o histórico
  // filtra só por ownerEmail + alunoId.
  CicloFinanceiro.find = (filtro) => {
    chamadas.cicloFind.push(filtro);
    const ehBuscaDeCiclosAbertos = Object.prototype.hasOwnProperty.call(
      filtro,
      'dataPagamento',
    );
    return { sort: async () => (ehBuscaDeCiclosAbertos ? [] : ciclosHistorico) };
  };
  CicloFinanceiro.findOne = async (filtro) => {
    chamadas.cicloFindOne.push(filtro);
    return documentoCiclo(filtro);
  };
  CicloFinanceiro.create = async (payload) => documentoCiclo(payload);
  CicloFinanceiro.countDocuments = async (filtro, opcoes) => {
    chamadas.cicloCount.push({ filtro, opcoes });
    return historicoPorAluno[filtro.alunoId] || 0;
  };

  return {
    chamadas,
    restaurar() {
      Aluno.find = original.alunoFind;
      Aluno.findOne = original.alunoFindOne;
      Agendamento.find = original.agendamentoFind;
      Reposicao.find = original.reposicaoFind;
      CicloFinanceiro.find = original.cicloFind;
      CicloFinanceiro.findOne = original.cicloFindOne;
      CicloFinanceiro.create = original.cicloCreate;
      CicloFinanceiro.countDocuments = original.cicloCount;
    },
  };
}

test('T05 — listarFinancasDoOwner filtra todas as coleções por ownerEmail e exclui Consultoria Online', async () => {
  const stubs = instalarStubs({
    alunos: [
      aluno({ id: 'aluno-1' }),
      aluno({ id: 'aluno-consultoria', objetivo: 'Consultoria Online' }),
    ],
  });

  try {
    const cards = await listarFinancasDoOwner(OWNER, HOJE);

    assert.equal(cards.length, 1, 'Consultoria Online não deve gerar card');
    assert.equal(cards[0].alunoId, 'aluno-1');
    assert.deepEqual(stubs.chamadas.aluno, [{ ownerEmail: OWNER, status: 'ativo' }]);
    assert.deepEqual(stubs.chamadas.agendamento, [{ ownerEmail: OWNER }]);
    assert.deepEqual(stubs.chamadas.reposicao, [{ ownerEmail: OWNER }]);
    for (const filtro of stubs.chamadas.cicloFind) {
      assert.equal(filtro.ownerEmail, OWNER);
    }
    for (const filtro of stubs.chamadas.cicloFindOne) {
      assert.equal(filtro.ownerEmail, OWNER);
    }
    for (const chamada of stubs.chamadas.cicloCount) {
      assert.equal(chamada.filtro.ownerEmail, OWNER);
      assert.equal(chamada.filtro.alunoId, 'aluno-1');
    }
  } finally {
    stubs.restaurar();
  }
});

test('T05 — listarFinancasDoOwner marca configuracaoPendente sem consultar o ciclo do aluno', async () => {
  const stubs = instalarStubs({
    alunos: [aluno({ id: 'aluno-sem-vencimento', diaVencimento: null })],
  });

  try {
    const cards = await listarFinancasDoOwner(OWNER, HOJE);

    assert.equal(cards.length, 1);
    assert.equal(cards[0].configuracaoPendente, true);
    assert.equal(cards[0].cicloAtual, null);
    assert.equal(cards[0].historicoDisponivel, false);
    assert.equal(stubs.chamadas.cicloFindOne.length, 0);
    assert.equal(stubs.chamadas.cicloCount.length, 0);
  } finally {
    stubs.restaurar();
  }
});

test('T05 — listarFinancasDoOwner sinaliza histórico com countDocuments (limit 1) e ordena por status', async () => {
  const stubs = instalarStubs({
    alunos: [
      aluno({ id: 'aluno-pago' }),
      aluno({ id: 'aluno-em-aberto' }),
      aluno({ id: 'aluno-pendente', diaVencimento: null }),
    ],
    dataPagamentoPorAluno: { 'aluno-pago': '2026-08-20' },
    historicoPorAluno: { 'aluno-em-aberto': 2, 'aluno-pago': 0 },
  });

  try {
    const cards = await listarFinancasDoOwner(OWNER, HOJE);

    assert.deepEqual(
      cards.map((card) => card.alunoId),
      ['aluno-em-aberto', 'aluno-pago', 'aluno-pendente'],
    );
    assert.deepEqual(
      cards.map((card) => card.cicloAtual && card.cicloAtual.status),
      ['em_aberto', 'pago', null],
    );
    assert.deepEqual(
      cards.map((card) => card.historicoDisponivel),
      [true, false, false],
    );
    assert.equal(stubs.chamadas.cicloCount.length, 2);
    for (const chamada of stubs.chamadas.cicloCount) {
      assert.deepEqual(chamada.opcoes, { limit: 1 });
      assert.deepEqual(chamada.filtro.cicloInicio, { $ne: CICLO_VIGENTE_INICIO });
    }
  } finally {
    stubs.restaurar();
  }
});

test('T05 — obterHistoricoFinancasPorAluno devolve [] sem consultar o aluno quando não há ciclos', async () => {
  const stubs = instalarStubs({ ciclosHistorico: [] });

  try {
    const historico = await obterHistoricoFinancasPorAluno(OWNER, 'aluno-1', HOJE);

    assert.deepEqual(historico, []);
    assert.equal(stubs.chamadas.alunoFindOne.length, 0);
    assert.deepEqual(stubs.chamadas.cicloFind, [{ ownerEmail: OWNER, alunoId: 'aluno-1' }]);
  } finally {
    stubs.restaurar();
  }
});

test('T05 — obterHistoricoFinancasPorAluno devolve [] quando o aluno não pertence ao escopo', async () => {
  const stubs = instalarStubs({
    ciclosHistorico: [{ cicloInicio: '2026-07-16', cicloFim: '2026-08-15' }],
    alunoEncontrado: null,
  });

  try {
    const historico = await obterHistoricoFinancasPorAluno(OWNER, 'aluno-1', HOJE);

    assert.deepEqual(historico, []);
    assert.deepEqual(stubs.chamadas.alunoFindOne, [{ ownerEmail: OWNER, id: 'aluno-1' }]);
  } finally {
    stubs.restaurar();
  }
});

test('T05 — obterHistoricoFinancasPorAluno exclui o ciclo vigente e recalcula o status do ciclo pago', async () => {
  // ciclos vêm do Mongo com Date nas datas; o filtro de histórico compara com
  // toISODateOnly, que só respeita o fuso quando recebe Date.
  const inicioVigente = new Date(2026, 7, 16);
  const cicloVigente = {
    alunoId: 'aluno-1',
    cicloInicio: inicioVigente,
    cicloFim: new Date(2026, 8, 15),
    status: 'em_aberto',
    dataPagamento: null,
  };
  const inicioAnterior = new Date(2026, 6, 16);
  const cicloAnterior = {
    alunoId: 'aluno-1',
    cicloInicio: inicioAnterior,
    cicloFim: new Date(2026, 7, 15),
    status: 'em_aberto',
    dataPagamento: '2026-07-20',
    extrato: { linhas: [], totalAulasCobradas: 0, valorTotalCiclo: 0 },
    salvamentos: 0,
    save: async function salvar() {
      this.salvamentos += 1;
      return this;
    },
    toObject() {
      const copia = { ...this };
      delete copia.save;
      delete copia.toObject;
      return copia;
    },
  };

  const stubs = instalarStubs({
    ciclosHistorico: [cicloVigente, cicloAnterior],
    alunoEncontrado: aluno({ id: 'aluno-1' }),
  });

  try {
    const historico = await obterHistoricoFinancasPorAluno(OWNER, 'aluno-1', HOJE);

    assert.equal(historico.length, 1, 'o ciclo vigente não entra no histórico');
    assert.equal(historico[0].cicloInicio, inicioAnterior);
    assert.equal(historico[0].status, 'pago');
    assert.equal(cicloAnterior.salvamentos, 1);
    assert.deepEqual(historico[0].extrato, cicloAnterior.extrato);
  } finally {
    stubs.restaurar();
  }
});

test('T05 — recalcularStatusCiclo: pago, atrasado, em aberto e null', () => {
  assert.equal(recalcularStatusCiclo(null, HOJE), null);

  const pago = { cicloFim: '2026-07-31', dataPagamento: '2026-07-05', status: 'em_aberto' };
  const atrasado = { cicloFim: '2026-08-15', dataPagamento: null, status: 'em_aberto' };
  const emAberto = { cicloFim: '2026-09-15', dataPagamento: null, status: 'atrasado' };
  const venceHoje = { cicloFim: '2026-09-01', dataPagamento: null, status: 'atrasado' };

  assert.equal(recalcularStatusCiclo(pago, HOJE), pago, 'muta e devolve o mesmo objeto');
  assert.equal(pago.status, 'pago');
  assert.equal(recalcularStatusCiclo(atrasado, HOJE).status, 'atrasado');
  assert.equal(recalcularStatusCiclo(emAberto, HOJE).status, 'em_aberto');
  assert.equal(
    recalcularStatusCiclo(venceHoje, HOJE).status,
    'em_aberto',
    'ciclo que vence hoje ainda não está atrasado',
  );
});

test('T05 — obterMensagemFalhaPersistencia distingue sessão expirada, falha remota e falha desconhecida', () => {
  const sessaoExpirada = 'Sessão expirada. Faça login com Google para continuar.';
  const falhaRemota = 'Não foi possível salvar as alterações antes de concluir a reposição.';
  const desconhecida = 'Não foi possível confirmar se os dados foram salvos. Tente novamente.';

  assert.equal(obterMensagemFalhaPersistencia({ ok: false, motivo: 'nao_autenticado' }), sessaoExpirada);
  assert.equal(obterMensagemFalhaPersistencia({ ok: false, motivo: 'sessao_expirada' }), sessaoExpirada);
  assert.equal(obterMensagemFalhaPersistencia({ ok: false, motivo: 'falha_remota' }), falhaRemota);
  assert.equal(obterMensagemFalhaPersistencia({ ok: false, motivo: 'timeout' }), desconhecida);
  assert.equal(obterMensagemFalhaPersistencia({ ok: false }), falhaRemota, 'sem motivo cai em falha_remota');
  assert.equal(obterMensagemFalhaPersistencia({ ok: false, motivo: 500 }), falhaRemota, 'motivo não-string cai em falha_remota');
  assert.equal(obterMensagemFalhaPersistencia(null), falhaRemota);
});

test('T05 — agruparHistoricoReposicoes ignora reposições de outro aluno e status fora do contrato', () => {
  const reposicoes = [
    { id: 'r1', alunoId: 'aluno-1', status: 'pendente', dataOriginal: '2026-07-10', horarioOriginal: '08:00' },
    { id: 'r2', alunoId: 'aluno-1', status: 'pendente', dataOriginal: '2026-07-24', horarioOriginal: '07:00' },
    { id: 'r3', alunoId: 'aluno-1', status: 'realizada', dataOriginal: '2026-06-01' },
    { id: 'r4', alunoId: 'aluno-2', status: 'pendente', dataOriginal: '2026-07-30' },
    { id: 'r5', alunoId: 'aluno-1', status: 'cancelada', dataOriginal: '2026-07-01' },
    { id: 'r6', alunoId: 'aluno-1', status: 'agendada', dataOriginal: '2026-05-01' },
    { id: 'r7', alunoId: 'aluno-1', status: 'expirada', dataOriginal: '2026-04-01' },
  ];

  const grupos = agruparHistoricoReposicoes(reposicoes, 'aluno-1');

  assert.deepEqual(
    grupos.map((grupo) => grupo.status),
    ['pendente', 'agendada', 'realizada', 'expirada'],
  );
  assert.deepEqual(
    grupos[0].itens.map((item) => item.id),
    ['r2', 'r1'],
    'pendentes ordenadas da data mais recente para a mais antiga',
  );
  assert.deepEqual(
    grupos.flatMap((grupo) => grupo.itens.map((item) => item.id)).sort(),
    ['r1', 'r2', 'r3', 'r6', 'r7'],
  );

  const resumo = resumoHistoricoReposicoesAluno(reposicoes, 'aluno-1');
  assert.equal(resumo.total, 5);
  assert.deepEqual(resumo.contagens, { pendente: 2, agendada: 1, realizada: 1, expirada: 1 });
});
