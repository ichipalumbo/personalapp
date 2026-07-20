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

// [TAG-BIDIRECIONAL-SYNC] Sincroniza agendamentos que foram editados no Google Calendar de volta pro MongoDB
async function sincronizarAgendamentosDoGCal(req, res) {
  try {
    const { agendamentos } = req.body;
    
    if (!Array.isArray(agendamentos)) {
      return res.status(400).json({ error: 'agendamentos deve ser um array.' });
    }

    if (agendamentos.length === 0) {
      return res.json({ message: 'Nenhum agendamento para sincronizar.', atualizados: 0, erros: [] });
    }

    const resultados = [];
    const erros = [];

    // Para cada agendamento enviado do GCal, atualiza o MongoDB
    for (const agendamentoGCal of agendamentos) {
      try {
        const { id, summary, data, horarioInicio, horarioFim, location } = agendamentoGCal;

        if (!id) {
          erros.push({ agendamentoId: id, erro: 'ID obrigatório.' });
          continue;
        }

        // Prepara objeto de atualização com apenas os campos que podem ter sido modificados no GCal
        const atualizacoes = {};
        if (summary) atualizacoes.descricao = summary; // Sincroniza títitulo para descricao
        if (data) atualizacoes.data = data;
        if (horarioInicio) atualizacoes.horarioInicio = horarioInicio;
        if (horarioFim) atualizacoes.horarioFim = horarioFim;
        if (location) atualizacoes.local = location;

        // Atualiza no MongoDB
        const atualizado = await Agendamento.findOneAndUpdate(
          { id },
          { $set: atualizacoes },
          { new: true }
        );

        if (atualizado) {
          resultados.push({
            id,
            sucesso: true,
            camposAtualizados: Object.keys(atualizacoes)
          });
        } else {
          erros.push({ agendamentoId: id, erro: 'Agendamento não encontrado.' });
        }
      } catch (err) {
        erros.push({ agendamentoId: agendamentoGCal.id, erro: err.message });
      }
    }

    res.json({
      message: 'Sincronização de agendamentos do GCal concluída.',
      atualizados: resultados.length,
      erros: erros.length,
      detalhes: {
        sucessos: resultados,
        erros
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listarAgendamentos,
  sincronizarAgendamentos,
  patchAgendamento,
  sincronizarAgendamentosDoGCal
};
