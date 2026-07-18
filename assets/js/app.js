// [TAG-APP-ROUTER] app.js
// Responsabilidade: Roteador SPA — controla navegação entre abas e chama inicializadores das views
// Depende de: view-home.js (inicializarHome), view-calendario.js (inicializarPaginaCalendario), view-alunos.js (inicializarAlunos)
// Expõe: nada (auto-executa em DOMContentLoaded)

// Register Service Worker
if ('serviceWorker' in navigator) {
    let hasReloadedForServiceWorkerUpdate = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hasReloadedForServiceWorkerUpdate) {
            return;
        }

        hasReloadedForServiceWorkerUpdate = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('/sw.js')
        .then(registration => {
            registration.update();
            console.log('Service Worker registered successfully:', registration);
        })
        .catch(error => {
            console.error('Service Worker registration failed:', error);
        });
}

document.addEventListener('DOMContentLoaded', async () => {
    const navLinks = document.querySelectorAll('.header-nav .nav-link');
    const views = document.querySelectorAll('.view-section');

    navLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
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
                if (typeof window.inicializarHome === 'function') await window.inicializarHome();
            } else if (targetId === 'tela-calendario') {
                if (typeof window.inicializarPaginaCalendario === 'function') await window.inicializarPaginaCalendario();
            } else if (targetId === 'tela-alunos') {
                if (typeof window.inicializarAlunos === 'function') await window.inicializarAlunos();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
    if (typeof window.inicializarHome === 'function') {
        await window.inicializarHome();
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
