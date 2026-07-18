const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.send('🚀 API da Agenda Personal Trainer rodando e pronta!');
});

module.exports = router;
