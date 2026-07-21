const express = require('express');
const {
  listarAgendamentos,
  obterAgendamento,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  sincronizarAgendamentos,
  patchAgendamento,
  sincronizarAgendamentosDoGCal
} = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', listarAgendamentos);
router.post('/', criarAgendamento);
router.post('/sincronizar', sincronizarAgendamentos);
router.post('/sincronizar-do-gcal', sincronizarAgendamentosDoGCal);
router.get('/:id', obterAgendamento);
router.put('/:id', atualizarAgendamento);
router.patch('/:id', patchAgendamento);
router.delete('/:id', excluirAgendamento);

module.exports = router;
