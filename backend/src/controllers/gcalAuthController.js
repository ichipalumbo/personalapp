const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const GoogleCalendarConnection = require('../models/GoogleCalendarConnection');
const { getOwnerEmailOrThrow } = require('../utils/ownerScope');
const { registerWebhookChannel, renewWebhookChannelForOwner } = require('../services/gcalSyncService');

function getEncryptionKey() {
  const rawKey = process.env.ENCRYPTION_KEY;
  if (!rawKey) {
    const error = new Error('ENCRYPTION_KEY is not configured.');
    error.statusCode = 500;
    throw error;
  }

  return crypto.createHash('sha256').update(String(rawKey)).digest();
}

function encryptRefreshToken(plaintext) {
  if (!plaintext) {
    return { encrypted: null, iv: null, authTag: null };
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final()
  ]);

  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: null
  };
}

function decryptRefreshToken(encrypted, iv) {
  if (!encrypted || !iv) {
    return null;
  }

  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), Buffer.from(iv, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(encrypted), 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

function responderErroGcalAuth(res, err, contexto) {
  const statusCode = err && err.statusCode ? err.statusCode : 500;

  console.error(`[GcalAuthController] Erro ao ${contexto}:`, err.message);
  if (err && err.stack) {
    console.error('[GcalAuthController] Stack:', err.stack);
  }

  res.status(statusCode).json({
    error: `Erro ao ${contexto}`,
    message: err.message,
    connectionState: GoogleCalendarConnection.db.readyState
  });
}

function limparPayloadAuth(payload) {
  const limpo = { ...(payload || {}) };
  delete limpo._id;
  delete limpo.__v;
  return limpo;
}

function obterValor(payload, chaves) {
  for (const chave of chaves) {
    if (payload && payload[chave] !== undefined && payload[chave] !== null && String(payload[chave]).trim() !== '') {
      return payload[chave];
    }
  }

  return null;
}

function montarRespostaConexao(connection) {
  return {
    ownerEmail: connection.ownerEmail,
    googleUserId: connection.googleUserId,
    googleEmail: connection.googleEmail,
    googleName: connection.googleName,
    googlePicture: connection.googlePicture,
    calendarId: connection.calendarId,
    scope: connection.scope,
    accessTokenExpiryDate: connection.accessTokenExpiryDate,
    syncToken: connection.syncToken,
    channelId: connection.channelId,
    channelResourceId: connection.channelResourceId,
    channelExpiration: connection.channelExpiration,
    lastSyncAt: connection.lastSyncAt,
    lastWebhookAt: connection.lastWebhookAt,
    lastConnectedAt: connection.lastConnectedAt,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  };
}

async function trocarCodigoPorTokens(authCode) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GIS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error('Google OAuth configuration is missing on the server.');
    error.statusCode = 500;
    throw error;
  }

  const oauth2Client = new OAuth2Client({
    clientId,
    clientSecret,
    redirectUri: 'postmessage'
  });

  const { tokens } = await oauth2Client.getToken({
    code: authCode,
    redirect_uri: 'postmessage'
  });

  return { oauth2Client, tokens, clientId };
}

