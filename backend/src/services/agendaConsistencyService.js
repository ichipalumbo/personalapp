const { getAlunoFrequenciaSemanal } = require('../utils/studentValueExtractors');

function contarAulasSemanaisAgendadas(alunoId, aulas) {
  const lista = Array.isArray(aulas) ? aulas : [];

  return lista
    .filter((a) => a && a.alunoId === alunoId && a.tipo === 'aula' && a.frequencia === 'semanal')
    .reduce((total, a) => total + (Array.isArray(a.diasSemana) ? a.diasSemana.length : 1), 0);
}

function calcularAulasFaltamAgendar(aluno, aulas) {
  if (!aluno) return 0;
  const freqAcordada = getAlunoFrequenciaSemanal(aluno);
  return Math.max(0, freqAcordada - contarAulasSemanaisAgendadas(aluno.id, aulas));
}

function montarConsistenciaAgenda(aluno, aulas) {
  const contratado = getAlunoFrequenciaSemanal(aluno);
  const agendado = contarAulasSemanaisAgendadas(aluno && aluno.id, aulas);

  return {
    alunoId: aluno && aluno.id,
    aulasSemanaisContrato: contratado,
    aulasSemanaisAgendadas: agendado,
    aulasFaltamAgendar: Math.max(0, contratado - agendado)
  };
}

module.exports = {
  calcularAulasFaltamAgendar,
  montarConsistenciaAgenda
};
