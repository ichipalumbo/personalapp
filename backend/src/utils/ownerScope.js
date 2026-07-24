function getOwnerEmailOrThrow(req) {
  const ownerEmail = req && req.auth && req.auth.ownerEmail;
  if (!ownerEmail) {
    const error = new Error('Authenticated ownerEmail is required.');
    error.statusCode = 401;
    throw error;
  }

  return ownerEmail;
}

module.exports = {
  getOwnerEmailOrThrow
};