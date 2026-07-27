const crypto = require('crypto');

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

  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), Buffer.from(String(iv), 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(encrypted), 'base64')),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

module.exports = {
  getEncryptionKey,
  encryptRefreshToken,
  decryptRefreshToken
};
