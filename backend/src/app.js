const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/healthRoutes');
const alunoRoutes = require('./routes/alunoRoutes');
const agendamentoRoutes = require('./routes/agendamentoRoutes');
const configRoutes = require('./routes/configRoutes');

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/', healthRoutes);
  app.use('/api/alunos', alunoRoutes);
  app.use('/api/agendamentos', agendamentoRoutes);
  app.use('/api/configuracao', configRoutes);

  return app;
}

module.exports = {
  createApp
};
