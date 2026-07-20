const BloqueioExterno = require('../models/BloqueioExterno');
const { sincronizarBloqueiosExternos } = require('../services/bloqueioExternoService');

async function listarBloqueiosExternos(req, res) {
  try {
    const filtro = {};
    if (req.query.semanaISO) filtro.semanaISO = req.query.semanaISO;
    const bloqueios = await BloqueioExterno.find(filtro);
    res.json(bloqueios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sincronizarBloqueiosExternosHandler(req, res) {
  try {
    const { eventos, semanaISO } = req.body;

    if (!semanaISO || typeof semanaISO !== 'string') {
      return res.status(400).json({ error: 'semanaISO é obrigatório (ex. "2026-W29").' });
    }

    const salvos = await sincronizarBloqueiosExternos(eventos || [], semanaISO);
    res.json({ message: 'Bloqueios externos sincronizados com sucesso!', total: salvos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listarBloqueiosExternos,
  sincronizarBloqueiosExternosHandler
};
