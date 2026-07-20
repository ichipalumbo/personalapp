const Config = require('../models/Config');

async function obterConfiguracao(req, res) {
  try {
    let config = await Config.findOne({ chave: 'grade_horarios' });
    if (!config) {
      config = await Config.create({ chave: 'grade_horarios' });
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function salvarConfiguracao(req, res) {
  try {
    const { horaInicio, horaFim } = req.body;
    const config = await Config.findOneAndUpdate(
      { chave: 'grade_horarios' },
      { horaInicio, horaFim },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  obterConfiguracao,
  salvarConfiguracao
};
