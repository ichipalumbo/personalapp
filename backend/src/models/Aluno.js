const mongoose = require('mongoose');

const AlunoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  telefone: String,
  status: { type: String, default: 'ativo' },
  tipoPreco: String,
  valorAlinhado: Number,
  aulasSemanais: Number,
  historicoPagamentos: Array,
  criadoEm: { type: Date, default: Date.now }
}, { strict: false });

module.exports = mongoose.models.Aluno || mongoose.model('Aluno', AlunoSchema);
