const BloqueioExterno = require('../models/BloqueioExterno');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroBloqueio(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  console.error(`[BloqueioExterno] Erro ao ${contexto}:`, err);
  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    details: err.message
  });
}

function limparPayloadBloqueio(payload) {
  const limpo = { ...(payload || {}) };
  delete limpo._id;
  delete limpo.__v;
  delete limpo.ownerEmail;
  return limpo;
}

async function listarBloqueiosExternos(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const filtro = { ownerEmail };

    if (req.query.semanaISO) filtro.semanaISO = req.query.semanaISO;
    if (req.query.timeMin && req.query.timeMax) {
      filtro.data = { $gte: req.query.timeMin, $lte: req.query.timeMax };
    }

    const bloqueios = await BloqueioExterno.find(filtro);
    res.json(bloqueios);
  } catch (err) {
    responderErroBloqueio(res, err, 'listar bloqueios externos');
  }
}

async function obterBloqueioExterno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { googleCalendarEventId } = req.params;
    const bloqueio = await BloqueioExterno.findOne({ ownerEmail, googleCalendarEventId });

    if (!bloqueio) {
      return res.status(404).json({ error: 'Bloqueio externo não encontrado.' });
    }

    res.json(bloqueio);
  } catch (err) {
    responderErroBloqueio(res, err, 'obter bloqueio externo');
  }
}

async function criarBloqueioExterno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const payload = limparPayloadBloqueio(req.body);

    if (!payload.googleCalendarEventId) {
      return res.status(400).json({ error: 'googleCalendarEventId é obrigatório.' });
    }

    const bloqueio = await BloqueioExterno.findOneAndUpdate(
      { ownerEmail, googleCalendarEventId: payload.googleCalendarEventId },
      { $set: { ...payload, ownerEmail, googleCalendarEventId: payload.googleCalendarEventId } },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json(bloqueio);
  } catch (err) {
    if (err && err.code === 11000) {
      try {
        const ownerEmail = getOwnerEmailOrThrow(req);
        const payload = limparPayloadBloqueio(req.body);

        const bloqueio = await BloqueioExterno.findOneAndUpdate(
          { ownerEmail, googleCalendarEventId: payload.googleCalendarEventId },
          { $set: { ...payload, ownerEmail, googleCalendarEventId: payload.googleCalendarEventId } },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json(bloqueio);
      } catch (fallbackErr) {
        return responderErroBloqueio(res, fallbackErr, 'criar bloqueio externo');
      }
    }

    responderErroBloqueio(res, err, 'criar bloqueio externo');
  }
}

async function atualizarBloqueioExterno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { googleCalendarEventId } = req.params;
    const payload = limparPayloadBloqueio(req.body);

    if (payload.googleCalendarEventId && payload.googleCalendarEventId !== googleCalendarEventId) {
      return res.status(400).json({ error: 'O googleCalendarEventId do corpo deve ser igual ao da rota.' });
    }

    const bloqueio = await BloqueioExterno.findOneAndUpdate(
      { ownerEmail, googleCalendarEventId },
      { $set: { ...payload, googleCalendarEventId, ownerEmail } },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(bloqueio);
  } catch (err) {
    responderErroBloqueio(res, err, 'atualizar bloqueio externo');
  }
}

async function excluirBloqueioExterno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { googleCalendarEventId } = req.params;
    const bloqueio = await BloqueioExterno.findOneAndDelete({ ownerEmail, googleCalendarEventId });

    if (!bloqueio) {
      return res.status(404).json({ error: 'Bloqueio externo não encontrado.' });
    }

    res.status(204).send();
  } catch (err) {
    responderErroBloqueio(res, err, 'excluir bloqueio externo');
  }
}

module.exports = {
  listarBloqueiosExternos,
  obterBloqueioExterno,
  criarBloqueioExterno,
  atualizarBloqueioExterno,
  excluirBloqueioExterno
};
