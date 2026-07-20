const express = require('express');
const {
  listarAgendamentos,
  sincronizarAgendamentos,
  patchAgendamento,
  sincronizarAgendamentosDoGCal
} = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', listarAgendamentos);
router.post('/sincronizar', sincronizarAgendamentos);
router.post('/sincronizar-do-gcal', sincronizarAgendamentosDoGCal);
router.patch('/:id', patchAgendamento);

module.exports = router;
