const express = require('express');
const {
  listarAgendamentos,
  sincronizarAgendamentos,
  patchAgendamento
} = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', listarAgendamentos);
router.post('/sincronizar', sincronizarAgendamentos);
router.patch('/:id', patchAgendamento);

module.exports = router;
