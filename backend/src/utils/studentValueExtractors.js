// `frequenciaSemanal` é o campo realmente gravado pelo formulário de aluno;
// `aulasSemanais` é o nome legado declarado no schema e presente em dados antigos.
function getAlunoFrequenciaSemanal(aluno) {
  if (!aluno) return 1;

  const bruto = aluno.frequenciaSemanal !== undefined && aluno.frequenciaSemanal !== null && aluno.frequenciaSemanal !== ''
    ? aluno.frequenciaSemanal
    : aluno.aulasSemanais;

  const valor = parseInt(bruto, 10);
  return Number.isFinite(valor) && valor >= 0 ? valor : 1;
}

module.exports = {
  getAlunoFrequenciaSemanal
};