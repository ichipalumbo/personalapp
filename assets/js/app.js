// ========================================================
// [JS-APP] - Inicialização da aplicação
// ========================================================

function renderizarTudo() {
    renderizarAlunos();
    renderizarAgenda();
    renderizarCalendario();
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    carregarDados();
    renderizarTudo();
    
    // Esconde painel de cadastro inicialmente
    const painelCadastro = document.getElementById('painelCadastro');
    if (painelCadastro) painelCadastro.style.display = 'none';
    
    // Vai para a semana atual
    irParaSemana(new Date().getDate());
});
