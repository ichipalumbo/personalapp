const express = require('express');
const { exchangeAuthCode, obterConexaoGoogleCalendar, renewWebhookChannel } = require('../controllers/gcalAuthController');

function createGcalAuthRoutes(requireAuth) {
	const router = express.Router();

	router.get('/connection', obterConexaoGoogleCalendar);
	router.post('/exchange', exchangeAuthCode);
	router.post('/webhook/renew', requireAuth, renewWebhookChannel);

	return router;
}

module.exports = {
	createGcalAuthRoutes
};