async function exchangeAuthCode(req, res) {
  try {
    const payload = limparPayloadAuth(req.body);
    const authCode = obterValor(payload, ['code', 'authCode', 'authorizationCode']);
    const ownerEmail = obterValor(payload, ['ownerEmail', 'email']);

    if (!ownerEmail) {
      return res.status(400).json({ error: 'ownerEmail é obrigatório.' });
    }

    if (!authCode) {
      return res.status(400).json({ error: 'authCode é obrigatório.' });
    }

    const normalizedOwnerEmail = String(ownerEmail).toLowerCase();
    const { oauth2Client, tokens, clientId } = await trocarCodigoPorTokens(String(authCode));

    if (!tokens || !tokens.refresh_token) {
      return res.status(400).json({
        error: 'Google did not return a refresh_token.',
        message: 'The user likely already granted access before. Ask them to revoke the app access in Google Account permissions and try again.'
      });
    }

    let tokenInfo = null;

    if (tokens.id_token) {
      try {
        const verified = await oauth2Client.verifyIdToken({
          idToken: tokens.id_token,
          audience: clientId
        });
        tokenInfo = verified.getPayload();
      } catch (verifyErr) {
        console.warn('[GcalAuthController] Não foi possível verificar o id_token; usando fallback do access_token.', verifyErr.message);
      }
    }

    if (!tokenInfo && tokens.access_token) {
      try {
        tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
      } catch (infoErr) {
        console.warn('[GcalAuthController] Não foi possível ler metadados do access_token.', infoErr.message);
      }
    }
    const accessTokenExpiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    const encryptedRefreshToken = encryptRefreshToken(tokens.refresh_token);
    const profileEmail = tokenInfo && tokenInfo.email ? String(tokenInfo.email).toLowerCase() : normalizedOwnerEmail;

    const connection = await GoogleCalendarConnection.findOneAndUpdate(
      { ownerEmail: normalizedOwnerEmail },
      {
        $set: {
          ownerEmail: normalizedOwnerEmail,
          googleUserId: tokenInfo && tokenInfo.sub ? String(tokenInfo.sub) : null,
          googleEmail: profileEmail,
          googleName: tokenInfo && tokenInfo.name ? tokenInfo.name : null,
          googlePicture: tokenInfo && tokenInfo.picture ? tokenInfo.picture : null,
          calendarId: 'primary',
          refreshTokenEncrypted: encryptedRefreshToken.encrypted,
          refreshTokenIv: encryptedRefreshToken.iv,
          refreshTokenAuthTag: encryptedRefreshToken.authTag,
          scope: tokens.scope || null,
          accessTokenExpiryDate,
          lastConnectedAt: new Date()
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    oauth2Client.setCredentials(tokens);
    const registeredConnection = await registerWebhookChannel(connection, oauth2Client);

    return res.status(200).json({
      message: 'Google Calendar connection saved successfully.',
      connection: montarRespostaConexao(registeredConnection)
    });
  } catch (err) {
    if (err && err.message === 'invalid_grant') {
      return res.status(400).json({
        error: 'Google authorization code is invalid or expired.'
      });
    }

    responderErroGcalAuth(res, err, 'trocar auth code do Google Calendar');
  }
}

async function obterConexaoGoogleCalendar(req, res) {
  try {
    const payload = limparPayloadAuth(req.query);
    const ownerEmail = obterValor(payload, ['ownerEmail', 'email']);

    if (!ownerEmail) {
      return res.status(400).json({ error: 'ownerEmail é obrigatório.' });
    }

    const connection = await GoogleCalendarConnection.findOne({ ownerEmail: String(ownerEmail).toLowerCase() });

    if (!connection) {
      return res.status(404).json({
        connected: false,
        error: 'Google Calendar connection not found.'
      });
    }

    return res.json({
      connected: true,
      connection: montarRespostaConexao(connection)
    });
  } catch (err) {
    responderErroGcalAuth(res, err, 'obter conexão do Google Calendar');
  }
}

async function renewWebhookChannel(req, res) {
  try {
    const ownerEmail = getOwnerEmailOrThrow(req);
    const connection = await renewWebhookChannelForOwner(ownerEmail);

    return res.status(200).json({
      message: 'Google Calendar webhook renewed successfully.',
      connection: montarRespostaConexao(connection)
    });
  } catch (err) {
    responderErroGcalAuth(res, err, 'renovar webhook do Google Calendar');
  }
}

async function desconectarGoogleCalendar(req, res) {
  try {
    const payload = limparPayloadAuth(req.query);
    const ownerEmail = obterValor(payload, ['ownerEmail', 'email']);

    if (!ownerEmail) {
      return res.status(400).json({ error: 'ownerEmail é obrigatório.' });
    }

    const connection = await GoogleCalendarConnection.findOneAndDelete({ 
      ownerEmail: String(ownerEmail).toLowerCase() 
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Google Calendar connection not found.',
        message: 'Nenhuma conexão do Google Calendar foi encontrada para este email.'
      });
    }

    return res.json({
      success: true,
      message: 'Google Calendar connection disconnected successfully.',
      disconnected: true
    });
  } catch (err) {
    responderErroGcalAuth(res, err, 'desconectar Google Calendar');
  }
}

module.exports = {
  exchangeAuthCode,
  obterConexaoGoogleCalendar,
  renewWebhookChannel,
  desconectarGoogleCalendar,
  encryptRefreshToken,
  decryptRefreshToken
};