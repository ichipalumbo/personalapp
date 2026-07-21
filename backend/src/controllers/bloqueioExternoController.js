const BloqueioExterno = require('../models/BloqueioExterno');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');

function responderErroBloqueio(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  if (err && err.code === 11000) {
    res.status(409).json({ error: 'Já existe um bloqueio externo com esse googleCalendarEventId para este usuário.' });
    return;
  }

  console.error(`[BloqueioExterno] Erro ao ${contexto}:`, err);
  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    details: err.message
  });
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
    const payload = req.body || {};

    if (!payload.googleCalendarEventId) {
      return res.status(400).json({ error: 'googleCalendarEventId é obrigatório.' });
    }

    const bloqueio = await BloqueioExterno.create({ ...payload, ownerEmail });
    res.status(201).json(bloqueio);
  } catch (err) {
    responderErroBloqueio(res, err, 'criar bloqueio externo');
  }
}

async function atualizarBloqueioExterno(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { googleCalendarEventId } = req.params;
    const payload = { ...req.body };

    delete payload.ownerEmail;
    delete payload._id;

    if (payload.googleCalendarEventId && payload.googleCalendarEventId !== googleCalendarEventId) {
      return res.status(400).json({ error: 'O googleCalendarEventId do corpo deve ser igual ao da rota.' });
    }

    const bloqueio = await BloqueioExterno.findOneAndUpdate(
      { ownerEmail, googleCalendarEventId },
      { $set: { ...payload, googleCalendarEventId, ownerEmail } },
      { new: true, runValidators: true }
    );

    if (!bloqueio) {
      return res.status(404).json({ error: 'Bloqueio externo não encontrado.' });
    }

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
