function getEnvConfig() {
  const googleClientIds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GIS_CLIENT_ID
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    port: process.env.PORT || 5000,
    // Prioritiza MONGO_URI (configurada manualmente) sobre MONGODB_URI (criada pelo Vercel)
    mongoURI: process.env.MONGO_URI || process.env.MONGODB_URI,
    googleClientIds
  };
}

module.exports = {
  getEnvConfig
};
