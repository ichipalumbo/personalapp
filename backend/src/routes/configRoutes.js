const express = require('express');
const {
  listarConfiguracoes,
  obterConfiguracao,
  obterConfiguracaoGradeHorarios,
  obterConfiguracaoPorChave,
  criarConfiguracao,
  atualizarConfiguracao,
  excluirConfiguracao,
  salvarConfiguracao
} = require('../controllers/configController');

const router = express.Router();

router.get('/', obterConfiguracao);
router.get('/grade_horarios', obterConfiguracaoGradeHorarios);
router.get('/all', listarConfiguracoes);
router.post('/', salvarConfiguracao);
router.post('/item', criarConfiguracao);
router.get('/:chave', obterConfiguracaoPorChave);
router.put('/:chave', atualizarConfiguracao);
router.delete('/:chave', excluirConfiguracao);

module.exports = router;
