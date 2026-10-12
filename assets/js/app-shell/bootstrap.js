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

        let bootApresentado = false;
        let autenticacaoPendenteNoBoot = false;
        // Observar antes de whenReady/navegação: o listener de sessão não reenvia
        // eventos ocorridos enquanto o inicializador da tela aguardava a rede.
        if (global.googleIdentity && typeof global.googleIdentity.addAuthChangeListener === 'function') {
            let ultimoOwnerEmail = global.googleIdentity.getOwnerEmail ? global.googleIdentity.getOwnerEmail() : null;
            global.googleIdentity.addAuthChangeListener(async function (session) {
                const ownerEmailAtual = session && session.ownerEmail ? session.ownerEmail : null;
                if (ownerEmailAtual === ultimoOwnerEmail) return;
                ultimoOwnerEmail = ownerEmailAtual;
                if (!bootApresentado) { autenticacaoPendenteNoBoot = true; return; }
                const contexto = global.contextoDados.capturar();
                global.hidratarCacheDados();
                global.syncBootDados.retomar(); // A troca tem cota nova; não abrir batch paralelo.
                if (!global.contextoDados.atual(contexto)) return;
                if (ownerEmailAtual && typeof global.iniciarSyncGoogleCalendar === 'function') {
                    global.iniciarSyncGoogleCalendar({ silencioso: true, auto: true });
                }
                // Finanças continua independente de falha do batch principal.
                if (router.getCurrentViewId() === 'tela-financas' && global.atualizarFinancasAposSync) {
                    await global.atualizarFinancasAposSync({ contextoDados: contexto, reutilizarConcluidaBoot: true });
                }
                atualizarMedidasLayout();
            });
        }

        if (global.__appServiceWorker && typeof global.__appServiceWorker.register === 'function') {
            global.__appServiceWorker.register();
        }

        // Isolar dados antes de inicializar qualquer view.
        global.contextoDados.iniciar();

        try {
            if (global.googleIdentity && typeof global.googleIdentity.initialize === 'function') {
                global.googleIdentity.initialize();
                if (typeof global.googleIdentity.whenReady === 'function') {
                    await global.googleIdentity.whenReady(1600);
                }
            }
            global.contextoDados.iniciar();
            const cacheInicial = global.hidratarCacheDados();
            if (cacheInicial.temDados) global.leiturasDados.finalizarApresentacaoInicial();

            router.bindNavigation();
            router.onAfterNavigate(() => {
                global.leiturasDados.atualizarFeedback();
                setTimeout(atualizarMedidasLayout, 50);
            });

            // Hash preservada inclusive na abertura pelo ícone do app instalado.
            await router.navigateTo(router.getTelaInicial());
        } finally {
            global.leiturasDados.finalizarApresentacaoInicial();
        }

        // D3: a tela inicial já renderizou. O frame dá oportunidade de apresentação;
        // B2 começa em background, sem aguardar sua leitura ou a renovação do GCal.
        const iniciarSyncBoot = () => {
            bootApresentado = true;
            global.hidratarCacheDados();
            const falhaInicial = global.leiturasDados.ultimaFalha();
            const aguardarEvento = falhaInicial && global.contextoDados.atual(falhaInicial.contexto)
                && falhaInicial.interacao === global.contextoDados.capturarInteracao();
            global.syncBootDados.iniciar({ aguardarEvento: Boolean(aguardarEvento), motivo: falhaInicial && falhaInicial.resultado.motivo });
            if (autenticacaoPendenteNoBoot && router.getCurrentViewId() === 'tela-financas'
                && global.atualizarFinancasAposSync) {
                void global.atualizarFinancasAposSync({ contextoDados: global.contextoDados.capturar(), reutilizarConcluidaBoot: true });
            }
            autenticacaoPendenteNoBoot = false;
        };
        if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(iniciarSyncBoot);
        else Promise.resolve().then(iniciarSyncBoot);

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

        const AUTO_REFRESH_THROTTLE_MS = 30000;
        // Alt+Tab e troca rápida de app no celular escondem e mostram a aba em segundos;
        // só vale a pena buscar dados novos do servidor se o usuário ficou fora por um tempo real.
        const OCULTO_MINIMO_PARA_REFRESH_MS = 90000;
        let ultimoAutoRefreshAt = 0;
        let ficouOcultoEm = null;
        let autoRefreshEmAndamento = false;
        let pedidoAutoRefresh = null;

        async function processarAutoRefresh() {
            const pedido = pedidoAutoRefresh;
            if (!pedido || autoRefreshEmAndamento) return;
            if (!global.contextoDados.atual(pedido.contexto)) { pedidoAutoRefresh = null; return; }
            if (!global.contextoDados.podeLer() || global.leiturasDados.emAndamento(pedido.contexto)
                || global.leiturasDados.temPedidoManual(pedido.contexto)) return;
            pedidoAutoRefresh = null;
            // Uma leitura compatível que terminou durante a espera já teve seu render
            // pelo consumidor (manual/B2); não duplicar o batch nem seus complementos.
            const recibo = global.leiturasDados.ultimaAplicacao();
            if (recibo && recibo !== pedido.recibo && !recibo.operacao && !recibo.recuperacao
                && global.contextoDados.atual(recibo.contexto)
                && recibo.interacao === global.contextoDados.capturarInteracao()) return;
            autoRefreshEmAndamento = true;
            const reserva = global.leiturasDados.reservar(pedido.contexto);
            try {
                const resultado = await global.carregarDados({
                    forcarRender: false, forcarRemoto: true, silenciosoUI: true, silenciarAuthToast: true
                });
                if (!global.contextoDados.atual(pedido.contexto)) return;
                if (resultado && resultado.ok) await refreshActiveView(pedido.contexto);
                else if (resultado && ['interacao-alterada', 'interacao-em-andamento'].includes(resultado.motivo)) {
                    // Edição começou durante esta atualização: conservar só o pedido,
                    // nunca a resposta antiga, e refazer quando a interação liberar.
                    pedidoAutoRefresh = pedido;
                }
            } catch (error) {
                console.error('[Bootstrap] Falha no auto-refresh silencioso:', error);
            } finally {
                autoRefreshEmAndamento = false;
                global.leiturasDados.liberar(reserva);
            }
        }
        const agendarAutoRefresh = () => Promise.resolve().then(processarAutoRefresh);
        global.leiturasDados.aoMudar(agendarAutoRefresh);
        global.contextoDados.aoMudarInteracao(agendarAutoRefresh);
        global.contextoDados.aoInvalidar(agendarAutoRefresh);

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

            ultimoAutoRefreshAt = agora;
            const contexto = global.contextoDados.capturar();
            const b2 = global.syncBootDados.obterEstado();
            if (!bootApresentado || b2.estado !== 'aplicado') {
                if (bootApresentado) global.syncBootDados.retomar();
                return;
            }
            pedidoAutoRefresh = { contexto, recibo: global.leiturasDados.ultimaAplicacao() };
            agendarAutoRefresh();
        });

        global.addEventListener('resize', atualizarMedidasLayout);
        atualizarMedidasLayout();
    }

    global.__appBootstrap = {
        initialize
    };
})(window);
