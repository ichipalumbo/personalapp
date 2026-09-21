const express = require('express');
const {
  listarReposicoes,
  obterReposicao,
  criarReposicao,
  atualizarReposicao,
  reabrirReposicao,
  excluirReposicao,
  adicionarHistoricoReposicao
} = require('../controllers/reposicaoController');

const router = express.Router();

router.post('/:id/historico', adicionarHistoricoReposicao);
router.post('/:id/reabrir', reabrirReposicao);

router.route('/')
  .get(listarReposicoes)
  .post(criarReposicao);

router.route('/:id')
  .get(obterReposicao)
  .patch(atualizarReposicao)
  .delete(excluirReposicao);

module.exports = router;
