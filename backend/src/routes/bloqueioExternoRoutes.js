const express = require('express');
const {
  listarBloqueiosExternos,
  sincronizarBloqueiosExternosHandler
} = require('../controllers/bloqueioExternoController');

const router = express.Router();

router.get('/', listarBloqueiosExternos);
router.post('/sincronizar', sincronizarBloqueiosExternosHandler);

module.exports = router;
