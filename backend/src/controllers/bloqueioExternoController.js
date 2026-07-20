const BloqueioExterno = require('../models/BloqueioExterno');
const { sincronizarBloqueiosExternos } = require('../services/bloqueioExternoService');

async function listarBloqueiosExternos(req, res) {
  try {
    const filtro = {};
    // Support both old (semanaISO) and new (date range) filters for backward compatibility
    if (req.query.semanaISO) filtro.semanaISO = req.query.semanaISO;
    if (req.query.timeMin && req.query.timeMax) {
      filtro.data = { $gte: req.query.timeMin, $lte: req.query.timeMax };
    }
    const bloqueios = await BloqueioExterno.find(filtro);
    res.json(bloqueios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sincronizarBloqueiosExternosHandler(req, res) {
  try {
    const { eventos, timeMin, timeMax } = req.body;

    // Validação: precisa de timeMin e timeMax para definir o range
    if (!timeMin || !timeMax || typeof timeMin !== 'string' || typeof timeMax !== 'string') {
      return res.status(400).json({
        error: 'timeMin e timeMax são obrigatórios (formato: YYYY-MM-DD).'
      });
    }

    // timeMin deve ser <= timeMax
    if (timeMin > timeMax) {
      return res.status(400).json({
        error: 'timeMin deve ser menor ou igual a timeMax.'
      });
    }

    // Validação: eventos deve ser array
    if (!Array.isArray(eventos)) {
      return res.status(400).json({
        error: 'eventos deve ser um array.'
      });
    }

    const resultado = await sincronizarBloqueiosExternos(eventos, timeMin, timeMax);
    res.json({
      message: 'Bloqueios externos sincronizados com sucesso!',
      ...resultado
    });
  } catch (err) {
    console.error('[BloqueioExterno] Erro ao sincronizar:', err);
    res.status(500).json({ 
      error: 'Erro ao sincronizar bloqueios externos',
      details: err.message 
    });
  }
}

module.exports = {
  listarBloqueiosExternos,
  sincronizarBloqueiosExternosHandler
};
