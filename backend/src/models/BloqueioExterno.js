const mongoose = require('mongoose');

// Armazena eventos externos do Google Calendar (criados fora do app).
// Coleção separada de `agendamentos` para que o sync destrutivo
// (deleteMany + insertMany) de agendamentos nunca apague estes registros.
const BloqueioExternoSchema = new mongoose.Schema({
  googleCalendarEventId: { type: String, required: true, unique: true },
  titulo:               { type: String, default: 'Evento externo' },
  data:                 { type: String },   // 'YYYY-MM-DD' ou PT-BR
  horarioInicio:        { type: String },   // 'HH:MM'
  horarioFim:           { type: String },   // 'HH:MM'
  fullDay:              { type: Boolean, default: false },
  semanaISO:            { type: String, required: true }, // ex. '2026-W29'
  source:               { type: String, default: 'google_external' }
});

module.exports = mongoose.models.BloqueioExterno ||
  mongoose.model('BloqueioExterno', BloqueioExternoSchema);
