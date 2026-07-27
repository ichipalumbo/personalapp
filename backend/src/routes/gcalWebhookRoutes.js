const express = require('express');
const { processGcalWebhook } = require('../controllers/gcalWebhookController');

const router = express.Router();

router.post('/gcal', processGcalWebhook);

module.exports = router;