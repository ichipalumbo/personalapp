function getEnvConfig() {
  return {
    port: process.env.PORT || 5000,
    // Prioritiza MONGO_URI (configurada manualmente) sobre MONGODB_URI (criada pelo Vercel)
    mongoURI: process.env.MONGO_URI || process.env.MONGODB_URI
  };
}

module.exports = {
  getEnvConfig
};
