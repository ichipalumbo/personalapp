const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
  chave: { type: String, default: 'grade_horarios', unique: true },
  horaInicio: { type: String, default: '06:00' },
  horaFim: { type: String, default: '22:00' }
}, { strict: false });

module.exports = mongoose.models.Config || mongoose.model('Config', ConfigSchema);
