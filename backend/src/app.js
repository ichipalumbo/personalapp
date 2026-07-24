const express = require('express');
const cors = require('cors');

const gcalAuthRoutes = require('./routes/gcalAuthRoutes');
const gcalWebhookRoutes = require('./routes/gcalWebhookRoutes');
const healthRoutes = require('./routes/healthRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const configRoutes = require('./routes/configRoutes');
const bloqueioExternoRoutes = require('./routes/bloqueioExternoRoutes');
const { getEnvConfig } = require('./config/env');
const { createRequireAuth } = require('./middleware/requireAuth');

function createApp() {
  const app = express();
  const { googleClientIds } = getEnvConfig();
  const requireAuth = createRequireAuth({ googleClientIds });

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', gcalAuthRoutes); // O prefixo pode ser /api/auth/gcal se preferir
  app.use('/api/webhooks', gcalWebhookRoutes); // Isso vai criar a rota /api/webhooks/gcal
  app.use('/', healthRoutes);
  app.use('/api/alunos', requireAuth, alunoRoutes);
  app.use('/api/agendamentos', requireAuth, agendamentoRoutes);
  app.use('/api/configuracao', requireAuth, configRoutes);
  app.use('/api/bloqueios-externos', requireAuth, bloqueioExternoRoutes);

  return app;
}

module.exports = {
  createApp
};
