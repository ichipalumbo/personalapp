const mongoose = require('mongoose');
const { normalizarDataParaISO, normalizarHorarioHHMM } = require('../utils/time');
const { normalizedOrOriginal } = require('../utils/valueNormalizer');

const ReposicaoSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true },
  id: { type: String, required: true },
  alunoId: { type: String, required: true },
  alunoNome: { type: String, default: null },
  dataOriginal: {
    type: String,
    default: null,
    set: (value) => normalizedOrOriginal(value, normalizarDataParaISO)
  },
  horarioOriginal: {
    type: String,
    default: null,
    set: (value) => normalizedOrOriginal(value, normalizarHorarioHHMM)
  },
  cobravel: { type: Boolean, required: true },
  cicloCobrancaResolvido: {
    type: {
      inicio: {
        type: String,
        default: null,
        set: (value) => normalizedOrOriginal(value, normalizarDataParaISO)
      },
      fim: {
        type: String,
        default: null,
        set: (value) => normalizedOrOriginal(value, normalizarDataParaISO)
      }
    },
    default: null
  },
  status: {
    type: String,
    enum: ['pendente', 'agendada', 'realizada', 'expirada'],
    default: 'pendente'
  },
  agendamentoOriginalId: { type: String, default: null },
  agendamentoReposicaoId: { type: String, default: null },
  validoAte: {
    type: String,
    default: null,
    set: (value) => normalizedOrOriginal(value, normalizarDataParaISO)
  },
  dataEnvio: {
    type: String,
    default: null,
    set: (value) => normalizedOrOriginal(value, normalizarDataParaISO)
  },
  historico: {
    type: [{
      evento: { type: String, required: true },
      data: { type: String, required: true },
      agendamentoId: { type: String, default: null }
    }],
    default: []
  }
});

ReposicaoSchema.index({ ownerEmail: 1, id: 1 }, { unique: true });
ReposicaoSchema.index({ ownerEmail: 1, alunoId: 1, status: 1 });

module.exports = mongoose.models.Reposicao || mongoose.model('Reposicao', ReposicaoSchema);
