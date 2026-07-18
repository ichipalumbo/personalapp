const Agendamento = require('../models/Agendamento');
const { normalizarBloqueio } = require('../services/agendamentoService');

async function listarAgendamentos(req, res) {
  try {
    const agendamentos = await Agendamento.find();
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sincronizarAgendamentos(req, res) {
  try {
    const { agendamentos } = req.body;
    const agendamentosNormalizados = Array.isArray(agendamentos)
      ? agendamentos.map(normalizarBloqueio)
      : [];

    await Agendamento.deleteMany({});
    if (agendamentosNormalizados.length > 0) {
      await Agendamento.insertMany(agendamentosNormalizados);
    }

    res.json({ message: 'Agendamentos sincronizados com sucesso!' });
  } catch (err) {
    const statusCode = (err.message && err.message.includes('Bloqueio inválido')) ? 400 : 500;
    res.status(statusCode).json({ error: err.message });
  }
}

module.exports = {
  listarAgendamentos,
  sincronizarAgendamentos
};
