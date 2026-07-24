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

        if (global.googleIdentity && typeof global.googleIdentity.initialize === 'function') {
            global.googleIdentity.initialize();
            if (typeof global.googleIdentity.whenReady === 'function') {
                await global.googleIdentity.whenReady(1600);
            }
        }

        router.bindNavigation();
        router.onAfterNavigate(() => {
            setTimeout(atualizarMedidasLayout, 50);
        });

        await router.navigateTo('tela-home');

        if (global.gcal && typeof global.gcal.isSignedIn === 'function' && global.gcal.isSignedIn()) {
            if (typeof global.iniciarSyncGoogleCalendarAutomatica === 'function') {
                global.iniciarSyncGoogleCalendarAutomatica();
            } else if (typeof global.iniciarSyncGoogleCalendar === 'function') {
                global.iniciarSyncGoogleCalendar({ silencioso: true, auto: true });
            }
        }

        if (global.googleIdentity && typeof global.googleIdentity.addAuthChangeListener === 'function') {
            let ultimoOwnerEmail = global.googleIdentity.getOwnerEmail ? global.googleIdentity.getOwnerEmail() : null;

            global.googleIdentity.addAuthChangeListener(async function (session) {
                const ownerEmailAtual = session && session.ownerEmail ? session.ownerEmail : null;
                if (ownerEmailAtual === ultimoOwnerEmail) {
                    return;
                }

                ultimoOwnerEmail = ownerEmailAtual;

                try {
                    if (typeof global.carregarDados === 'function') {
                        await global.carregarDados({ forcarRender: false, forcarRemoto: true });
                    }

                    if (ownerEmailAtual && typeof global.iniciarSyncGoogleCalendar === 'function') {
                        global.iniciarSyncGoogleCalendar({ silencioso: true, auto: true });
                    }

                    if (typeof router.refreshCurrentView === 'function') {
                        await router.refreshCurrentView();
                    }
                } catch (error) {
                    console.error('Falha ao atualizar a view após mudança de autenticação:', error);
                }

                atualizarMedidasLayout();
            });
        }

        global.addEventListener('resize', atualizarMedidasLayout);
        atualizarMedidasLayout();
    }

    global.__appBootstrap = {
        initialize
    };
})(window);
