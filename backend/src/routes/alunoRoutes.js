const express = require('express');
const {
  listarAlunos,
  obterKpisAluno,
  obterKpisTodosAlunos,
  sincronizarAlunos
} = require('../controllers/alunoController');

const router = express.Router();

router.get('/', listarAlunos);
router.get('/kpis/todos', obterKpisTodosAlunos);
router.get('/:alunoId/kpis', obterKpisAluno);
router.post('/sincronizar', sincronizarAlunos);

module.exports = router;
