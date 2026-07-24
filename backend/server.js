require('dotenv').config();

const { createApp } = require('./src/app');
const { getEnvConfig } = require('./src/config/env');
const { connectToDatabase } = require('./src/config/database');

const { port, mongoURI } = getEnvConfig();
const app = createApp();

console.log('🔧 Inicializando servidor...');
console.log(`📦 Environment: ${process.env.NODE_ENV || 'desenvolvimento'}`);
console.log(`📡 Porta: ${port}`);

// Warmup opcional: em Vercel serverless, a conexão efetiva é garantida pelo middleware em /api.
connectToDatabase(mongoURI).catch((err) => {

  console.warn('⚠️ Warmup opcional do MongoDB falhou:', err && err.message ? err.message : err);

});


if (require.main === module) {
  app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
  });
}

module.exports = app;
