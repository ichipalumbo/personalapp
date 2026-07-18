const express = require('express');
const {
  obterConfiguracao,
  salvarConfiguracao
} = require('../controllers/configController');

const router = express.Router();

router.get('/', obterConfiguracao);
router.post('/', salvarConfiguracao);

module.exports = router;
