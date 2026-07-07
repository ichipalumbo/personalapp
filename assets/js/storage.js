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
        // Só atualiza o calendário se ele estiver visível
        const painelCalendario = document.getElementById('painelCalendario');
        if (painelCalendario && painelCalendario.style.display !== 'none') {
            if (typeof renderizarCalendario === 'function') renderizarCalendario();
        }
    } catch (e) {
        console.warn('Erro ao salvar dados:', e);
    }
}

