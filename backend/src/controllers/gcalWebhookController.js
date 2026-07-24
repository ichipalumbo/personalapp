const { syncConnectionByWebhookHeaders } = require('../services/gcalSyncService');

async function processGcalWebhook(req, res) {
  try {
    const channelId = req.get('x-goog-channel-id');
    const resourceId = req.get('x-goog-resource-id');

    if (!channelId || !resourceId) {
      return res.status(400).json({
        error: 'Missing Google Calendar webhook identifiers.',
        message: 'x-goog-channel-id and x-goog-resource-id are required.'
      });
    }

    await syncConnectionByWebhookHeaders(channelId, resourceId);

    return res.status(200).send('OK');
  } catch (err) {
    const statusCode = err && err.statusCode ? err.statusCode : 500;

    console.error('[GcalWebhookController] Erro ao processar webhook do Google Calendar:', err.message);
    if (err && err.stack) {
      console.error('[GcalWebhookController] Stack:', err.stack);
    }

    return res.status(statusCode).json({
      error: 'Erro ao processar webhook do Google Calendar.',
      message: err.message
    });
  }
}

module.exports = {
  processGcalWebhook
};