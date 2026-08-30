const Agendamento = require('../models/Agendamento');
const Aluno = require('../models/Aluno');
const { isDeepStrictEqual } = require('node:util');
const { limparPayload, responderErro } = require('../utils/controllerHelpers');
const { normalizarBloqueio } = require('../services/agendamentoService');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const {
  pushEventToGoogle,
  updateEventInGoogle,
  deleteEventFromGoogle
} = require('../services/gcalSyncService');

const GCAL_SYNC_PENDING_FIELD = 'gcalSyncPendingAt';
const GCAL_SYNC_PENDING_ATTEMPTS_FIELD = 'gcalSyncPendingTentativas';
const GCAL_SYNC_PENDING_MAX_TENTATIVAS = 5;

function responderErroAgendamento(res, err, contexto) {
  return responderErro(res, err, contexto, Agendamento, 'AgendamentoController');
}

function limparPayloadAgendamento(payload) {
  return limparPayload(payload);
}

async function obterAgendamentoPersistido(ownerEmail, id, campos) {
  const consulta = Agendamento.findOne({ ownerEmail, id });

  if (!consulta) {
    return null;
  }

  if (campos && typeof consulta.select === 'function') {
    const consultaComSelecao = consulta.select(campos);
    if (consultaComSelecao && typeof consultaComSelecao.lean === 'function') {
      return await consultaComSelecao.lean();
    }
  }

  if (typeof consulta.lean === 'function') {
    return await consulta.lean();
  }

  return consulta;
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

function limparMarcaPendenteDoAgendamento(agendamento) {
  if (!agendamento || typeof agendamento !== 'object') {
    return agendamento;
  }

  delete agendamento[GCAL_SYNC_PENDING_FIELD];
  delete agendamento[GCAL_SYNC_PENDING_ATTEMPTS_FIELD];
  return agendamento;
}

function agendamentoEmEstadoTerminal(agendamento) {
  const tentativas = Number(agendamento && agendamento[GCAL_SYNC_PENDING_ATTEMPTS_FIELD]);
  return Number.isFinite(tentativas) && tentativas >= GCAL_SYNC_PENDING_MAX_TENTATIVAS;
}

function agendamentoRecebeuEdicao(existente, payloadNormalizado) {
  if (!existente || !payloadNormalizado) {
    return false;
  }

  const existenteNormalizado = normalizarBloqueio(normalizarAgendamentoParaResposta(existente));
  const camposIgnorados = new Set([
    'id',
    'ownerEmail',
    '_id',
    '__v',
    GCAL_SYNC_PENDING_FIELD,
    GCAL_SYNC_PENDING_ATTEMPTS_FIELD
  ]);

  return Object.keys(payloadNormalizado).some((campo) => (
    !camposIgnorados.has(campo)
    && !isDeepStrictEqual(payloadNormalizado[campo], existenteNormalizado[campo])
  ));
}

async function persistirResultadoGcal(ownerEmail, agendamentoId, resultadoGCal, agendamentoEmMemoria) {
  if (!ownerEmail || !agendamentoId) {
    return;
  }

  const googleCalendarEventId = resultadoGCal && resultadoGCal.googleCalendarEventId
    ? String(resultadoGCal.googleCalendarEventId)
    : null;
  const update = {
    $unset: {
      [GCAL_SYNC_PENDING_FIELD]: 1,
      [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: 1
    }
  };

  if (googleCalendarEventId) {
    update.$set = { googleCalendarEventId };
  }

  await Agendamento.findOneAndUpdate(
    { ownerEmail, id: agendamentoId },
    update,
    { new: true }
  );

  if (agendamentoEmMemoria && typeof agendamentoEmMemoria === 'object') {
    if (googleCalendarEventId) {
      agendamentoEmMemoria.googleCalendarEventId = googleCalendarEventId;
    }
    limparMarcaPendenteDoAgendamento(agendamentoEmMemoria);
  }
}

async function montarRespostaFalhaGcal(res, err, contexto, dados, options = {}) {
  const statusCode = 200;
  const ownerEmail = options && options.ownerEmail ? options.ownerEmail : null;
  const agendamentoId = options && options.agendamentoId ? options.agendamentoId : (dados && dados.id ? dados.id : null);
  const pendenciaMarcadaEm = new Date().toISOString();

  if (ownerEmail && agendamentoId) {
    try {
      const consultaBase = Agendamento.findOne({ ownerEmail, id: agendamentoId });
      const consulta = consultaBase && typeof consultaBase.select === 'function'
        ? consultaBase.select([
          GCAL_SYNC_PENDING_FIELD,
          GCAL_SYNC_PENDING_ATTEMPTS_FIELD
        ])
        : consultaBase;

      let agendamentoAtual = await (consulta && typeof consulta.lean === 'function'
        ? consulta.lean()
        : consulta);

      const tentativasAtuais = Number(agendamentoAtual && agendamentoAtual[GCAL_SYNC_PENDING_ATTEMPTS_FIELD]) || 0;
      const tentativasNova = Math.min(tentativasAtuais + 1, GCAL_SYNC_PENDING_MAX_TENTATIVAS);

      await Agendamento.findOneAndUpdate(
        { ownerEmail, id: agendamentoId },
        {
          $set: {
            [GCAL_SYNC_PENDING_FIELD]: pendenciaMarcadaEm,
            [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: tentativasNova
          }
        },
        { new: true }
      );

      if (dados && typeof dados === 'object') {
        dados[GCAL_SYNC_PENDING_FIELD] = pendenciaMarcadaEm;
        dados[GCAL_SYNC_PENDING_ATTEMPTS_FIELD] = tentativasNova;
      }
    } catch (persistErr) {
      console.warn('[AgendamentoController] Falha ao persistir marca de pendencia do Google Calendar. Respondendo 200 mesmo assim.', {
        contexto,
        agendamentoId,
        ownerEmail,
        error: persistErr && persistErr.message ? persistErr.message : String(persistErr)
      });
    }
  }

  console.error(`[AgendamentoController] Falha ao sincronizar com Google Calendar durante ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[AgendamentoController] Stack GCal:', err.stack);
  }

  return res.status(statusCode).json({
    error: `Erro ao sincronizar agendamento com Google Calendar durante ${contexto}`,
    message: err.message,
    partialSuccess: true,
    gcalSyncFailed: true,
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
    googleCalendarEventId: agendamento.googleCalendarEventId,
    tipoRecorrencia: agendamento.tipoRecorrencia,
    frequencia: agendamento.frequencia,
    intervaloRecorrencia: agendamento.intervaloRecorrencia,
    diasSemana: Array.isArray(agendamento.diasSemana) ? agendamento.diasSemana : [],
    dia: agendamento.dia,
    recorrenciaEscopo: agendamento.recorrenciaEscopo,
    recorrenciaDataInicio: agendamento.recorrenciaDataInicio,
    recorrenciaDataFim: agendamento.recorrenciaDataFim,
    recorrenciaFimCondicao: agendamento.recorrenciaFimCondicao,
    recorrenciaQuantidadeOcorrencias: agendamento.recorrenciaQuantidadeOcorrencias,
    dataCriacao: agendamento.dataCriacao,
    excecoes: Array.isArray(agendamento.excecoes) ? agendamento.excecoes : [],
    excecoesDetalhadas: Array.isArray(agendamento.excecoesDetalhadas) ? agendamento.excecoesDetalhadas : [],
    timeZone: agendamento.timeZone
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
    const existente = await obterAgendamentoPersistido(ownerEmail, payload.id, 'googleCalendarEventId');
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

      await persistirResultadoGcal(ownerEmail, agendamento.id, resultadoGCal, agendamento);

      return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
    } catch (gcalErr) {
      return montarRespostaFalhaGcal(
        res,
        gcalErr,
        'criar',
        normalizarAgendamentoParaResposta(agendamento),
        { ownerEmail, agendamentoId: agendamento.id }
      );
    }
  } catch (err) {
    if (err && err.code === 11000) {
      try {
        const ownerEmail = getOwnerEmailOrThrow(req);
        const payload = limparPayloadAgendamento(req.body);
        const existente = await obterAgendamentoPersistido(ownerEmail, payload.id, 'googleCalendarEventId');
        const googleCalendarEventIdExistente = existente && existente.googleCalendarEventId ? String(existente.googleCalendarEventId) : null;

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
          const resultadoGCal = googleCalendarEventIdExistente
            ? await updateEventInGoogle(ownerEmail, montarPayloadGCal(agendamentoParaGCal))
            : await pushEventToGoogle(ownerEmail, montarPayloadGCal(agendamentoParaGCal));
          await persistirResultadoGcal(ownerEmail, agendamento.id, resultadoGCal, agendamento);

          return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
        } catch (gcalErr) {
          return montarRespostaFalhaGcal(
            res,
            gcalErr,
            'criar',
            normalizarAgendamentoParaResposta(agendamento),
            { ownerEmail, agendamentoId: agendamento.id }
          );
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
    const existente = await obterAgendamentoPersistido(ownerEmail, id);
    const googleCalendarEventIdExistente = existente && existente.googleCalendarEventId ? String(existente.googleCalendarEventId) : null;
    const payloadNormalizado = normalizarBloqueio({ ...payload, id });
    const estavaEmEstadoTerminal = agendamentoEmEstadoTerminal(existente);
    const deveReabrirTentativas = estavaEmEstadoTerminal && agendamentoRecebeuEdicao(existente, payloadNormalizado);

    if (payload.id && payload.id !== id) {
      return res.status(400).json({ error: 'O id do corpo deve ser igual ao id da rota.' });
    }

    const agendamentoNormalizado = {
      ...payloadNormalizado,
      id,
      ownerEmail,
      ...(googleCalendarEventIdExistente ? { googleCalendarEventId: googleCalendarEventIdExistente } : {}),
      ...(deveReabrirTentativas ? { [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: 0 } : {})
    };

    const atualizado = await Agendamento.findOneAndUpdate(
      { ownerEmail, id },
      { $set: agendamentoNormalizado },
      { new: true, upsert: true, runValidators: true }
    );

    const atualizadoParaGCalBase = normalizarAgendamentoParaResposta(atualizado);

    if (estavaEmEstadoTerminal) {
      return res.json({
        ...atualizadoParaGCalBase,
        gcalSyncPausado: true
      });
    }

    const atualizadoParaGCal = await enriquecerAgendamentoComAluno(ownerEmail, atualizadoParaGCalBase);

    try {
      let resultadoGCal = null;

      if (googleCalendarEventIdExistente) {
        resultadoGCal = await updateEventInGoogle(ownerEmail, montarPayloadGCal(atualizadoParaGCal));
      } else {
        resultadoGCal = await pushEventToGoogle(ownerEmail, montarPayloadGCal(atualizadoParaGCal));
      }

      await persistirResultadoGcal(ownerEmail, id, resultadoGCal, atualizadoParaGCalBase);

      return res.json(atualizadoParaGCalBase);
    } catch (gcalErr) {
      return montarRespostaFalhaGcal(
        res,
        gcalErr,
        'atualizar',
        atualizadoParaGCal,
        { ownerEmail, agendamentoId: id }
      );
    }
  } catch (err) {
    try {
      const ownerEmail = getOwnerEmailOrThrow(req);
      const payload = limparPayloadAgendamento(req.body);
      const dadosFallback = { ...payload, id: req.params && req.params.id ? req.params.id : payload.id, ownerEmail };
      const dadosParaGCal = await enriquecerAgendamentoComAluno(ownerEmail, dadosFallback);

      try {
        if (dadosParaGCal && dadosParaGCal.googleCalendarEventId) {
          await updateEventInGoogle(ownerEmail, montarPayloadGCal(dadosParaGCal));
        } else {
          await pushEventToGoogle(ownerEmail, montarPayloadGCal(dadosParaGCal));
        }
      } catch (gcalErr) {
        return montarRespostaFalhaGcal(
          res,
          gcalErr,
          'atualizar',
          dadosParaGCal,
          { ownerEmail, agendamentoId: dadosFallback.id }
        );
      }

      return res.status(200).json(dadosParaGCal);
    } catch (fallbackErr) {
      responderErroAgendamento(res, fallbackErr, 'atualizar agendamento');
    }
  }
}

async function excluirAgendamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { id } = req.params;
    const agendamentoExistente = await Agendamento.findOne({ ownerEmail, id });

    if (!agendamentoExistente) {
      return res.status(200).json({
        ok: true,
        deleted: false,
        id,
        message: 'Agendamento já não existia. Operação idempotente concluída.'
      });
    }

    const excluidoParaGCal = normalizarAgendamentoParaResposta(agendamentoExistente);

    try {
      if (excluidoParaGCal.googleCalendarEventId) {
        await deleteEventFromGoogle(ownerEmail, excluidoParaGCal.googleCalendarEventId);
      }

      await Agendamento.findOneAndDelete({ ownerEmail, id });

      return res.status(200).json({
        ok: true,
        deleted: true,
        id
      });
    } catch (gcalErr) {
      const status = gcalErr && (gcalErr.statusCode || gcalErr.status);
      if (status === 404 || status === 410) {
        await Agendamento.findOneAndDelete({ ownerEmail, id });
        return res.status(200).json({
          ok: true,
          deleted: true,
          id,
          message: 'Agendamento removido no MongoDB e evento Google já inexistente.'
        });
      }

      return montarRespostaFalhaGcal(res, gcalErr, 'excluir', excluidoParaGCal, { ownerEmail, agendamentoId: id });
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
  patchAgendamento,
  montarPayloadGCal
};
