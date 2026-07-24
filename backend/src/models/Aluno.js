const mongoose = require('mongoose');

const AlunoSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  id: { type: String, required: true },
  nome: { type: String, required: true },
  telefone: String,
  status: { type: String, enum: ['ativo', 'inativo'], default: 'ativo' },
  tipoPreco: String,
  valorAlinhado: Number,
  aulasSemanais: Number,
  historicoPagamentos: Array,
  criadoEm: { type: Date, default: Date.now }
}, { strict: false });

AlunoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Aluno || mongoose.model('Aluno', AlunoSchema);
