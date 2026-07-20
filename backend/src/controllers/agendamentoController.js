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

async function patchAgendamento(req, res) {
  try {
    const { id } = req.params;
    const { googleCalendarEventId } = req.body;

    if (googleCalendarEventId === undefined) {
      return res.status(400).json({ error: 'googleCalendarEventId é obrigatório no corpo da requisição.' });
    }

    const atualizado = await Agendamento.findOneAndUpdate(
      { id },
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

module.exports = {
  listarAgendamentos,
  sincronizarAgendamentos,
  patchAgendamento
};
