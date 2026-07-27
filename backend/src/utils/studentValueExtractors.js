function getAlunoPreco(aluno) {
  return aluno && aluno.preco ? parseFloat(aluno.preco) : 0;
}

function getAlunoFrequenciaSemanal(aluno) {
  return aluno && aluno.frequenciaSemanal ? parseInt(aluno.frequenciaSemanal, 10) : 1;
}

module.exports = {
  getAlunoPreco,
  getAlunoFrequenciaSemanal
};