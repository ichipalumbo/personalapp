const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// [TAG-BACKEND-MONGO-CONN] - Conexao dinamica via MONGODB_URI/MONGO_URI
const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!mongoURI) {
  console.error('❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada (MONGODB_URI ou MONGO_URI).');
} else {
  mongoose.connect(mongoURI)
    .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));
}

// [TAG-BACKEND-SCHEMAS] - Definicao de schemas e models

const AlunoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nome: { type: String, required: true },
  telefone: String,
  status: { type: String, default: 'ativo' },
  tipoPreco: String,
  valorAlinhado: Number,
  aulasSemanais: Number,
  historicoPagamentos: Array,
  criadoEm: { type: Date, default: Date.now }
}, { strict: false });
const Aluno = mongoose.model('Aluno', AlunoSchema);

const AgendamentoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  alunoId: String,
  alunoNome: String,
  data: String,
  horario: String,
  tipo: String,
  status: { type: String, default: 'confirmado' },
  diaSemana: Number,
  semanasRecorrencia: Number
}, { strict: false });
const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

const ConfigSchema = new mongoose.Schema({
  chave: { type: String, default: 'grade_horarios', unique: true },
  horaInicio: { type: String, default: '06:00' },
  horaFim: { type: String, default: '22:00' }
}, { strict: false });
const Config = mongoose.model('Config', ConfigSchema);


// [TAG-BACKEND-ROTAS] - Rotas principais da API

app.get('/', (req, res) => {
  res.send('🚀 API da Agenda Personal Trainer rodando e pronta!');
});

app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await Aluno.find();
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/alunos/sincronizar', async (req, res) => {
  try {
    const { alunos } = req.body;
    await Aluno.deleteMany({});
    if (alunos && alunos.length > 0) {
      await Aluno.insertMany(alunos);
    }
    
    res.json({ message: 'Alunos sincronizados com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agendamentos', async (req, res) => {
  try {
    const agendamentos = await Agendamento.find();
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agendamentos/sincronizar', async (req, res) => {
  try {
    const { agendamentos } = req.body;
    await Agendamento.deleteMany({});
    if (agendamentos && agendamentos.length > 0) {
      await Agendamento.insertMany(agendamentos);
    }
    res.json({ message: 'Agendamentos sincronizados com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/configuracao', async (req, res) => {
  try {
    let config = await Config.findOne({ chave: 'grade_horarios' });
    if (!config) {
      config = await Config.create({ chave: 'grade_horarios' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/configuracao', async (req, res) => {
  try {
    const { horaInicio, horaFim } = req.body;
    const config = await Config.findOneAndUpdate(
      { chave: 'grade_horarios' },
      { horaInicio, horaFim },
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// [TAG-BACKEND-BOOT] - Inicializacao do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
