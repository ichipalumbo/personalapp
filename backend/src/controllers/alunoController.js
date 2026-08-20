const Aluno = require('../models/Aluno');
const Agendamento = require('../models/Agendamento');
const { limparPayload, responderErro } = require('../utils/controllerHelpers');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const { montarConsistenciaAgenda } = require('../services/agendaConsistencyService');

function responderErroAluno(res, err, contexto) {
  return responderErro(res, err, contexto, Aluno, 'AlunoController');
}

function limparPayloadAluno(payload) {
  return limparPayload(payload);
}

function normalizarStatusAluno(status) {
  return String(status || '').toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
}

function garantirStatusAluno(aluno) {
  if (!aluno || typeof aluno !== 'object') return aluno;
  return {
    ...aluno,
    status: normalizarStatusAluno(aluno.status)
  };
}

function normalizarBooleanoFinanceiro(valor) {
  return valor === true || valor === 'true' || valor === 1 || valor === '1';
}

function validarFinanceiroAluno(aluno) {
  if (!aluno || typeof aluno !== 'object') return;

  if (String(aluno.objetivo || '').trim() === 'Consultoria Online') {
    return;
  }

  const fechamentoMesCheio = normalizarBooleanoFinanceiro(aluno.fechamentoMesCheio);
  const diaVencimento = aluno.diaVencimento === null || aluno.diaVencimento === undefined || aluno.diaVencimento === ''
    ? null
    : Number(aluno.diaVencimento);
  const metodoCobranca = String(aluno.metodoCobranca || 'por_aula');

  if (!fechamentoMesCheio && !diaVencimento) {
    const error = new Error("Para salvar este aluno, informe o dia de vencimento ou ative 'Fechar por mês cheio'.");
    error.statusCode = 400;
    throw error;
  }

  if (!fechamentoMesCheio && diaVencimento === 1) {
    const error = new Error("Para vencimento no dia 1 ou mês completo, ative a opção 'Fechar por mês cheio' acima.");
    error.statusCode = 400;
    throw error;
  }

  if (metodoCobranca === 'valor_fixo') {
    const valorFixoCiclo = Number(aluno.valorFixoCiclo);
    if (!Number.isFinite(valorFixoCiclo) || valorFixoCiclo <= 0) {
      const error = new Error('Informe o valor fixo do ciclo para salvar este aluno.');
      error.statusCode = 400;
      throw error;
    }
  } else {
    const preco = Number(aluno.preco);
    if (!Number.isFinite(preco) || preco <= 0) {
      const error = new Error('Informe o valor hora/aula para salvar este aluno.');
      error.statusCode = 400;
      throw error;
    }
  }
}

async function listarAlunos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const alunos = await Aluno.find({ ownerEmail });
    res.json(alunos.map((aluno) => garantirStatusAluno(aluno.toObject ? aluno.toObject() : aluno)));
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

    res.json(garantirStatusAluno(aluno.toObject ? aluno.toObject() : aluno));
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

    payload.status = normalizarStatusAluno(payload.status);
    if (Object.prototype.hasOwnProperty.call(payload, 'fechamentoMesCheio')) {
      payload.fechamentoMesCheio = normalizarBooleanoFinanceiro(payload.fechamentoMesCheio);
    }
    validarFinanceiroAluno(payload);

    const aluno = await Aluno.findOneAndUpdate(
      { ownerEmail, id: payload.id },
      { $set: { ...payload, id: payload.id, ownerEmail } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(garantirStatusAluno(aluno.toObject ? aluno.toObject() : aluno));
  } catch (err) {
    if (err && err.code === 11000) {
      try {
        const ownerEmail = getOwnerEmailOrThrow(req);
        const payload = limparPayloadAluno(req.body);
        payload.status = normalizarStatusAluno(payload.status);

        const aluno = await Aluno.findOneAndUpdate(
          { ownerEmail, id: payload.id },
          { $set: { ...payload, id: payload.id, ownerEmail } },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(garantirStatusAluno(aluno.toObject ? aluno.toObject() : aluno));
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

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      payload.status = normalizarStatusAluno(payload.status);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'fechamentoMesCheio')) {
      payload.fechamentoMesCheio = normalizarBooleanoFinanceiro(payload.fechamentoMesCheio);
    }

    const alunoAtual = await Aluno.findOne({ ownerEmail, id });

    if (!alunoAtual) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const alunoMerge = { ...(alunoAtual.toObject ? alunoAtual.toObject() : alunoAtual), ...payload, id, ownerEmail };
    validarFinanceiroAluno(alunoMerge);

    const aluno = await Aluno.findOneAndUpdate(
      { ownerEmail, id },
      { $set: { ...payload, id, ownerEmail } },
      { new: true, runValidators: true }
    );

    res.json(garantirStatusAluno(aluno.toObject ? aluno.toObject() : aluno));
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

async function listarConsistenciaAgenda(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const alunos = await Aluno.find({ ownerEmail });
    const aulas = await Agendamento.find({ ownerEmail });

    res.json(alunos.map((aluno) => montarConsistenciaAgenda(aluno, aulas)));
  } catch (err) {
    responderErroAluno(res, err, 'obter consistência de agenda');
  }
}

module.exports = {
  listarAlunos,
  obterAluno,
  criarAluno,
  atualizarAluno,
  excluirAluno,
  listarConsistenciaAgenda
};
