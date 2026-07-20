(function (global) {
    function atualizarAlturaHeader() {
        const header = document.querySelector('.header');
        if (!header) {
            return;
        }

        const height = header.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
    }

    function atualizarAlturaTabsCalendario() {
        const tabs = document.querySelector('#tela-calendario > .calendario-tabs-sticky');
        if (tabs && tabs.offsetWidth > 0) {
            const height = tabs.offsetHeight;
            document.documentElement.style.setProperty('--tabs-height', `${height}px`);
        } else {
            document.documentElement.style.removeProperty('--tabs-height');
        }
    }

    function atualizarMedidasLayout() {
        atualizarAlturaHeader();
        atualizarAlturaTabsCalendario();
    }

    async function initialize() {
        if (!global.__appRouter || typeof global.__appRouter.createRouter !== 'function') {
            throw new Error('Bootstrap da aplicação indisponível: router não encontrado.');
        }

        const router = global.__appRouter.createRouter();
        global.__appShell = global.__appShell || {};
        global.__appShell.router = router;
        global.__appShell.atualizarAlturaHeader = atualizarAlturaHeader;
        global.__appShell.atualizarAlturaTabsCalendario = atualizarAlturaTabsCalendario;
        global.__appShell.atualizarMedidasLayout = atualizarMedidasLayout;

        if (global.__appServiceWorker && typeof global.__appServiceWorker.register === 'function') {
            global.__appServiceWorker.register();
        }

        router.bindNavigation();
        router.onAfterNavigate(() => {
            setTimeout(atualizarMedidasLayout, 50);
        });

        await router.navigateTo('tela-home');

        global.addEventListener('resize', atualizarMedidasLayout);
        atualizarMedidasLayout();
    }

    global.__appBootstrap = {
        initialize
    };
})(window);
