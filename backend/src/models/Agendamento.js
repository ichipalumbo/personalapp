const mongoose = require('mongoose');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');

function normalizedOrOriginal(value, normalizer) {
  if (value === undefined || value === null) {
    return value;
  }

  const normalized = normalizer(value);
  return normalized || value;
}

const AgendamentoSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  id: { type: String, required: true },
  alunoId: String,
  alunoNome: String,
  data: { type: String, set: (value) => normalizedOrOriginal(value, normalizarDataParaISO) },
  horario: { type: String, set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM) },
  horarioInicio: { type: String, set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM) },
  horarioFim: { type: String, set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM) },
  tipo: String,
  status: { type: String, default: 'confirmado' },
  diaSemana: Number,
  semanasRecorrencia: Number,
  googleCalendarEventId: { type: String, default: null }
}, { strict: false });

AgendamentoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Agendamento || mongoose.model('Agendamento', AgendamentoSchema);
