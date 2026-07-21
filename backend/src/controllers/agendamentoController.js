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

async function sincronizarAgendamentos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { agendamentos } = req.body;
    const agendamentosNormalizados = Array.isArray(agendamentos)
      ? agendamentos.map((agendamento) => ({
          ...normalizarBloqueio(agendamento),
          ownerEmail
        }))
      : [];

    await Agendamento.deleteMany({ ownerEmail });
    if (agendamentosNormalizados.length > 0) {
      await Agendamento.insertMany(agendamentosNormalizados);
    }

    res.json({ message: 'Agendamentos sincronizados com sucesso!' });
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

// [TAG-BIDIRECIONAL-SYNC] Sincroniza agendamentos que foram editados no Google Calendar de volta pro MongoDB
async function sincronizarAgendamentosDoGCal(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { agendamentos } = req.body;
    
    if (!Array.isArray(agendamentos)) {
      return res.status(400).json({ error: 'agendamentos deve ser um array.' });
    }

    if (agendamentos.length === 0) {
      return res.json({ message: 'Nenhum agendamento para sincronizar.', atualizados: 0, erros: [] });
    }

    const resultados = [];
    const erros = [];

    // Para cada agendamento enviado do GCal, atualiza o MongoDB
    for (const agendamentoGCal of agendamentos) {
      try {
        const { id, summary, data, horarioInicio, horarioFim, location } = agendamentoGCal;

        if (!id) {
          erros.push({ agendamentoId: id, erro: 'ID obrigatório.' });
          continue;
        }

        // Prepara objeto de atualização com apenas os campos que podem ter sido modificados no GCal
        const atualizacoes = {};
        if (summary) atualizacoes.descricao = summary; // Sincroniza títitulo para descricao
        if (data) atualizacoes.data = data;
        if (horarioInicio) atualizacoes.horarioInicio = horarioInicio;
        if (horarioFim) atualizacoes.horarioFim = horarioFim;
        if (location) atualizacoes.local = location;

        // Atualiza no MongoDB
        const atualizado = await Agendamento.findOneAndUpdate(
          { ownerEmail, id },
          { $set: atualizacoes },
          { new: true }
        );

        if (atualizado) {
          resultados.push({
            id,
            sucesso: true,
            camposAtualizados: Object.keys(atualizacoes)
          });
        } else {
          erros.push({ agendamentoId: id, erro: 'Agendamento não encontrado.' });
        }
      } catch (err) {
        erros.push({ agendamentoId: agendamentoGCal.id, erro: err.message });
      }
    }

    res.json({
      message: 'Sincronização de agendamentos do GCal concluída.',
      atualizados: resultados.length,
      erros: erros.length,
      detalhes: {
        sucessos: resultados,
        erros
      }
    });
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
  sincronizarAgendamentos,
  patchAgendamento,
  sincronizarAgendamentosDoGCal
};
