const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  chave: { type: String, default: 'grade_horarios' },
  horaInicio: { type: String, default: '06:00' },
  horaFim: { type: String, default: '22:00' }
}, { strict: false });

ConfigSchema.index({ ownerEmail: 1, chave: 1 }, { unique: true });

module.exports = mongoose.models.Config || mongoose.model('Config', ConfigSchema);
