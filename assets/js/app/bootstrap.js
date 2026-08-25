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
        document.documentElement.style.removeProperty('--tabs-height');
    }

    function atualizarMedidasLayout() {
        atualizarAlturaHeader();
        atualizarAlturaTabsCalendario();
    }

    async function refreshActiveView(router) {
        if (router && typeof router.refreshCurrentView === 'function') {
            await router.refreshCurrentView();
            return;
        }

        if (typeof global.renderizarHomeSemana === 'function') {
            global.renderizarHomeSemana();
        }
    }

    let gcalWatchCheckDisparado = false;

    async function dispararVerificacaoCanalGCal() {
        if (gcalWatchCheckDisparado) {
            return;
        }

        gcalWatchCheckDisparado = true;

        if (!global.googleIdentity || typeof global.googleIdentity.getOwnerEmail !== 'function') {
            return;
        }

        const ownerEmail = global.googleIdentity.getOwnerEmail();
        if (!ownerEmail) {
            if (window.log && typeof window.log.debug === 'function') {
                window.log.debug('[gcal]', 'Sem sessão Google; ignorando verificação do canal no boot.');
            }
            return;
        }

        try {
            await global.renovarCanalGoogleCalendar();
        } catch (error) {
            console.warn('[Bootstrap] Falha ao verificar o canal do Google Calendar no boot:', error);
        }
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
        global.__appShell.refreshActiveView = function () {
            return refreshActiveView(router);
        };

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
            setTimeout(function () {
                void dispararVerificacaoCanalGCal();
            }, 0);
        }

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

                    await refreshActiveView(router);
                } catch (error) {
                    console.error('Falha ao atualizar a view após mudança de autenticação:', error);
                }

                atualizarMedidasLayout();
            });
        }

        const AUTO_REFRESH_THROTTLE_MS = 30000;
        let ultimoAutoRefreshAt = 0;
        let autoRefreshEmAndamento = false;

        document.addEventListener('visibilitychange', async function () {
            if (document.hidden) {
                return;
            }

            if (autoRefreshEmAndamento) {
                return;
            }

            const agora = Date.now();
            if (agora - ultimoAutoRefreshAt < AUTO_REFRESH_THROTTLE_MS) {
                return;
            }

            if (typeof global.carregarDados !== 'function') {
                return;
            }

            autoRefreshEmAndamento = true;
            try {
                await global.carregarDados({
                    forcarRender: false,
                    forcarRemoto: true,
                    silenciosoUI: true,
                    silenciarAuthToast: true
                });
                ultimoAutoRefreshAt = Date.now();
                await refreshActiveView(router);
            } catch (error) {
                console.error('[Bootstrap] Falha no auto-refresh silencioso:', error);
            } finally {
                autoRefreshEmAndamento = false;
            }
        });

        global.addEventListener('resize', atualizarMedidasLayout);
        atualizarMedidasLayout();
    }

    global.__appBootstrap = {
        initialize
    };
})(window);
