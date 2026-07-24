const mongoose = require('mongoose');

const AgendamentoSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  id: { type: String, required: true },
  alunoId: String,
  alunoNome: String,
  data: String,
  horario: String,
  tipo: String,
  status: { type: String, default: 'confirmado' },
  diaSemana: Number,
  semanasRecorrencia: Number,
  googleCalendarEventId: { type: String, default: null }
}, { strict: false });

AgendamentoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Agendamento || mongoose.model('Agendamento', AgendamentoSchema);
