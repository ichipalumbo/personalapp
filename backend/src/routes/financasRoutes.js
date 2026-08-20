const express = require('express');
const {
  listarFinancas,
  obterHistorico,
  marcarPagamento,
  atualizarAjuste
} = require('../controllers/financasController');

const router = express.Router();

router.get('/', listarFinancas);
router.get('/:alunoId/historico', obterHistorico);
router.patch('/:cicloId/pagamento', marcarPagamento);
router.patch('/:cicloId/ajuste', atualizarAjuste);

module.exports = router;
