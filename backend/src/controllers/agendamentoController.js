const Agendamento = require('../models/Agendamento');
const { normalizarBloqueio } = require('../services/agendamentoService');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroAgendamento(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  console.error(`[AgendamentoController] Erro ao ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[AgendamentoController] Stack:', err.stack);
  }

  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    message: err.message,
    connectionState: Agendamento.db.readyState
  });
}

function limparPayloadAgendamento(payload) {
  const limpo = { ...(payload || {}) };
  delete limpo._id;
  delete limpo.__v;
  delete limpo.ownerEmail;
  return limpo;
}

async function listarAgendamentos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const agendamentos = await Agendamento.find({ ownerEmail });
    res.json(agendamentos);
  } catch (err) {
    responderErroAgendamento(res, err, 'listar agendamentos');
  }
}

async function obterAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const agendamento = await Agendamento.findOne({ ownerEmail, id });

    if (!agendamento) {
      return res.status(404).json({ error: `Agendamento com id '${id}' não encontrado.` });
    }

    res.json(agendamento);
  } catch (err) {
    responderErroAgendamento(res, err, 'obter agendamento');
  }
}

async function criarAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayloadAgendamento(req.body);

    if (!payload.id) {
      return res.status(400).json({ error: 'id é obrigatório.' });
    }

    const agendamento = await Agendamento.findOneAndUpdate(
      { ownerEmail, id: payload.id },
      {
        $set: {
          ...normalizarBloqueio(payload),
          id: payload.id,
          ownerEmail
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(agendamento);
  } catch (err) {
    if (err && err.code === 11000) {
      try {
        const ownerEmail = getOwnerEmailOrThrow(req);
        const payload = limparPayloadAgendamento(req.body);

        const agendamento = await Agendamento.findOneAndUpdate(
          { ownerEmail, id: payload.id },
          {
            $set: {
              ...normalizarBloqueio(payload),
              id: payload.id,
              ownerEmail
            }
          },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(agendamento);
      } catch (fallbackErr) {
        return responderErroAgendamento(res, fallbackErr, 'criar agendamento');
      }
    }

    responderErroAgendamento(res, err, 'criar agendamento');
  }
}

async function atualizarAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payload = limparPayloadAgendamento(req.body);

    if (payload.id && payload.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    const agendamentoNormalizado = {
      ...normalizarBloqueio({ ...payload, id }),
      id,
      ownerEmail
    };

    const atualizado = await Agendamento.findOneAndUpdate(
      { ownerEmail, id },
      { $set: agendamentoNormalizado },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(atualizado);
  } catch (err) {
    responderErroAgendamento(res, err, 'atualizar agendamento');
  }
}

async function excluirAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const excluido = await Agendamento.findOneAndDelete({ ownerEmail, id });

    if (!excluido) {
      return res.status(404).json({ error: `Agendamento com id '${id}' não encontrado.` });
    }

    res.status(204).send();
  } catch (err) {
    responderErroAgendamento(res, err, 'excluir agendamento');
  }
}


async function patchAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const { googleCalendarEventId } = req.body;

    if (googleCalendarEventId === undefined) {
      return res.status(400).json({ error: 'googleCalendarEventId é obrigatório no corpo da requisição.' });
    }

    const atualizado = await Agendamento.findOneAndUpdate(
      { ownerEmail, id },
      { $set: { googleCalendarEventId } },
      { new: true }
    );

    if (!atualizado) {
      return res.status(404).json({ error: `Agendamento com id '${id}' não encontrado.` });
    }

    res.json({ message: 'googleCalendarEventId atualizado com sucesso.', agendamento: atualizado });
  } catch (err) {
    responderErroAgendamento(res, err, 'atualizar googleCalendarEventId do agendamento');
  }
}

module.exports = {
  listarAgendamentos,
  obterAgendamento,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  patchAgendamento
};
