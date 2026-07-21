const express = require('express');
const {
  listarAlunos,
  obterAluno,
  criarAluno,
  atualizarAluno,
  excluirAluno,
  obterKpisAluno,
  obterKpisTodosAlunos
} = require('../controllers/alunoController');

const router = express.Router();

router.route('/')
  .get(listarAlunos)
  .post(criarAluno);

router.get('/kpis/todos', obterKpisTodosAlunos);
router.get('/:id/kpis', obterKpisAluno);

router.route('/:id')
  .get(obterAluno)
  .put(atualizarAluno)
  .delete(excluirAluno);

module.exports = router;
