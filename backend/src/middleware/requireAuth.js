const { OAuth2Client } = require('google-auth-library');

const clientsByAudience = new Map();

function parseBearerToken(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') {
    return null;
  }

  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function getClient(audience) {
  if (!clientsByAudience.has(audience)) {
    clientsByAudience.set(audience, new OAuth2Client(audience));
  }

  return clientsByAudience.get(audience);
}

function createRequireAuth(options = {}) {
  const configuredAudiences = Array.isArray(options.googleClientIds)
    ? options.googleClientIds.filter(Boolean)
    : [];

  return async function requireAuth(req, res, next) {
    if (configuredAudiences.length === 0) {
      res.status(500).json({
        error: 'Google auth is not configured on the server.'
      });
      return;
    }

    const idToken = parseBearerToken(req.headers.authorization);
    if (!idToken) {
      res.status(401).json({
        error: 'Missing Google ID token. Use Authorization: Bearer <token>.'
      });
      return;
    }

    try {
      let payload = null;

      for (const audience of configuredAudiences) {
        try {
          const client = getClient(audience);
          const ticket = await client.verifyIdToken({
            idToken,
            audience
          });

          payload = ticket.getPayload();
          if (payload) {
            break;
          }
        } catch (error) {
          if (audience === configuredAudiences[configuredAudiences.length - 1]) {
            throw error;
          }
        }
      }

      if (!payload || !payload.email) {
        res.status(401).json({
          error: 'Google ID token is valid but does not include an email address.'
        });
        return;
      }

      req.auth = {
        ownerEmail: String(payload.email).toLowerCase(),
        emailVerified: payload.email_verified === true,
        googleUserId: payload.sub || null,
        name: payload.name || '',
        picture: payload.picture || '',
        audience: payload.aud || null
      };

      next();
    } catch (error) {
      console.error('[auth] Failed to verify Google ID token:', error.message);
      res.status(401).json({
        error: 'Invalid or expired Google ID token.'
      });
    }
  };
}

module.exports = {
  createRequireAuth
};