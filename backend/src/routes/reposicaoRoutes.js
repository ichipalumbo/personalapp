const express = require('express');
const {
  listarReposicoes,
  obterReposicao,
  criarReposicao,
  atualizarReposicao,
  excluirReposicao,
  adicionarHistoricoReposicao
} = require('../controllers/reposicaoController');

const router = express.Router();

router.post('/:id/historico', adicionarHistoricoReposicao);

router.route('/')
  .get(listarReposicoes)
  .post(criarReposicao);

router.route('/:id')
  .get(obterReposicao)
  .patch(atualizarReposicao)
  .delete(excluirReposicao);

module.exports = router;
