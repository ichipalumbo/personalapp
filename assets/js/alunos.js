// ========================================================
// [JS-ALUNOS] - Funções compartilhadas de alunos
// ========================================================

// Esta função é usada pelo modal na Home (cadastro rápido)
// e pelas páginas que precisam da lista formatada para select

function getAluno(id) {
    return alunos.find(a => a.id === id);
}

function getAlunosParaSelect(selectedId) {
    return alunos.map(a => 
        `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.nome} — ${a.objetivo}${a.preco ? ` (R$${a.preco.toFixed(2)})` : ''}</option>`
    ).join('');
}
