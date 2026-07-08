// assets/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.view-section');
    const utilitariosDados = document.getElementById('utilitarios-dados');

    // Função para alternar entre as telas (Roteador)
    function navegarPara(targetId) {
        // 1. Esconder todas as seções e mostrar apenas a selecionada
        sections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // 2. Atualizar o estado visual dos botões do menu
        navLinks.forEach(link => {
            if (link.getAttribute('data-target') === targetId) {
                link.classList.remove('inativo');
                link.classList.add('ativo');
            } else {
                link.classList.remove('ativo');
                link.classList.add('inativo');
            }
        });

        // 3. Mostrar os botões de Importar/Exportar apenas na Home
        if (targetId === 'tela-home') {
            utilitariosDados.style.display = 'flex';
        } else {
            utilitariosDados.style.display = 'none';
        }

        // 4. Inicializar ou atualizar os dados da tela específica
        switch (targetId) {
            case 'tela-home':
                if (typeof inicializarHome === 'function') inicializarHome();
                break;
            case 'tela-calendario':
                if (typeof inicializarPaginaCalendario === 'function') inicializarPaginaCalendario();
                break;
            case 'tela-alunos':
                if (typeof inicializarPaginaCadastro === 'function') inicializarPaginaCadastro();
                break;
        }
    }

    // Configurar ouvintes de clique no menu de navegação
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            navegarPara(targetId);
        });
    });

    // Carregar a Home por padrão no primeiro acesso
    navegarPara('tela-home');
});