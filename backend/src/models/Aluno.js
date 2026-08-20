const mongoose = require('mongoose');

const AlunoSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  id: { type: String, required: true },
  nome: { type: String, required: true },
  telefone: String,
  status: { type: String, enum: ['ativo', 'inativo'], default: 'ativo' },
  tipoPreco: String,
  valorAlinhado: Number,
  frequenciaSemanal: Number, // aulas semanais de contrato (campo gravado pelo formulário)
  aulasSemanais: Number, // LEGADO: mesmo significado de frequenciaSemanal em dados antigos
  diaVencimento: { type: Number, min: 2, max: 31, default: null },
  fechamentoMesCheio: { type: Boolean, default: false },
  metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], default: 'por_aula' },
  valorFixoCiclo: { type: Number, default: null },
  historicoPagamentos: Array, // DEPRECATED: não utilizado a partir da feature de Finanças por ciclo. Ver CicloFinanceiro.
  criadoEm: { type: Date, default: Date.now }
}, { strict: false });

AlunoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });

module.exports = mongoose.models.Aluno || mongoose.model('Aluno', AlunoSchema);
