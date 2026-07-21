const Agendamento = require('../models/Agendamento');
const { normalizarBloqueio } = require('../services/agendamentoService');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroAgendamento(res, err) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  if (err && err.code === 11000) {
    res.status(409).json({ error: 'Já existe um agendamento com esse id para este usuário.' });
    return;
  }

  if (err && err.message && err.message.includes('Bloqueio inválido')) {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(statusCode).json({ error: err.message });
}

async function listarAgendamentos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const agendamentos = await Agendamento.find({ ownerEmail });
    res.json(agendamentos);
  } catch (err) {
    responderErroAgendamento(res, err);
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
    responderErroAgendamento(res, err);
  }
}

async function criarAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = req.body || {};

    if (!payload.id) {
      return res.status(400).json({ error: 'id é obrigatório.' });
    }

    const agendamento = await Agendamento.create({
      ...normalizarBloqueio(payload),
      ownerEmail
    });

    res.status(201).json(agendamento);
  } catch (err) {
    responderErroAgendamento(res, err);
  }
}

async function atualizarAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const payload = { ...req.body };

    delete payload.ownerEmail;
    delete payload._id;

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
      { new: true, runValidators: true }
    );

    if (!atualizado) {
      return res.status(404).json({ error: `Agendamento com id '${id}' não encontrado.` });
    }

    res.json(atualizado);
  } catch (err) {
    responderErroAgendamento(res, err);
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
    responderErroAgendamento(res, err);
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
    res.status(500).json({ error: err.message });
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
