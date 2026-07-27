const express = require('express');
const { exchangeAuthCode, obterConexaoGoogleCalendar, renewWebhookChannel, desconectarGoogleCalendar } = require('../controllers/gcalAuthController');

function createGcalAuthRoutes(requireAuth) {
	const router = express.Router();

	router.get('/connection', obterConexaoGoogleCalendar);
	router.post('/exchange', exchangeAuthCode);
	router.post('/webhook/renew', requireAuth, renewWebhookChannel);
	router.delete('/connection', desconectarGoogleCalendar);

	return router;
}

module.exports = {
	createGcalAuthRoutes
};