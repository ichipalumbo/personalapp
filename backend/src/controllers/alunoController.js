const Aluno = require('../models/Aluno');
const Agendamento = require('../models/Agendamento');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const {
  calcularProjecaoMensalCompleta,
  calcularProjecaoRealizadaAteHoje,
  calcularProjecaoAproximada,
  calcularAulasFaltamAgendar,
  contarReposicoesPorAluno
} = require('../services/kpiService');

function responderErroAluno(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  console.error(`[AlunoController] Erro ao ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[AlunoController] Stack:', err.stack);
  }

  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    message: err.message,
    connectionState: Aluno.db.readyState
  });
}

function limparPayloadAluno(payload) {
  const limpo = { ...(payload || {}) };
  delete limpo._id;
  delete limpo.__v;
  delete limpo.ownerEmail;
  return limpo;
}

async function listarAlunos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const alunos = await Aluno.find({ ownerEmail });
    res.json(alunos);
  } catch (err) {
    responderErroAluno(res, err, 'listar alunos');
  }
}

async function obterAluno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const aluno = await Aluno.findOne({ ownerEmail, id });

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json(aluno);
  } catch (err) {
    responderErroAluno(res, err, 'obter aluno');
  }
}

async function criarAluno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayloadAluno(req.body);

    if (!payload.id || !payload.nome) {
      return res.status(400).json({ error: 'id e nome são obrigatórios.' });
    }

    const aluno = await Aluno.findOneAndUpdate(
      { ownerEmail, id: payload.id },
      { $set: { ...payload, id: payload.id, ownerEmail } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(aluno);
  } catch (err) {
    if (err && err.code === 11000) {
      try {
        const ownerEmail = getOwnerEmailOrThrow(req);
        const payload = limparPayloadAluno(req.body);

        const aluno = await Aluno.findOneAndUpdate(
          { ownerEmail, id: payload.id },
          { $set: { ...payload, id: payload.id, ownerEmail } },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(aluno);
      } catch (fallbackErr) {
        return responderErroAluno(res, fallbackErr, 'criar aluno');
      }
    }

    responderErroAluno(res, err, 'criar aluno');
  }
}

async function atualizarAluno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payload = limparPayloadAluno(req.body);

    if (payload.id && payload.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    const aluno = await Aluno.findOneAndUpdate(
      { ownerEmail, id },
      { $set: { ...payload, id, ownerEmail } },
      { new: true, runValidators: true }
    );

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    res.json(aluno);
  } catch (err) {
    responderErroAluno(res, err, 'atualizar aluno');
  }
}

async function excluirAluno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const aluno = await Aluno.findOneAndDelete({ ownerEmail, id });

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    await Agendamento.deleteMany({ ownerEmail, alunoId: id });
    res.status(204).send();
  } catch (err) {
    responderErroAluno(res, err, 'excluir aluno');
  }
}

async function obterKpisAluno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const aluno = await Aluno.findOne({ ownerEmail, id });

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const aulas = await Agendamento.find({ ownerEmail });

    res.json({
      alunoId: aluno.id,
      aluno: aluno.nome,
      kpis: {
        projecaoMesCompleto: calcularProjecaoMensalCompleta(aluno, aulas),
        realizadoAteHoje: calcularProjecaoRealizadaAteHoje(aluno, aulas),
        projecaoAproximada: calcularProjecaoAproximada(aluno),
        aulasFaltam: calcularAulasFaltamAgendar(aluno, aulas),
        reposicoes: contarReposicoesPorAluno(aluno.id, aulas)
      }
    });
  } catch (err) {
    responderErroAluno(res, err, 'obter KPIs do aluno');
  }
}

async function obterKpisTodosAlunos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const alunos = await Aluno.find({ ownerEmail });
    const aulas = await Agendamento.find({ ownerEmail });

    const kpisCompletos = alunos.map((aluno) => ({
      alunoId: aluno.id,
      aluno: aluno.nome,
      preco: aluno.preco,
      frequenciaSemanal: aluno.frequenciaSemanal,
      kpis: {
        projecaoMesCompleto: calcularProjecaoMensalCompleta(aluno, aulas),
        realizadoAteHoje: calcularProjecaoRealizadaAteHoje(aluno, aulas),
        projecaoAproximada: calcularProjecaoAproximada(aluno),
        aulasFaltam: calcularAulasFaltamAgendar(aluno, aulas),
        reposicoes: contarReposicoesPorAluno(aluno.id, aulas)
      }
    }));

    res.json(kpisCompletos);
  } catch (err) {
    responderErroAluno(res, err, 'obter KPIs de todos os alunos');
  }
}

module.exports = {
  listarAlunos,
  obterAluno,
  criarAluno,
  atualizarAluno,
  excluirAluno,
  obterKpisAluno,
  obterKpisTodosAlunos
};
