const express = require('express');
const {
  listarAgendamentos,
  obterAgendamento,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  patchAgendamento
} = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', listarAgendamentos);
router.post('/', criarAgendamento);
router.get('/:id', obterAgendamento);
router.put('/:id', atualizarAgendamento);
router.patch('/:id', patchAgendamento);
router.delete('/:id', excluirAgendamento);

module.exports = router;
