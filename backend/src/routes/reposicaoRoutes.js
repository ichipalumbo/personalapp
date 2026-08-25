const express = require('express');
const {
  listarReposicoes,
  obterReposicao,
  criarReposicao,
  atualizarReposicao,
  adicionarHistoricoReposicao
} = require('../controllers/reposicaoController');

const router = express.Router();

router.post('/:id/historico', adicionarHistoricoReposicao);

router.route('/')
  .get(listarReposicoes)
  .post(criarReposicao);

router.route('/:id')
  .get(obterReposicao)
  .patch(atualizarReposicao);

module.exports = router;
