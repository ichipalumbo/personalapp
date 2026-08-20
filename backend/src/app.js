const express = require('express');
const cors = require('cors');

const { createGcalAuthRoutes } = require('./routes/gcalAuthRoutes');
const gcalWebhookRoutes = require('./routes/gcalWebhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const financasRoutes = require('./routes/financasRoutes');
const configRoutes = require('./routes/configRoutes');
const bloqueioExternoRoutes = require('./routes/bloqueioExternoRoutes');
const { getEnvConfig } = require('./config/env');
const { connectToDatabase } = require('./config/database');
const { createRequireAuth } = require('./middleware/requireAuth');

function createApp() {
  const app = express();
  const { googleClientIds, mongoURI } = getEnvConfig();
  const requireAuth = createRequireAuth({ googleClientIds });
  const gcalAuthRoutes = createGcalAuthRoutes(requireAuth);

  app.use(cors());
  app.use(express.json());

  app.get('/google66565d4ae85c3fd9.html', (req, res) => {
    res.type('text/plain').send('google-site-verification: google66565d4ae85c3fd9.html');
  });

  app.use('/api', async (req, res, next) => {
    try {
      await connectToDatabase(mongoURI);
      next();
    } catch (error) {
      console.error('❌ Falha ao conectar no MongoDB para requisição API:', error && error.message ? error.message : error);
      res.status(500).json({
        error: 'Database connection failed.',
        message: error && error.message ? error.message : 'Unknown database connection error.'
      });
    }
  });

  app.use('/api/gcal', gcalAuthRoutes);
  app.use('/api/auth', gcalAuthRoutes);
  app.use('/api/webhooks', gcalWebhookRoutes);
  app.use('/', healthRoutes);
  app.use('/api/alunos', requireAuth, alunoRoutes);
  app.use('/api/agendamentos', requireAuth, agendamentoRoutes);
  app.use('/api/financas', requireAuth, financasRoutes);
  app.use('/api/configuracao', requireAuth, configRoutes);
  app.use('/api/bloqueios-externos', requireAuth, bloqueioExternoRoutes);

  return app;
}

module.exports = {
  createApp
};
