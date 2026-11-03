const express = require('express');
const {
  listarAgendamentos,
  obterAgendamento,
  criarAgendamento,
  atualizarAgendamento,
  excluirAgendamento,
  sincronizarPendentesGcal,
  patchAgendamento
} = require('../controllers/agendamentoController');

const router = express.Router();

router.route('/')
  .get(listarAgendamentos)
  .post(criarAgendamento);

router.post('/flush-gcal', sincronizarPendentesGcal);

router.route('/:id')
  .get(obterAgendamento)
  .put(atualizarAgendamento)
  .patch(patchAgendamento)
  .delete(excluirAgendamento);

module.exports = router;
