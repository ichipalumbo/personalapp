// ========================================================
// [JS-STORAGE] - Funções de localStorage (carga/salva)
// ========================================================

function carregarDados() {
    try {
        const dados = localStorage.getItem('personalTrainerData');
        if (dados) {
            const parsed = JSON.parse(dados);
            alunos = parsed.alunos || [];
            aulas = parsed.aulas || [];
        }
    } catch (e) {
        console.warn('Erro ao carregar dados:', e);
    }
}

function salvarDados() {
    try {
        localStorage.setItem('personalTrainerData', JSON.stringify({ alunos, aulas }));
        renderizarCalendario(); // Atualiza o calendário sempre que salvar
    } catch (e) {
        console.warn('Erro ao salvar dados:', e);
    }
}
