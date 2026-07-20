require('dotenv').config();

const { createApp } = require('./src/app');
const { getEnvConfig } = require('./src/config/env');
const { connectToDatabase } = require('./src/config/database');

const { port, mongoURI } = getEnvConfig();
const app = createApp();

connectToDatabase(mongoURI);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
  });
}

module.exports = app;
