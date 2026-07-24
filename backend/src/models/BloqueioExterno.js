const mongoose = require('mongoose');

// Armazena eventos externos do Google Calendar (criados fora do app).
// Coleção separada de `agendamentos` para que o sync destrutivo
// (deleteMany + insertMany) de agendamentos nunca apague estes registros.
const BloqueioExternoSchema = new mongoose.Schema({
  ownerEmail:           { type: String, required: true, index: true },
  googleCalendarEventId:{ type: String, required: true },
  titulo:               { type: String, default: 'Evento externo' },
  data:                 { type: String },   // 'YYYY-MM-DD' ou PT-BR
  horarioInicio:        { type: String },   // 'HH:MM'
  horarioFim:           { type: String },   // 'HH:MM'
  fullDay:              { type: Boolean, default: false },
  semanaISO:            { type: String, default: null }, // ex. '2026-W29' (opcional, calculado automaticamente)
  source:               { type: String, default: 'google_external' }
});

BloqueioExternoSchema.index({ ownerEmail: 1, googleCalendarEventId: 1 }, { unique: true });

module.exports = mongoose.models.BloqueioExterno ||
  mongoose.model('BloqueioExterno', BloqueioExternoSchema);
