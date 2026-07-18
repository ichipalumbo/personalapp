// [TAG-ALUNOS-HELPERS] alunos-helpers.js
// Responsabilidade: Lookup e geração de HTML para selects de alunos
// Depende de: state.js (alunos)
// Expõe: window.getAluno(id), window.getAlunosParaSelect(selectedId)

window.getAluno = function(id) {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.find(a => a.id === id) || null;
};

window.getAlunosParaSelect = function(selectedId) {
    const listaAlunos = Array.isArray(window.alunos)
        ? window.alunos
        : (typeof alunos !== 'undefined' && Array.isArray(alunos) ? alunos : []);

    return listaAlunos.map(a =>
        `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`
    ).join('');
};
