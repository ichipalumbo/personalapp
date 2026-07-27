function normalizeEmail(email) {
  return String(email || '').toLowerCase();
}

module.exports = {
  normalizeEmail
};