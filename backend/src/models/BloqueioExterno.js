const mongoose = require('mongoose');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');
const { normalizedOrOriginal } = require('../utils/valueNormalizer');

// Armazena eventos externos do Google Calendar (criados fora do app).
// Coleção separada de `agendamentos` para que o sync destrutivo
// (deleteMany + insertMany) de agendamentos nunca apague estes registros.
const BloqueioExternoSchema = new mongoose.Schema({
  ownerEmail:           { type: String, required: true, index: true },
  googleCalendarEventId:{ type: String, required: true },
  titulo:               { type: String, default: 'Evento externo' },
  data:                 { type: String, set: (value) => normalizedOrOriginal(value, normalizarDataParaISO) },
  horarioInicio:        { type: String, set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM) },
  horarioFim:           { type: String, set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM) },
  fullDay:              { type: Boolean, default: false },
  semanaISO:            { type: String, default: null }, // ex. '2026-W29' (opcional, calculado automaticamente)
  source:               { type: String, default: 'google_external' }
});

BloqueioExternoSchema.index({ ownerEmail: 1, googleCalendarEventId: 1 }, { unique: true });

module.exports = mongoose.models.BloqueioExterno ||
  mongoose.model('BloqueioExterno', BloqueioExternoSchema);
