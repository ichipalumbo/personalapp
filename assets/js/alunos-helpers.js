// [TAG-ALUNOS-HELPERS] alunos-helpers.js
// Responsabilidade: Lookup e geração de HTML para selects de alunos
// Depende de: state.js (alunos)
// Expõe: getAluno(id), getAlunosParaSelect(selectedId)

function getAluno(id) {
    return alunos.find(a => a.id === id);
}

function getAlunosParaSelect(selectedId) {
    return alunos.map(a => 
        `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`
    ).join('');
}

