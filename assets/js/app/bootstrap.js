(function (global) {
    function atualizarAlturaHeader() {
        const header = document.querySelector('.header');
        if (!header) {
            return;
        }

        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
    }

    async function initialize() {
        if (!global.__appRouter || typeof global.__appRouter.createRouter !== 'function') {
            throw new Error('Bootstrap da aplicação indisponível: router não encontrado.');
        }

        const router = global.__appRouter.createRouter();
        global.__appShell = global.__appShell || {};
        global.__appShell.router = router;
        global.__appShell.atualizarAlturaHeader = atualizarAlturaHeader;

        if (global.__appServiceWorker && typeof global.__appServiceWorker.register === 'function') {
            global.__appServiceWorker.register();
        }

        router.bindNavigation();
        router.onAfterNavigate(() => {
            setTimeout(atualizarAlturaHeader, 50);
        });

        await router.navigateTo('tela-home');

        global.addEventListener('resize', atualizarAlturaHeader);
        atualizarAlturaHeader();
    }

    global.__appBootstrap = {
        initialize
    };
})(window);
