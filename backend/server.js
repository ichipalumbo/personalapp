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

// [TAG-BACKEND-FUNCOES-KPIS] - Funções de cálculo de KPIs (persistentes)

/**
 * Calcula a projeção do MÊS INTEIRO baseado em recorrências
 * @param {Object} aluno - Objeto com preco e frequenciaSemanal
 * @param {Array} aulas - Array de aulas agendadas
 * @returns {Number} Valor total previsto para o mês
 */
function calcularProjecaoMensalCompleta(aluno, aulas) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
  
  // Fallback: usar aproximação (frequência × 4 semanas × preço)
  return freqAcordada * 4 * preco;
}

/**
 * Calcula quantas aulas já foram realizadas até hoje
 * @param {Object} aluno - Objeto com preco
 * @param {Array} aulas - Array de aulas agendadas
 * @returns {Number} Valor total realizado
 */
function calcularProjecaoRealizadaAteHoje(aluno, aulas) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const alunoId = aluno.id;
  
  // Contar aulas do aluno que já passaram (tipo 'aula')
  const aulasAluno = aulas.filter(a => a.alunoId === alunoId && a.tipo === 'aula');
  
  // Aproximação: contar dias de recorrência × preço
  let totalAulasPrevistas = 0;
  aulasAluno.forEach(a => {
    if (a.diasSemana && Array.isArray(a.diasSemana)) {
      totalAulasPrevistas += a.diasSemana.length;
    } else {
      totalAulasPrevistas += 1;
    }
  });
  
  return totalAulasPrevistas * preco;
}

/**
 * Calcula projeção aproximada
 * @param {Object} aluno - Objeto do aluno
 * @returns {Number} Valor aproximado mensal
 */
function calcularProjecaoAproximada(aluno) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
  return freqAcordada * 4 * preco;
}

/**
 * Calcula aulas faltando agendar
 * @param {Object} aluno - Objeto do aluno
 * @param {Array} aulas - Array de aulas
 * @returns {Number} Quantidade de aulas faltando
 */
function calcularAulasFaltamAgendar(aluno, aulas) {
  const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
  
  const aulasRecorrentes = aulas.filter(a => 
    a.alunoId === aluno.id && 
    a.tipo === 'aula' && 
    a.frequencia === 'semanal'
  );
  
  let totalAgendado = 0;
  aulasRecorrentes.forEach(a => {
    if (a.diasSemana && Array.isArray(a.diasSemana)) {
      totalAgendado += a.diasSemana.length;
    } else {
      totalAgendado += 1;
    }
  });
  
  return Math.max(0, freqAcordada - totalAgendado);
}

/**
 * Conta reposições devidas
 * @param {String} alunoId - ID do aluno
 * @param {Array} aulas - Array de aulas
 * @returns {Number} Total de reposições
 */
function contarReposicoesPorAluno(alunoId, aulas) {
  return aulas.filter(a => a.alunoId === alunoId && a.tipo === 'reposição').length;
}

app.get('/api/alunos', async (req, res) => {
  try {
    const alunos = await Aluno.find();
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * NOVA ROTA: Retorna KPIs calculados para um aluno específico
 * GET /api/alunos/:alunoId/kpis
 */
app.get('/api/alunos/:alunoId/kpis', async (req, res) => {
  try {
    const { alunoId } = req.params;
    
    // Buscar aluno
    const aluno = await Aluno.findOne({ id: alunoId });
    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }
    
    // Buscar todas as aulas
    const aulas = await Agendamento.find();
    
    // Calcular KPIs
    const projecaoMesCompleto = calcularProjecaoMensalCompleta(aluno, aulas);
    const realizadoAteHoje = calcularProjecaoRealizadaAteHoje(aluno, aulas);
    const projecaoAproximada = calcularProjecaoAproximada(aluno);
    const aulasFaltam = calcularAulasFaltamAgendar(aluno, aulas);
    const reposicoes = contarReposicoesPorAluno(aluno.id, aulas);
    
    res.json({
      alunoId: aluno.id,
      aluno: aluno.nome,
      kpis: {
        projecaoMesCompleto,
        realizadoAteHoje,
        projecaoAproximada,
        aulasFaltam,
        reposicoes
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * NOVA ROTA: Retorna KPIs para TODOS os alunos
 * GET /api/alunos/kpis/todos
 * Útil para dashboards e relatórios
 */
app.get('/api/alunos/kpis/todos', async (req, res) => {
  try {
    const alunos = await Aluno.find();
    const aulas = await Agendamento.find();
    
    const kpisCompletos = alunos.map(aluno => ({
      alunoId: aluno.id,
      aluno: aluno.nome,
      preco: aluno.preco,
      frequenciaSemanal: aluno.frequenciaSemanal,
      kpis: {
        projecaoMesCompleto: calcularProjecaoMensalCompleta(aluno, aulas),
        realizadoAteHoje: calcularProjecaoRealizadaAteHoje(aluno, aulas),
        projecaoAproximada: calcularProjecaoAproximada(aluno),
        aulasFaltam: calcularAulasFaltamAgendar(aluno, aulas),
        reposicoes: contarReposicoesPorAluno(aluno.id, aulas)
      }
    }));
    
    res.json(kpisCompletos);
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
