const express = require('express');
const { exchangeAuthCode, obterConexaoGoogleCalendar } = require('../controllers/gcalAuthController');

const router = express.Router();

router.get('/connection', obterConexaoGoogleCalendar);
router.post('/exchange', exchangeAuthCode);

module.exports = router;