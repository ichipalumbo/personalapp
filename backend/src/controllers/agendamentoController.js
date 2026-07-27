const Agendamento = require('../models/Agendamento');
const Aluno = require('../models/Aluno');
const { normalizarBloqueio } = require('../services/agendamentoService');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const {
  pushEventToGoogle,
  updateEventInGoogle,
  deleteEventFromGoogle
} = require('../services/gcalSyncService');

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

function normalizarAgendamentoParaResposta(agendamento) {
  if (!agendamento) {
    return agendamento;
  }

  if (typeof agendamento.toObject === 'function') {
    return agendamento.toObject();
  }

  return agendamento;
}

function montarRespostaFalhaGcal(res, err, contexto, dados) {
  const statusCode = err && err.statusCode ? err.statusCode : 502;

  console.error(`[AgendamentoController] Falha ao sincronizar com Google Calendar durante ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[AgendamentoController] Stack GCal:', err.stack);
  }

  return res.status(statusCode).json({
    error: `Erro ao sincronizar agendamento com Google Calendar durante ${contexto}`,
    message: err.message,
    partialSuccess: true,
    agendamento: dados || null
  });
}

function montarPayloadGCal(agendamento) {
  const alunoPopulado = agendamento && agendamento.aluno && typeof agendamento.aluno === 'object'
    ? agendamento.aluno
    : null;

  const alunoNome = (
    (agendamento && agendamento.alunoNome)
    || (agendamento && agendamento.nomeAluno)
    || (alunoPopulado && alunoPopulado.nome)
    || ''
  );

  const objetivo = (
    (agendamento && agendamento.objetivo)
    || (agendamento && agendamento.alunoObjetivo)
    || (alunoPopulado && alunoPopulado.objetivo)
    || ''
  );

  const local = (
    (agendamento && agendamento.local)
    || (alunoPopulado && alunoPopulado.local)
    || ''
  );

  return {
    id: agendamento.id,
    alunoId: agendamento.alunoId || (alunoPopulado && (alunoPopulado.id || alunoPopulado._id)) || null,
    alunoNome: alunoNome ? String(alunoNome) : '',
    objetivo: objetivo ? String(objetivo) : '',
    data: agendamento.data,
    horarioInicio: agendamento.horarioInicio,
    horarioFim: agendamento.horarioFim,
    tipo: agendamento.tipo,
    descricao: agendamento.descricao,
    local: local ? String(local) : '',
    fullDay: agendamento.fullDay,
    googleCalendarEventId: agendamento.googleCalendarEventId
  };
}

async function enriquecerAgendamentoComAluno(ownerEmail, agendamento) {
  if (!agendamento || !agendamento.alunoId) {
    return agendamento;
  }

  const aluno = await Aluno.findOne({
    ownerEmail,
    id: String(agendamento.alunoId)
  }).lean();

  if (!aluno) {
    return agendamento;
  }

  const enriquecido = { ...agendamento };

  if (!enriquecido.alunoNome && aluno.nome) {
    enriquecido.alunoNome = String(aluno.nome);
  }

  if (!enriquecido.objetivo && aluno.objetivo) {
    enriquecido.objetivo = String(aluno.objetivo);
  }

  if (!enriquecido.local && aluno.local) {
    enriquecido.local = String(aluno.local);
  }

  return enriquecido;
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
    const existente = await Agendamento.findOne({ ownerEmail, id: payload.id }).select('googleCalendarEventId').lean();
    const googleCalendarEventIdExistente = existente && existente.googleCalendarEventId ? String(existente.googleCalendarEventId) : null;

    if (!payload.id) {
      return res.status(400).json({ error: 'id é obrigatório.' });
    }

    const agendamento = await Agendamento.findOneAndUpdate(
      { ownerEmail, id: payload.id },
      {
        $set: {
          ...normalizarBloqueio(payload),
          id: payload.id,
          ownerEmail,
          ...(googleCalendarEventIdExistente ? { googleCalendarEventId: googleCalendarEventIdExistente } : {})
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    const agendamentoParaGCalBase = normalizarAgendamentoParaResposta(agendamento);
    const agendamentoParaGCal = await enriquecerAgendamentoComAluno(ownerEmail, agendamentoParaGCalBase);

    try {
      let resultadoGCal = null;

      if (googleCalendarEventIdExistente) {
        resultadoGCal = await updateEventInGoogle(ownerEmail, montarPayloadGCal(agendamentoParaGCal));
      } else {
        resultadoGCal = await pushEventToGoogle(ownerEmail, montarPayloadGCal(agendamentoParaGCal));
      }

      if (resultadoGCal && resultadoGCal.googleCalendarEventId) {
        agendamento.googleCalendarEventId = resultadoGCal.googleCalendarEventId;
        await Agendamento.findOneAndUpdate(
          { ownerEmail, id: agendamento.id },
          { $set: { googleCalendarEventId: resultadoGCal.googleCalendarEventId } },
          { new: true }
        );
      }

      return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
    } catch (gcalErr) {
      return montarRespostaFalhaGcal(res, gcalErr, 'criar', normalizarAgendamentoParaResposta(agendamento));
    }
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

        const agendamentoParaGCalBase = normalizarAgendamentoParaResposta(agendamento);
        const agendamentoParaGCal = await enriquecerAgendamentoComAluno(ownerEmail, agendamentoParaGCalBase);

        try {
          const resultadoGCal = await pushEventToGoogle(ownerEmail, montarPayloadGCal(agendamentoParaGCal));
          if (resultadoGCal && resultadoGCal.googleCalendarEventId) {
            agendamento.googleCalendarEventId = resultadoGCal.googleCalendarEventId;
            await Agendamento.findOneAndUpdate(
              { ownerEmail, id: agendamento.id },
              { $set: { googleCalendarEventId: resultadoGCal.googleCalendarEventId } },
              { new: true }
            );
          }

          return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
        } catch (gcalErr) {
          return montarRespostaFalhaGcal(res, gcalErr, 'criar', normalizarAgendamentoParaResposta(agendamento));
        }
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
    const existente = await Agendamento.findOne({ ownerEmail, id }).select('googleCalendarEventId').lean();
    const googleCalendarEventIdExistente = existente && existente.googleCalendarEventId ? String(existente.googleCalendarEventId) : null;

    if (payload.id && payload.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    const agendamentoNormalizado = {
      ...normalizarBloqueio({ ...payload, id }),
      id,
      ownerEmail,
      ...(googleCalendarEventIdExistente ? { googleCalendarEventId: googleCalendarEventIdExistente } : {})
    };

    const atualizado = await Agendamento.findOneAndUpdate(
      { ownerEmail, id },
      { $set: agendamentoNormalizado },
      { new: true, upsert: true, runValidators: true }
    );

    const atualizadoParaGCal = normalizarAgendamentoParaResposta(atualizado);

    try {
      let resultadoGCal = null;

      if (googleCalendarEventIdExistente) {
        resultadoGCal = await updateEventInGoogle(ownerEmail, montarPayloadGCal(atualizadoParaGCal));
      } else {
        resultadoGCal = await pushEventToGoogle(ownerEmail, montarPayloadGCal(atualizadoParaGCal));
        if (resultadoGCal && resultadoGCal.googleCalendarEventId) {
          atualizado.googleCalendarEventId = resultadoGCal.googleCalendarEventId;
          await Agendamento.findOneAndUpdate(
            { ownerEmail, id },
            { $set: { googleCalendarEventId: resultadoGCal.googleCalendarEventId } },
            { new: true }
          );
        }
      }

      if (resultadoGCal && resultadoGCal.googleCalendarEventId && !atualizadoParaGCal.googleCalendarEventId) {
        atualizadoParaGCal.googleCalendarEventId = resultadoGCal.googleCalendarEventId;
      }

      return res.json(atualizadoParaGCal);
    } catch (gcalErr) {
      return montarRespostaFalhaGcal(res, gcalErr, 'atualizar', atualizadoParaGCal);
    }
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
      return res.status(200).json({
        ok: true,
        deleted: false,
        id,
        message: 'Agendamento já não existia. Operação idempotente concluída.'
      });
    }

    const excluidoParaGCal = normalizarAgendamentoParaResposta(excluido);

    try {
      if (excluidoParaGCal.googleCalendarEventId) {
        await deleteEventFromGoogle(ownerEmail, excluidoParaGCal.googleCalendarEventId);
      }

      return res.status(200).json({
        ok: true,
        deleted: true,
        id
      });
    } catch (gcalErr) {
      const status = gcalErr && (gcalErr.statusCode || gcalErr.status);
      if (status === 404 || status === 410) {
        return res.status(200).json({
          ok: true,
          deleted: true,
          id,
          message: 'Agendamento removido no MongoDB e evento Google já inexistente.'
        });
      }

      return montarRespostaFalhaGcal(res, gcalErr, 'excluir', excluidoParaGCal);
    }
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
