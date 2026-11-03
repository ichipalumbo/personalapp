const Agendamento = require('../models/Agendamento');
const Aluno = require('../models/Aluno');
const GoogleCalendarConnection = require('../models/GoogleCalendarConnection');
const GcalReconciliationQueue = require('../models/GcalReconciliationQueue');
const { isDeepStrictEqual } = require('node:util');
const { limparPayload, responderErro } = require('../utils/controllerHelpers');
const { normalizarBloqueio } = require('../services/agendamentoService');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const gcalSyncService = require('../services/gcalSyncService');

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
    },
    $set: {
      gcalStatus: 'sincronizado'
    }
  };

  if (googleCalendarEventId) {
    update.$set.googleCalendarEventId = googleCalendarEventId;
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
    agendamentoEmMemoria.gcalStatus = 'sincronizado';
    limparMarcaPendenteDoAgendamento(agendamentoEmMemoria);
  }
}

async function tratarFalhaGcalAgendamento(ownerEmail, agendamentoId, err, contexto, dados) {
  const pendenciaMarcadaEm = new Date().toISOString();
  const status = err && (err.statusCode || err.status);
  const isNotConnected = Boolean(
    err && (status === 404 || (err.message && err.message.toLowerCase().includes('connection not found')))
    && (!err.message || err.message.toLowerCase().includes('connection not found') || status === 404)
  );
  const isTokenExpired = Boolean(err && (
    err.message === 'invalid_grant' ||
    (err.error && err.error === 'invalid_grant') ||
    String(err).includes('invalid_grant') ||
    err.code === 'TOKEN_EXPIRED'
  ));

  if (isNotConnected) {
    if (ownerEmail && agendamentoId) {
      try {
        const existente = await Agendamento.findOne({ ownerEmail, id: agendamentoId });
        const eventIdExistente = (existente && existente.googleCalendarEventId) || (dados && dados.googleCalendarEventId);
        if (eventIdExistente) {
          await GcalReconciliationQueue.findOneAndUpdate(
            { ownerEmail, googleCalendarEventId: eventIdExistente },
            { $set: { action: 'update', agendamentoId, updatedAt: new Date() } },
            { upsert: true }
          ).catch(() => {});
        }
        await Agendamento.findOneAndUpdate(
          { ownerEmail, id: agendamentoId },
          {
            $set: { gcalStatus: 'desconectado' },
            $unset: {
              [GCAL_SYNC_PENDING_FIELD]: 1,
              [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: 1
            }
          }
        );
      } catch (_) {}
    }
    if (dados && typeof dados === 'object') {
      dados.gcalStatus = 'desconectado';
      delete dados[GCAL_SYNC_PENDING_FIELD];
      delete dados[GCAL_SYNC_PENDING_ATTEMPTS_FIELD];
    }
    return {
      outcome: 'not_connected',
      gcalSyncFailed: false,
      tokenExpired: false,
      needsReconnect: false,
      agendamento: dados || { id: agendamentoId, gcalStatus: 'desconectado' }
    };
  }

  if (isTokenExpired) {
    if (ownerEmail) {
      try {
        await GoogleCalendarConnection.findOneAndUpdate(
          { ownerEmail },
          { $set: { status: 'expired' } }
        ).catch(() => {});
      } catch (_) {}
    }
    if (ownerEmail && agendamentoId) {
      try {
        await Agendamento.findOneAndUpdate(
          { ownerEmail, id: agendamentoId },
          {
            $set: { gcalStatus: 'desconectado' },
            $unset: {
              [GCAL_SYNC_PENDING_FIELD]: 1,
              [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: 1
            }
          }
        );
      } catch (_) {}
    }
    if (dados && typeof dados === 'object') {
      dados.gcalStatus = 'desconectado';
      delete dados[GCAL_SYNC_PENDING_FIELD];
      delete dados[GCAL_SYNC_PENDING_ATTEMPTS_FIELD];
    }
    return {
      outcome: 'token_expired',
      gcalSyncFailed: false,
      tokenExpired: true,
      needsReconnect: true,
      message: 'A conexão com o Google Agenda expirou. Reconecte nas Configurações.',
      agendamento: dados || null
    };
  }

  if (ownerEmail && agendamentoId) {
    try {
      const consultaBase = Agendamento.findOne({ ownerEmail, id: agendamentoId });
      const consulta = consultaBase && typeof consultaBase.select === 'function'
        ? consultaBase.select([
          GCAL_SYNC_PENDING_FIELD,
          GCAL_SYNC_PENDING_ATTEMPTS_FIELD
        ])
        : consultaBase;

      const agendamentoAtual = await (consulta && typeof consulta.lean === 'function'
        ? consulta.lean()
        : consulta);

      const tentativasAtuais = Number(agendamentoAtual && agendamentoAtual[GCAL_SYNC_PENDING_ATTEMPTS_FIELD]) || 0;
      const tentativasNova = Math.min(tentativasAtuais + 1, GCAL_SYNC_PENDING_MAX_TENTATIVAS);

      await Agendamento.findOneAndUpdate(
        { ownerEmail, id: agendamentoId },
        {
          $set: {
            gcalStatus: 'pendente',
            [GCAL_SYNC_PENDING_FIELD]: pendenciaMarcadaEm,
            [GCAL_SYNC_PENDING_ATTEMPTS_FIELD]: tentativasNova
          }
        },
        { new: true }
      );

      if (dados && typeof dados === 'object') {
        dados.gcalStatus = 'pendente';
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

  console.error(`[AgendamentoController] Falha ao sincronizar com Google Calendar durante ${contexto}:`, err && err.message ? err.message : String(err));
  if (err && err.stack) {
    console.error('[AgendamentoController] Stack GCal:', err.stack);
  }

  return {
    outcome: 'transient_error',
    error: `Erro ao sincronizar agendamento com Google Calendar durante ${contexto}`,
    message: err && err.message ? err.message : String(err),
    partialSuccess: true,
    gcalSyncFailed: true,
    tokenExpired: false,
    needsReconnect: false,
    agendamento: dados || null
  };
}

async function montarRespostaFalhaGcal(res, err, contexto, dados, options = {}) {
  const statusCode = 200;
  const ownerEmail = options && options.ownerEmail ? options.ownerEmail : null;
  const agendamentoId = options && options.agendamentoId ? options.agendamentoId : (dados && dados.id ? dados.id : null);
  const resultado = await tratarFalhaGcalAgendamento(ownerEmail, agendamentoId, err, contexto, dados);

  if (resultado.outcome === 'not_connected') {
    return res.status(statusCode).json(resultado.agendamento);
  }

  if (resultado.outcome === 'token_expired') {
    return res.status(statusCode).json({
      message: resultado.message,
      tokenExpired: true,
      needsReconnect: true,
      agendamento: resultado.agendamento
    });
  }

  return res.status(statusCode).json({
    error: resultado.error,
    message: resultado.message,
    partialSuccess: true,
    gcalSyncFailed: true,
    agendamento: resultado.agendamento
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
          gcalStatus: 'pendente',
          ...(googleCalendarEventIdExistente ? { googleCalendarEventId: googleCalendarEventIdExistente } : {})
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
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
              gcalStatus: 'pendente',
              ...(googleCalendarEventIdExistente ? { googleCalendarEventId: googleCalendarEventIdExistente } : {})
            }
          },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(normalizarAgendamentoParaResposta(agendamento));
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
      ...(!estavaEmEstadoTerminal || deveReabrirTentativas ? { gcalStatus: 'pendente' } : {}),
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

    return res.json(atualizadoParaGCalBase);
  } catch (err) {
    responderErroAgendamento(res, err, 'atualizar agendamento');
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
    const googleCalendarEventId = excluidoParaGCal && excluidoParaGCal.googleCalendarEventId
      ? String(excluidoParaGCal.googleCalendarEventId)
      : null;

    await Agendamento.findOneAndDelete({ ownerEmail, id });

    if (googleCalendarEventId) {
      await GcalReconciliationQueue.findOneAndUpdate(
        { ownerEmail, googleCalendarEventId },
        {
          $set: {
            ownerEmail,
            action: 'delete',
            googleCalendarEventId,
            agendamentoId: id,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    return res.status(200).json({
      ok: true,
      deleted: true,
      id,
      queuedForGcalDelete: Boolean(googleCalendarEventId)
    });
  } catch (err) {
    responderErroAgendamento(res, err, 'excluir agendamento');
  }
}

async function sincronizarPendentesGcal(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    let gcalSyncFailed = false;
    let tokenExpired = false;
    let needsReconnect = false;
    let tokenExpiredMessage = null;
    let deletedCount = 0;
    const agendamentosSincronizados = [];

    // 1. Processar deleções pendentes na GcalReconciliationQueue (Outbox Pattern)
    let filaDelecoes = [];
    if (GcalReconciliationQueue && typeof GcalReconciliationQueue.find === 'function') {
      const consultaFila = GcalReconciliationQueue.find({ ownerEmail, action: 'delete' });
      filaDelecoes = await (consultaFila && typeof consultaFila.lean === 'function' ? consultaFila.lean() : consultaFila);
    }

    for (const item of (Array.isArray(filaDelecoes) ? filaDelecoes : [])) {
      if (!item || !item.googleCalendarEventId) continue;
      if (item.ownerEmail && item.ownerEmail !== ownerEmail) continue;

      try {
        await gcalSyncService.deleteEventFromGoogle(ownerEmail, item.googleCalendarEventId);
        if (typeof GcalReconciliationQueue.deleteOne === 'function') {
          await GcalReconciliationQueue.deleteOne({ _id: item._id, ownerEmail });
        }
        deletedCount += 1;
      } catch (delErr) {
        const status = delErr && (delErr.statusCode || delErr.status);
        const msgLower = delErr && delErr.message ? delErr.message.toLowerCase() : '';
        const isNotConnected = status === 404 && msgLower.includes('connection not found');
        const isTokenExp = Boolean(delErr && (
          delErr.message === 'invalid_grant' ||
          (delErr.error && delErr.error === 'invalid_grant') ||
          String(delErr).includes('invalid_grant') ||
          delErr.code === 'TOKEN_EXPIRED'
        ));

        if (isNotConnected) {
          // Permanece na fila para quando o usuário reconectar a conta Google
          continue;
        }

        if (isTokenExp) {
          tokenExpired = true;
          needsReconnect = true;
          tokenExpiredMessage = 'A conexão com o Google Agenda expirou. Reconecte nas Configurações.';
          try {
            await GoogleCalendarConnection.findOneAndUpdate(
              { ownerEmail },
              { $set: { status: 'expired' } }
            ).catch(() => {});
          } catch (_) {}
          continue;
        }

        if (status === 404 || status === 410) {
          // Evento já não existe no Google Calendar -> remover da fila com sucesso
          if (typeof GcalReconciliationQueue.deleteOne === 'function') {
            await GcalReconciliationQueue.deleteOne({ _id: item._id, ownerEmail });
          }
          deletedCount += 1;
          continue;
        }

        // Erro 5xx / timeout / rede -> permanece na fila e sinaliza falha parcial
        gcalSyncFailed = true;
      }
    }

    // 2. Processar agendamentos pendentes de criação/atualização do ownerEmail
    let listaPendentes = [];
    if (Agendamento && typeof Agendamento.find === 'function') {
      const consultaPendentes = Agendamento.find({
        ownerEmail,
        $or: [
          { gcalStatus: 'pendente' },
          { [GCAL_SYNC_PENDING_FIELD]: { $exists: true, $ne: null } }
        ]
      });
      listaPendentes = await (consultaPendentes && typeof consultaPendentes.lean === 'function'
        ? consultaPendentes.lean()
        : consultaPendentes);
    }

    for (const itemBruto of (Array.isArray(listaPendentes) ? listaPendentes : [])) {
      const agBase = normalizarAgendamentoParaResposta(itemBruto);
      if (!agBase || !agBase.id) continue;
      if (agBase.ownerEmail && agBase.ownerEmail !== ownerEmail) continue;
      if (agendamentoEmEstadoTerminal(agBase)) continue;

      const agParaGCal = await enriquecerAgendamentoComAluno(ownerEmail, { ...agBase });

      try {
        const resultadoGCal = agParaGCal.googleCalendarEventId
          ? await gcalSyncService.updateEventInGoogle(ownerEmail, montarPayloadGCal(agParaGCal))
          : await gcalSyncService.pushEventToGoogle(ownerEmail, montarPayloadGCal(agParaGCal));

        await persistirResultadoGcal(ownerEmail, agBase.id, resultadoGCal, agBase);
        agendamentosSincronizados.push(agBase);
      } catch (gcalErr) {
        const resultadoFalha = await tratarFalhaGcalAgendamento(
          ownerEmail,
          agBase.id,
          gcalErr,
          'flush',
          agBase
        );
        if (resultadoFalha.gcalSyncFailed) {
          gcalSyncFailed = true;
        }
        if (resultadoFalha.tokenExpired) {
          tokenExpired = true;
          needsReconnect = true;
          tokenExpiredMessage = resultadoFalha.message;
        }
        if (resultadoFalha.agendamento) {
          agendamentosSincronizados.push(resultadoFalha.agendamento);
        }
      }
    }

    return res.status(200).json({
      ok: true,
      partialSuccess: gcalSyncFailed,
      gcalSyncFailed,
      ...(tokenExpired ? {
        message: tokenExpiredMessage || 'A conexão com o Google Agenda expirou. Reconecte nas Configurações.',
        tokenExpired: true,
        needsReconnect: true
      } : {}),
      agendamentos: agendamentosSincronizados,
      agendamento: agendamentosSincronizados.length === 1 ? agendamentosSincronizados[0] : null,
      deletedCount
    });
  } catch (err) {
    responderErroAgendamento(res, err, 'sincronizar agendamentos pendentes com Google Calendar');
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
  sincronizarPendentesGcal,
  patchAgendamento,
  montarPayloadGCal
};
