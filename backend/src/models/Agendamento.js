const mongoose = require('mongoose');

const AgendamentoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
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

module.exports = mongoose.models.Agendamento || mongoose.model('Agendamento', AgendamentoSchema);
