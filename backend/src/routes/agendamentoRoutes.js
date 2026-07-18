const express = require('express');
const {
  listarAgendamentos,
  sincronizarAgendamentos
} = require('../controllers/agendamentoController');

const router = express.Router();

router.get('/', listarAgendamentos);
router.post('/sincronizar', sincronizarAgendamentos);

module.exports = router;
