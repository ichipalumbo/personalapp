const Aluno = require('../models/Aluno');
const Agendamento = require('../models/Agendamento');
const {
  calcularProjecaoMensalCompleta,
  calcularProjecaoRealizadaAteHoje,
  calcularProjecaoAproximada,
  calcularAulasFaltamAgendar,
  contarReposicoesPorAluno
} = require('../services/kpiService');

async function listarAlunos(req, res) {
  try {
    const alunos = await Aluno.find();
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function obterKpisAluno(req, res) {
  try {
    const { alunoId } = req.params;
    const aluno = await Aluno.findOne({ id: alunoId });

    if (!aluno) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    const aulas = await Agendamento.find();

    res.json({
      alunoId: aluno.id,
      aluno: aluno.nome,
      kpis: {
        projecaoMesCompleto: calcularProjecaoMensalCompleta(aluno, aulas),
        realizadoAteHoje: calcularProjecaoRealizadaAteHoje(aluno, aulas),
        projecaoAproximada: calcularProjecaoAproximada(aluno),
        aulasFaltam: calcularAulasFaltamAgendar(aluno, aulas),
        reposicoes: contarReposicoesPorAluno(aluno.id, aulas)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function obterKpisTodosAlunos(req, res) {
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
}

async function sincronizarAlunos(req, res) {
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
}

module.exports = {
  listarAlunos,
  obterKpisAluno,
  obterKpisTodosAlunos,
  sincronizarAlunos
};
