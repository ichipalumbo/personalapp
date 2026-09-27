(function (global) {
    const VIEW_INITIALIZERS = {
        'tela-home': () => global.inicializarHome,
        'tela-financas': () => global.inicializarFinancas,
        'tela-alunos': () => global.inicializarAlunos
    };

    function getInitializer(targetId) {
        const resolver = VIEW_INITIALIZERS[targetId];
        return typeof resolver === 'function' ? resolver() : null;
    }

    function createRouter() {
        const afterNavigateCallbacks = [];
        let currentViewId = null;

        async function initializeView(targetId) {
            const initializer = getInitializer(targetId);
            if (typeof initializer === 'function') {
                await initializer();
            }
            // Etapa 3 (Rodada 2): o FAB dinâmico da Home (#fabNovoHome, criado
            // por view-home.js) existe SOMENTE com o Home em tela — nas demais
            // telas ele conflita com o FAB da tela (ex.: "Novo aluno" em
            // Alunos) e intercepta o toque. Aqui a tela alvo já está com o
            // display definitivo (setado antes do init), então a verificação
            // por visibilidade está correta; é idempotente no Home (o próprio
            // init também a chama, sem efeito colateral).
            if (typeof global.trocarFABNovoHome === 'function') {
                global.trocarFABNovoHome();
            }
        }

        async function navigateTo(targetId) {
            const navLinks = document.querySelectorAll('.nav-inferior .nav-link-inferior');
            const views = document.querySelectorAll('.view-section');
            const activeView = document.getElementById(targetId);
            currentViewId = targetId;

            navLinks.forEach(link => {
                const isActive = link.getAttribute('data-target') === targetId;
                link.classList.toggle('ativo', isActive);
                // Etapa 3 (Cartão E): estado ativo também semântico para leitores de tela.
                if (isActive) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            });

            views.forEach(view => {
                view.style.display = view.id === targetId ? 'block' : 'none';
            });

            if (activeView) {
                activeView.style.display = 'block';
            }

            await initializeView(targetId);
            global.scrollTo({ top: 0, behavior: 'smooth' });

            afterNavigateCallbacks.forEach(callback => callback(targetId));
        }

        function bindNavigation() {
            const navLinks = document.querySelectorAll('.nav-inferior .nav-link-inferior');

            navLinks.forEach(link => {
                link.addEventListener('click', async event => {
                    event.preventDefault();
                    const targetId = link.getAttribute('data-target');
                    await navigateTo(targetId);
                });
            });
        }

        function onAfterNavigate(callback) {
            if (typeof callback === 'function') {
                afterNavigateCallbacks.push(callback);
            }
        }

        async function refreshCurrentView() {
            if (!currentViewId) {
                return;
            }

            await initializeView(currentViewId);
            afterNavigateCallbacks.forEach(callback => callback(currentViewId));
        }

        return {
            bindNavigation,
            navigateTo,
            onAfterNavigate,
            refreshCurrentView,
            getCurrentViewId: function () {
                return currentViewId;
            }
        };
    }

    global.__appRouter = {
        createRouter
    };
})(window);
