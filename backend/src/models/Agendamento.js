const mongoose = require('mongoose');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');
const { normalizedOrOriginal } = require('../utils/valueNormalizer');

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
  reposicaoId: { type: String, default: null },
  googleCalendarEventId: { type: String, default: null }
}, { strict: false });

AgendamentoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Agendamento || mongoose.model('Agendamento', AgendamentoSchema);
