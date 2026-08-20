const express = require('express');
const {
  listarAlunos,
  obterAluno,
  criarAluno,
  atualizarAluno,
  excluirAluno,
  listarConsistenciaAgenda
} = require('../controllers/alunoController');

const router = express.Router();

router.route('/')
  .get(listarAlunos)
  .post(criarAluno);

router.get('/consistencia-agenda', listarConsistenciaAgenda);

router.route('/:id')
  .get(obterAluno)
  .put(atualizarAluno)
  .delete(excluirAluno);

module.exports = router;
