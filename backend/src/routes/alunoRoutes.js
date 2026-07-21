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

router.get('/', listarAlunos);
router.post('/', criarAluno);
router.get('/kpis/todos', obterKpisTodosAlunos);
router.get('/:alunoId/kpis', obterKpisAluno);
router.get('/:alunoId', obterAluno);
router.put('/:alunoId', atualizarAluno);
router.delete('/:alunoId', excluirAluno);

module.exports = router;
