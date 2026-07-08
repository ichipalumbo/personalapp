// ========================================================
// [TAG-JS-APP] - Orquestrador de Roteamento da SPA (AtivaMente)
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.view-section');
    const utilitariosDados = document.getElementById('utilitarios-dados');

    // Função para alternar entre as telas (Roteador da SPA)
    function navegarPara(targetId) {
        // 1. Esconde todas as seções e mostra apenas a selecionada pelo usuário
        sections.forEach(section => {
            if (section.id === targetId) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });

        // 2. Atualiza o estado visual das abas de navegação (Ativo / Inativo)
        navLinks.forEach(link => {
            if (link.getAttribute('data-target') === targetId) {
                link.classList.remove('inativo');
                link.classList.add('ativo');
            } else {
                link.classList.remove('ativo');
                link.classList.add('inativo');
            }
        });

        // 3. Tratamento de Segurança: Só tenta gerenciar os botões utilitários se eles existirem no HTML
        if (utilitariosDados) {
            if (targetId === 'tela-home') {
                utilitariosDados.style.display = 'flex';
            } else {
                utilitariosDados.style.display = 'none';
            }
        }

        // 4. Inicializa os dados específicos e monta a tela selecionada
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

    // Configura os ouvintes de clique em cada botão do menu superior
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            navegarPara(targetId);
        });
    });

    // Inicializa a Home por padrão no primeiro carregamento do aplicativo
    navegarPara('tela-home');
});