// ========================================================
// [JS-APP] - Inicialização da aplicação
// ========================================================

document.addEventListener('DOMContentLoaded', function() {
    // 1. Carrega dados salvos
    carregarDados();
    
    // 2. Renderiza tudo
    renderizarAlunos();
    renderizarAgenda();
    renderizarCalendario();
    
    // 3. Estado inicial: cadastro oculto, calendário + agenda visíveis
    const painelCadastro = document.getElementById('painelCadastro');
    const painelCalendario = document.getElementById('painelCalendario');
    const painelAgenda = document.getElementById('painelAgenda');
    const btnToggle = document.getElementById('btnToggleCadastro');
    
    if (painelCadastro) painelCadastro.style.display = 'none';
    if (painelCalendario) painelCalendario.style.display = 'block';
    if (painelAgenda) painelAgenda.style.display = 'block';
    if (btnToggle) {
        btnToggle.textContent = '👥 Gerenciar Alunos';
        btnToggle.className = 'btn btn-primary';
    }
    
    // 4. Reseta flag
    telaCadastroAberta = false;
    
    // 5. Vai para a semana atual
    irParaSemana(new Date().getDate());
});
