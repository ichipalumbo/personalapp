// ========================================================
// [TAG-JS-APP] - Gerenciamento Centralizado de Abas e SPA
// ========================================================

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');

            // Atualiza estados visuais do menu
            navLinks.forEach(l => {
                l.classList.remove('ativo');
                l.classList.add('inativo');
            });
            link.classList.add('ativo');
            link.classList.remove('inativo');

            // Alterna exibição de seções na SPA
            views.forEach(v => {
                v.style.display = 'none';
            });
            const activeView = document.getElementById(targetId);
            if (activeView) {
                activeView.style.display = 'block';
            }

            // Inicializações específicas por aba selecionada
            if (targetId === 'tela-home') {
                if (typeof window.inicializarHome === 'function') window.inicializarHome();
            } else if (targetId === 'tela-calendario') {
                if (typeof window.inicializarPaginaCalendario === 'function') window.inicializarPaginaCalendario();
            } else if (targetId === 'tela-alunos') {
                if (typeof window.inicializarAlunos === 'function') window.inicializarAlunos();
            }

            // Força reset suave da rolagem ao mudar de tela para manter o contexto limpo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Inicialização da tela inicial (Home) no primeiro carregamento
    if (typeof window.inicializarHome === 'function') {
        window.inicializarHome();
    }

    // ========================================================
    // [LOGICA-VOLTAR-AO-TOPO] - Controle do Botão Flutuante
    // ========================================================
    const btnToTop = document.getElementById('btnBackToTop');
    
    if (btnToTop) {
        // Escuta a rolagem global da janela
        window.addEventListener('scroll', () => {
            if (window.scrollY > 250) {
                btnToTop.classList.add('show');
            } else {
                btnToTop.classList.remove('show');
            }
        });

        // Evento de subida com efeito de rolagem de alta fidelidade
        btnToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ========================================================
    // [ALTURA-DINAMICA-HEADER] - Ajuste de Cabeçalhos Sticky
    // ========================================================
    const atualizarAlturaHeader = () => {
        const header = document.querySelector('.header');
        if (header) {
            const height = header.offsetHeight;
            // Define uma variável CSS global com a altura real medida do header
            document.documentElement.style.setProperty('--header-height', `${height}px`);
        }
    };

    // Monitora redimensionamento de tela para reajustes dinâmicos de layout
    window.addEventListener('resize', atualizarAlturaHeader);
    atualizarAlturaHeader();

    // Medição extra ao alternar abas para tratar renderização atrasada de flexboxes
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(atualizarAlturaHeader, 50);
        });
    });
});