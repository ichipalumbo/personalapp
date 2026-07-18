function getEnvConfig() {
  return {
    port: process.env.PORT || 5000,
    mongoURI: process.env.MONGODB_URI || process.env.MONGO_URI
  };
}

module.exports = {
  getEnvConfig
};
