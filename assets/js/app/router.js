(function (global) {
    const VIEW_INITIALIZERS = {
        'tela-home': () => global.inicializarHome,
        'tela-calendario': () => global.inicializarPaginaCalendario,
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
        }

        async function navigateTo(targetId) {
            const navLinks = document.querySelectorAll('.header-nav .nav-link');
            const views = document.querySelectorAll('.view-section');
            const activeView = document.getElementById(targetId);
            currentViewId = targetId;

            navLinks.forEach(link => {
                const isActive = link.getAttribute('data-target') === targetId;
                link.classList.toggle('ativo', isActive);
                link.classList.toggle('inativo', !isActive);
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
            const navLinks = document.querySelectorAll('.header-nav .nav-link');

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
