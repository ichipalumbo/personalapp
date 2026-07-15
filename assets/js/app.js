// [TAG-JS-APP] - Gerenciamento Centralizado de Abas e SPA
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            navLinks.forEach(l => {
                l.classList.remove('ativo');
                l.classList.add('inativo');
            });
            link.classList.add('ativo');
            link.classList.remove('inativo');
            views.forEach(v => {
                v.style.display = 'none';
            });
            const activeView = document.getElementById(targetId);
            if (activeView) {
                activeView.style.display = 'block';
            }
            if (targetId === 'tela-home') {
                if (typeof window.inicializarHome === 'function') window.inicializarHome();
            } else if (targetId === 'tela-calendario') {
                if (typeof window.inicializarPaginaCalendario === 'function') window.inicializarPaginaCalendario();
            } else if (targetId === 'tela-alunos') {
                if (typeof window.inicializarAlunos === 'function') window.inicializarAlunos();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    if (typeof window.inicializarHome === 'function') {
        window.inicializarHome();
    }
    const btnToTop = document.getElementById('btnBackToTop');
    
    if (btnToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 250) {
                btnToTop.classList.add('show');
            } else {
                btnToTop.classList.remove('show');
            }
        });
        btnToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    const atualizarAlturaHeader = () => {
        const header = document.querySelector('.header');
        if (header) {
            const height = header.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${height}px`);
        }
    };
    window.addEventListener('resize', atualizarAlturaHeader);
    atualizarAlturaHeader();
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(atualizarAlturaHeader, 50);
        });
    });
});
