const express = require('express');
const {
  listarBloqueiosExternos,
  obterBloqueioExterno,
  criarBloqueioExterno,
  atualizarBloqueioExterno,
  excluirBloqueioExterno
} = require('../controllers/bloqueioExternoController');

const router = express.Router();

router.route('/')
  .get(listarBloqueiosExternos)
  .post(criarBloqueioExterno);

router.route('/:id')
  .get(obterBloqueioExterno)
  .put(atualizarBloqueioExterno)
  .delete(excluirBloqueioExterno);

module.exports = router;
