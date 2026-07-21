const express = require('express');
const {
  listarBloqueiosExternos,
  obterBloqueioExterno,
  criarBloqueioExterno,
  atualizarBloqueioExterno,
  excluirBloqueioExterno,
  sincronizarBloqueiosExternosHandler
} = require('../controllers/bloqueioExternoController');

const router = express.Router();

router.get('/', listarBloqueiosExternos);
router.post('/', criarBloqueioExterno);
router.post('/sincronizar', sincronizarBloqueiosExternosHandler);
router.get('/:googleCalendarEventId', obterBloqueioExterno);
router.put('/:googleCalendarEventId', atualizarBloqueioExterno);
router.delete('/:googleCalendarEventId', excluirBloqueioExterno);

module.exports = router;
