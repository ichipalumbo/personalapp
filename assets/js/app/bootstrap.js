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

    function atualizarAlturaTopbarHome() {
        const topbar = document.querySelector('.home-weekly-topbar');
        if (!topbar) {
            return;
        }
        const height = topbar.offsetHeight;
        document.documentElement.style.setProperty('--home-topbar-height', `${height}px`);
    }

    // Etapa 3 (Cartão F): mede o real do CSS (env() + 56px) para consumidores do token.
    function atualizarAlturaBarraInferior() {
        const bar = document.querySelector('.nav-inferior');
        if (!bar) {
            return;
        }
        document.documentElement.style.setProperty('--bottombar-height', `${bar.offsetHeight}px`);
    }

    function atualizarMedidasLayout() {
        atualizarAlturaHeader();
        atualizarAlturaTabsCalendario();
        atualizarAlturaTopbarHome();
        atualizarAlturaBarraInferior();
    }

    async function refreshActiveView(contexto = global.contextoDados.capturar()) {
        // Refresh não é navegação: preserva formulário, hash, período e modo.
        return global.atualizarViewAtualAposSync(contexto);
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
            return refreshActiveView();
        };

        if (global.__appServiceWorker && typeof global.__appServiceWorker.register === 'function') {
            global.__appServiceWorker.register();
        }

        // Isolar dados antes de inicializar qualquer view; não adiciona sync B2.
        global.contextoDados.iniciar();

        if (global.googleIdentity && typeof global.googleIdentity.initialize === 'function') {
            global.googleIdentity.initialize();
            if (typeof global.googleIdentity.whenReady === 'function') {
                await global.googleIdentity.whenReady(1600);
            }
        }
        global.contextoDados.iniciar();
        global.hidratarCacheDados();

        router.bindNavigation();
        router.onAfterNavigate(() => {
            setTimeout(atualizarMedidasLayout, 50);
        });

        // Etapa 7 (Cartão D — achado 4.17.6): a tela inicial vem da URL
        // (#tela-financas), para que recarregar a página mantenha a tela em que
        // a pessoa estava. Sem hash válida, o router devolve a padrão.
        await router.navigateTo(router.getTelaInicial());

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
                const contexto = global.contextoDados.capturar();
                const ownerEmailAtual = session && session.ownerEmail ? session.ownerEmail : null;
                if (ownerEmailAtual === ultimoOwnerEmail) {
                    return;
                }

                ultimoOwnerEmail = ownerEmailAtual;

                try {
                    if (typeof global.carregarDados === 'function') {
                        await global.carregarDados({ forcarRender: false, forcarRemoto: true });
                    }
                    if (!global.contextoDados.atual(contexto)) return;

                    if (ownerEmailAtual && typeof global.iniciarSyncGoogleCalendar === 'function') {
                        global.iniciarSyncGoogleCalendar({ silencioso: true, auto: true });
                    }

                    // A leitura própria de Finanças não depende do sucesso do batch principal.
                    // O despacho não reinicializa telas nem aplica snapshot de fallback.
                    await refreshActiveView(contexto);
                } catch (error) {
                    console.error('Falha ao atualizar a view após mudança de autenticação:', error);
                }

                atualizarMedidasLayout();
            });
        }

        const AUTO_REFRESH_THROTTLE_MS = 30000;
        // Alt+Tab e troca rápida de app no celular escondem e mostram a aba em segundos;
        // só vale a pena buscar dados novos do servidor se o usuário ficou fora por um tempo real.
        const OCULTO_MINIMO_PARA_REFRESH_MS = 90000;
        let ultimoAutoRefreshAt = 0;
        let ficouOcultoEm = null;
        let autoRefreshEmAndamento = false;

        document.addEventListener('visibilitychange', async function () {
            if (document.hidden) {
                ficouOcultoEm = Date.now();
                return;
            }

            const tempoOcultoMs = ficouOcultoEm ? Date.now() - ficouOcultoEm : 0;
            ficouOcultoEm = null;

            if (tempoOcultoMs < OCULTO_MINIMO_PARA_REFRESH_MS) {
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
            const contexto = global.contextoDados.capturar();
            try {
                const resultado = await global.carregarDados({
                    forcarRender: false,
                    forcarRemoto: true,
                    silenciosoUI: true,
                    silenciarAuthToast: true
                });
                if (!global.contextoDados.atual(contexto)) return;
                ultimoAutoRefreshAt = Date.now();
                if (resultado && resultado.ok) await refreshActiveView(contexto);
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
