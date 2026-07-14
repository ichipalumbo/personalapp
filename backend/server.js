const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Conexão com o MongoDB Atlas
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log('✅ Conectado ao MongoDB com sucesso!'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// --- MONGODB SCHEMAS & MODELS ---

// 1. Schema de Alunos
const AlunoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Mantém o ID gerado pelo front
  nome: { type: String, required: true },
  telefone: String,
  status: { type: String, default: 'ativo' },
  tipoPreco: String,
  valorAlinhado: Number,
  aulasSemanais: Number,
  historicoPagamentos: Array,
  criadoEm: { type: Date, default: Date.now }
});
const Aluno = mongoose.model('Aluno', AlunoSchema);

// 2. Schema de Agendamentos (Aulas)
const AgendamentoSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  alunoId: String,
  alunoNome: String,
  data: String,         // Formato YYYY-MM-DD
  horario: String,      // Formato HH:MM
  tipo: String,         // 'recorrente', 'unico', 'reposicao'
  status: { type: String, default: 'confirmado' }, // 'confirmado', 'cancelado', 'realizado', 'reposicao-pendente'
  diaSemana: Number,
  semanasRecorrencia: Number
});
const Agendamento = mongoose.model('Agendamento', AgendamentoSchema);

// 3. Schema de Configurações da Grade da Agenda
const ConfigSchema = new mongoose.Schema({
  chave: { type: String, default: 'grade_horarios', unique: true },
  horaInicio: { type: String, default: '06:00' },
  horaFim: { type: String, default: '22:00' }
});
const Config = mongoose.model('Config', ConfigSchema);


// --- ROTAS DA API ---

app.get('/', (req, res) => {
  res.send('🚀 API da Agenda Personal Trainer rodando e pronta!');
});

// === ROTAS DE ALUNOS ===
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
    // Sincroniza a lista completa vinda do front
    const { alunos } = req.body;
    
    // Abordagem simples: limpa a coleção e reinsere para garantir paridade com o front
    await Aluno.deleteMany({});
    if (alunos && alunos.length > 0) {
      await Aluno.insertMany(alunos);
    }
    
    res.json({ message: 'Alunos sincronizados com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === ROTAS DE AGENDAMENTOS ===
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

// === ROTAS DE CONFIGURAÇÃO ===
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

// Inicialização
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});