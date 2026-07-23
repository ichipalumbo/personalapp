// [TAG-ALUNOS-HELPERS] alunos-helpers.js
// Responsabilidade: Lookup e geração de HTML para selects de alunos
// Depende de: state.js (alunos)
// Expõe: window.normalizarStatusAluno, window.alunoEstaAtivo, window.getAluno(id),
//        window.getAlunosAtivos, window.getAlunosParaSelect(selectedId)

window.normalizarStatusAluno = function(status) {
    return String(status || '').toLowerCase() === 'inativo' ? 'inativo' : 'ativo';
};

window.alunoEstaAtivo = function(aluno) {
    return window.normalizarStatusAluno(aluno && aluno.status) === 'ativo';
};

window.getAlunosAtivos = function() {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.filter(window.alunoEstaAtivo);
};

window.getAluno = function(id) {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.find(a => a.id === id) || null;
};

window.getAlunosParaSelect = function(selectedId) {
    const listaAlunos = window.getAlunosAtivos();

    return listaAlunos.map(a =>
        `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`
    ).join('');
};
