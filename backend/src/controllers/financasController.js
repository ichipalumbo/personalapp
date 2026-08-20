const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const { responderErro } = require('../utils/controllerHelpers');
const financasService = require('../services/financasService');

function responderErroFinancas(res, err, contexto) {
  return responderErro(res, err, contexto, null, 'FinancasController');
}

async function listarFinancas(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const cards = await financasService.listarFinancasDoOwner(ownerEmail, new Date());
    res.json(cards);
  } catch (err) {
    responderErroFinancas(res, err, 'listar finanças');
  }
}

async function obterHistorico(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { alunoId } = req.params;
    const historico = await financasService.obterHistoricoFinancasPorAluno(ownerEmail, alunoId, new Date());
    res.json(historico);
  } catch (err) {
    responderErroFinancas(res, err, 'obter histórico financeiro');
  }
}

async function marcarPagamento(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { cicloId } = req.params;
    const ciclo = await financasService.marcarCicloComoPago(ownerEmail, cicloId, req.body || {}, new Date());
    res.json(ciclo);
  } catch (err) {
    responderErroFinancas(res, err, 'marcar pagamento');
  }
}

async function atualizarAjuste(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const { cicloId } = req.params;
    const ciclo = await financasService.atualizarAjusteCiclo(ownerEmail, cicloId, req.body || {}, new Date());
    res.json(ciclo);
  } catch (err) {
    responderErroFinancas(res, err, 'atualizar ajuste financeiro');
  }
}

module.exports = {
  listarFinancas,
  obterHistorico,
  marcarPagamento,
  atualizarAjuste
};
