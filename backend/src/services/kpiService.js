function calcularProjecaoMensalCompleta(aluno) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;

  return freqAcordada * 4 * preco;
}

function calcularProjecaoRealizadaAteHoje(aluno, aulas) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const alunoId = aluno.id;

  const aulasAluno = aulas.filter(a => a.alunoId === alunoId && a.tipo === 'aula');

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

function calcularProjecaoAproximada(aluno) {
  const preco = aluno.preco ? parseFloat(aluno.preco) : 0;
  const freqAcordada = aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
  return freqAcordada * 4 * preco;
}

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

function contarReposicoesPorAluno(alunoId, aulas) {
  return aulas.filter(a => a.alunoId === alunoId && a.tipo === 'reposição').length;
}

module.exports = {
  calcularProjecaoMensalCompleta,
  calcularProjecaoRealizadaAteHoje,
  calcularProjecaoAproximada,
  calcularAulasFaltamAgendar,
  contarReposicoesPorAluno
};
