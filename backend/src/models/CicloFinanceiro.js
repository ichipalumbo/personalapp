const mongoose = require('mongoose');

const CicloFinanceiroSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  alunoId: { type: String, required: true, index: true },
  cicloInicio: { type: String, required: true },
  cicloFim: { type: String, required: true },
  aulasContadas: { type: Number, default: 0 },
  aulasManuaisExtras: { type: Number, default: 0 },
  observacaoAjuste: { type: String, default: '' },
  metodoCobranca: { type: String, enum: ['por_aula', 'valor_fixo'], required: true },
  precoAulaSnapshot: { type: Number, default: null },
  valorFixoSnapshot: { type: Number, default: null },
  valorTotalCiclo: { type: Number, required: true },
  status: { type: String, enum: ['em_aberto', 'pago', 'atrasado'], default: 'em_aberto' },
  dataPagamento: { type: String, default: null },
  formaPagamento: { type: String, default: null },
  criadoEm: { type: Date, default: Date.now },
  atualizadoEm: { type: Date, default: Date.now }
}, { strict: false });

CicloFinanceiroSchema.index({ ownerEmail: 1, alunoId: 1, cicloInicio: 1 }, { unique: true });

module.exports = mongoose.models.CicloFinanceiro || mongoose.model('CicloFinanceiro', CicloFinanceiroSchema);
