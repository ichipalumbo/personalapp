(function (global) {
    'use strict';

    function obterHelperSessaoUsuario() {
        return global.userAreaSessionHelper && typeof global.userAreaSessionHelper === 'object'
            ? global.userAreaSessionHelper
            : null;
    }

    function obterSessaoAtual() {
        const helper = obterHelperSessaoUsuario();
        if (helper && typeof helper.getSessionSnapshot === 'function') {
            return helper.getSessionSnapshot(global.googleIdentity);
        }

        console.warn('[settings-modal] userAreaSessionHelper indisponível; usando sessão vazia.');
        return {
            isSignedIn: false,
            name: '',
            email: '',
            picture: ''
        };
    }

    function atualizarPerfilUsuarioUI(session) {
        const helper = obterHelperSessaoUsuario();
        if (helper && typeof helper.renderProfile === 'function') {
            return helper.renderProfile(session, {
                googleIdentity: global.googleIdentity,
                avatarId: 'userProfileAvatar',
                nameId: 'userProfileName',
                emailId: 'userProfileEmail',
                signOutButtonId: 'btnUserSignOut'
            });
        }

        console.warn('[settings-modal] userAreaSessionHelper indisponível; perfil não renderizado.');
        return session && typeof session === 'object'
            ? session
            : { isSignedIn: false, name: '', email: '', picture: '' };
    }

    function atualizarUIStatusGoogleCalendar(status) {
        if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.updateGoogleCalendarStatusUI === 'function') {
            global.googleIdentity.updateGoogleCalendarStatusUI(status || { connected: false });
        }
    }

    function normalizarMensagemGoogleAgenda(mensagem) {
        return String(mensagem || '').replace(/Google Calendar/gi, 'Google Agenda');
    }

    function limparDadosGoogleExternosLocais() {
        let houveAlteracao = false;

        if (Array.isArray(global.aulas)) {
            const filtradas = global.aulas.filter(function (aula) {
                return !(aula && aula.source === 'google_external');
            });

            if (filtradas.length !== global.aulas.length) {
                global.aulas.splice(0, global.aulas.length, ...filtradas);
                houveAlteracao = true;
            }
        }

        try {
            const parseSeguro = typeof global.parseJSONSeguro === 'function'
                ? global.parseJSONSeguro
                : function (valor, fallback) {
                    try {
                        return valor ? JSON.parse(valor) : fallback;
                    } catch (error) {
                        return fallback;
                    }
                };
            const aulasCache = parseSeguro(localStorage.getItem('personal_aulas'), []);
            if (Array.isArray(aulasCache)) {
                const filtradasCache = aulasCache.filter(function (aula) {
                    return !(aula && aula.source === 'google_external');
                });

                if (filtradasCache.length !== aulasCache.length) {
                    localStorage.setItem('personal_aulas', JSON.stringify(filtradasCache));
                    houveAlteracao = true;
                }
            }
        } catch (error) {
            console.warn('[settings-modal] Falha ao atualizar cache local de aulas após desconexão do GCal:', error);
        }

        if (houveAlteracao) {
            const forcarRender = global['forçarRenderizacaoInterface'];
            if (typeof forcarRender === 'function') {
                forcarRender();
            }
        }
    }

    /**
     * Opens the User Area Modal
     */
    function openUserAreaModal() {
        const modal = document.getElementById('appSettingsModal');
        const backdrop = document.getElementById('appSettingsBackdrop');

        if (!modal || !backdrop) {
            console.warn('[settings-modal] Modal elements not found');
            return;
        }

        const sessionAtual = obterSessaoAtual();
        atualizarPerfilUsuarioUI(sessionAtual);

        if (!sessionAtual.isSignedIn) {
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('Faça login para abrir sua área de usuário.', 'warning');
            }
            return;
        }

        modal.style.display = 'flex';
        backdrop.style.display = 'block';
        document.body.style.overflow = 'hidden';

        // Check and update Google Calendar connection status when modal opens
        if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.checkCalendarConnectionStatus === 'function') {
            let exibiuCache = false;

            if (typeof global.googleIdentity.getCachedCalendarConnectionStatus === 'function') {
                const cache = global.googleIdentity.getCachedCalendarConnectionStatus();
                if (cache && cache.connected === true) {
                    atualizarUIStatusGoogleCalendar({
                        connected: true,
                        details: cache.details,
                        uiState: 'checking',
                        message: 'Atualizando status...'
                    });
                    exibiuCache = true;
                }
            }

            if (!exibiuCache) {
                atualizarUIStatusGoogleCalendar({
                    connected: false,
                    uiState: 'checking',
                    message: 'Verificando status da conexão...'
                });
            }

            global.googleIdentity.checkCalendarConnectionStatus()
                .then(function (status) {
                    atualizarUIStatusGoogleCalendar(status);
                })
                .catch(function (error) {
                    console.warn('[settings-modal] Erro ao verificar status do Google Calendar:', error);
                    atualizarUIStatusGoogleCalendar({
                        connected: false,
                        uiState: 'error',
                        message: 'Não foi possível validar o status agora. Tente novamente.'
                    });
                });
        }
    }

    /**
     * Closes the User Area Modal
     */
    function closeUserAreaModal() {
        const modal = document.getElementById('appSettingsModal');
        const backdrop = document.getElementById('appSettingsBackdrop');

        if (!modal || !backdrop) {
            return;
        }

        modal.style.display = 'none';
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
    }

    async function handleRenewGoogleCalendarWatch() {
        if (!global.googleIdentity || typeof global.googleIdentity.isSignedIn !== 'function' || !global.googleIdentity.isSignedIn()) {
            if (window.log && typeof window.log.debug === 'function') {
                window.log.debug('[gcal]', 'Sem sessão Google; botão manual de renovação ignorado.');
            }
            return;
        }

        const btn = document.getElementById('btnRenewGoogleCalendarWatch');
        if (btn) {
            btn.disabled = true;
            const originalHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Verificando...</span>';
            btn.dataset.originalHtml = originalHtml;
        }

        try {
            const resultado = await global.renovarCanalGoogleCalendar();
            const mensagem = resultado && resultado.renewed
                ? 'Canal do Google Agenda renovado e sincronização disparada.'
                : (resultado && resultado.synced
                    ? 'Sincronização de recuperação concluída.'
                    : 'Canal do Google Agenda continua válido.');

            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast(mensagem, 'success');
            }
        } catch (error) {
            console.warn('[settings-modal] Falha ao verificar/renovar o canal do Google Calendar:', error);
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('Não foi possível verificar o canal do Google Agenda agora.', 'warning');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                if (btn.dataset.originalHtml) {
                    btn.innerHTML = btn.dataset.originalHtml;
                    btn.dataset.originalHtml = '';
                }
            }
        }
    }

    /**
     * Initialize Settings Modal and button handlers
     */
    function initialize() {
        // Wire User Avatar Trigger (Open Modal)
        const btnUserAreaTrigger = document.getElementById('btnUserAreaTrigger');
        if (btnUserAreaTrigger) {
            btnUserAreaTrigger.addEventListener('click', function () {
                openUserAreaModal();
            });
        }

        // Wire Close Button
        const btnCloseSettings = document.getElementById('btnCloseSettings');
        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', function () {
                closeUserAreaModal();
            });
        }

        // Wire Backdrop Click (Close Modal)
        const backdrop = document.getElementById('appSettingsBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function () {
                closeUserAreaModal();
            });
        }

        // Wire Connect Google Calendar Button
        const btnConnectGCal = document.getElementById('btnConnectGoogleCalendar');
        if (btnConnectGCal) {
            btnConnectGCal.addEventListener('click', function () {
                handleConnectGoogleCalendar();
            });
        }

        // Wire Disconnect Google Calendar Button
        const btnDisconnectGCal = document.getElementById('btnDisconnectGoogleCalendar');
        if (btnDisconnectGCal) {
            btnDisconnectGCal.addEventListener('click', function () {
                handleDisconnectGoogleCalendar();
            });
        }

        const btnRenewGCalWatch = document.getElementById('btnRenewGoogleCalendarWatch');
        if (btnRenewGCalWatch) {
            btnRenewGCalWatch.addEventListener('click', function () {
                handleRenewGoogleCalendarWatch();
            });
        }

        const btnUserSignOut = document.getElementById('btnUserSignOut');
        if (btnUserSignOut) {
            btnUserSignOut.addEventListener('click', function () {
                if (!global.googleIdentity || typeof global.googleIdentity.signOut !== 'function') {
                    return;
                }

                global.googleIdentity.signOut();
            });
        }

        // Hook into auth state change to check calendar status and update modal visibility
        if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.addAuthChangeListener === 'function') {
            global.googleIdentity.addAuthChangeListener(function (session) {
                if (session && session.isSignedIn) {
                    atualizarPerfilUsuarioUI(session);

                    // User signed in - check calendar status
                    if (typeof global.googleIdentity.checkCalendarConnectionStatus === 'function') {
                        global.googleIdentity.checkCalendarConnectionStatus()
                            .then(function (status) {
                                atualizarUIStatusGoogleCalendar(status);
                            })
                            .catch(function (error) {
                                console.warn('[settings-modal] Erro ao verificar status do Google Calendar no sign-in:', error);
                                atualizarUIStatusGoogleCalendar({
                                    connected: false,
                                    uiState: 'error',
                                    message: 'Falha ao consultar o estado da Google Agenda.'
                                });
                            });
                    }
                } else {
                    atualizarPerfilUsuarioUI(session || { isSignedIn: false, name: '', email: '', picture: '' });

                    // User signed out - close modal
                    closeUserAreaModal();
                }
            });
        }

        atualizarPerfilUsuarioUI(obterSessaoAtual());
    }

    /**
     * Handle Connect Google Calendar Button Click
     */
    async function handleConnectGoogleCalendar() {
        const btnConnect = document.getElementById('btnConnectGoogleCalendar');
        if (!btnConnect) return;

        const originalText = btnConnect.textContent;
        let originalSpan = '';
        btnConnect.disabled = true;

        try {
            atualizarUIStatusGoogleCalendar({
                connected: false,
                uiState: 'connecting',
                message: 'Conectando à Google Agenda...'
            });

            // Show loading state
            const span = btnConnect.querySelector('span');
            originalSpan = span ? span.textContent : '';
            if (span) {
                span.textContent = 'Conectando...';
            }

            // Call ensureCalendarConnection with interactive mode
            if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.ensureCalendarConnection === 'function') {
                const result = await global.googleIdentity.ensureCalendarConnection({ interactive: true, force: true });

                // Optimistic update: connected state appears immediately
                atualizarUIStatusGoogleCalendar({
                    connected: true,
                    details: result && result.details ? result.details : null,
                    uiState: 'checking',
                    message: 'Conectado. Atualizando status final...'
                });

                // Background refresh to reconcile with backend without blocking UX
                global.googleIdentity.checkCalendarConnectionStatus()
                    .then(function (status) {
                        atualizarUIStatusGoogleCalendar(status);
                    })
                    .catch(function () {
                        atualizarUIStatusGoogleCalendar({
                            connected: true,
                            details: result && result.details ? result.details : null,
                            message: ''
                        });
                    });

                // Show success toast
                if (typeof global.mostrarToast === 'function') {
                    global.mostrarToast('✅ Google Agenda conectada com sucesso!', 'success');
                }
            }
        } catch (error) {
            console.error('[settings-modal] Erro ao conectar Google Calendar:', error);
            const errorMsgBruto = error && error.message ? error.message : 'Falha ao conectar Google Agenda';
            const errorMsg = normalizarMensagemGoogleAgenda(errorMsgBruto);
            atualizarUIStatusGoogleCalendar({
                connected: false,
                uiState: 'error',
                message: errorMsg
            });
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('❌ ' + errorMsg, 'error');
            }
        } finally {
            btnConnect.disabled = false;
            const span = btnConnect.querySelector('span');
            if (span && originalSpan) {
                span.textContent = originalSpan;
            }
        }
    }

    /**
     * Handle Disconnect Google Calendar Button Click
     */
    async function handleDisconnectGoogleCalendar() {
        // Show confirmation dialog
        const confirmed = window.confirm('Tem certeza de que deseja desconectar a Google Agenda?');
        if (!confirmed) {
            return;
        }

        const btnDisconnect = document.getElementById('btnDisconnectGoogleCalendar');
        if (!btnDisconnect) return;

        let originalIcon = '';
        btnDisconnect.disabled = true;

        try {
            atualizarUIStatusGoogleCalendar({
                connected: true,
                uiState: 'disconnecting',
                message: 'Desconectando Google Agenda...'
            });

            // Show loading state
            const icon = btnDisconnect.querySelector('i');
            originalIcon = icon ? icon.className : '';
            if (icon) {
                icon.className = 'fa-solid fa-spinner fa-spin';
            }

            // Call deleteCalendarConnection
            if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.deleteCalendarConnection === 'function') {
                await global.googleIdentity.deleteCalendarConnection();

                // Update UI
                atualizarUIStatusGoogleCalendar({ connected: false });

                // Clean local Google external data immediately
                limparDadosGoogleExternosLocais();

                // Refresh calendar data to remove external blocks from UI
                if (typeof window.sincronizarBancoDados === 'function') {
                    console.log('[settings-modal] Sincronizando dados para remover blocos externos...');
                    try {
                        await window.sincronizarBancoDados();
                    } catch (syncError) {
                        console.warn('[settings-modal] Aviso: Falha na sincronização após desconexão:', syncError);
                        // Don't fail the entire flow - show success anyway since disconnect succeeded
                    }
                }

                // Show success toast
                if (typeof global.mostrarToast === 'function') {
                    global.mostrarToast('✅ Google Agenda desconectada com sucesso!', 'success');
                }
            }
        } catch (error) {
            console.error('[settings-modal] Erro ao desconectar Google Calendar:', error);
            const errorMsgBruto = error && error.message ? error.message : 'Falha ao desconectar Google Agenda';
            const errorMsg = normalizarMensagemGoogleAgenda(errorMsgBruto);
            atualizarUIStatusGoogleCalendar({
                connected: true,
                uiState: 'error',
                message: errorMsg
            });
            if (typeof global.mostrarToast === 'function') {
                global.mostrarToast('❌ ' + errorMsg, 'error');
            }
        } finally {
            btnDisconnect.disabled = false;
            const icon = btnDisconnect.querySelector('i');
            if (icon && originalIcon) {
                icon.className = originalIcon;
            }
        }
    }

    // Expose globally
    global.openUserAreaModal = openUserAreaModal;
    global.closeUserAreaModal = closeUserAreaModal;
    global.initSettingsModal = initialize;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM is already ready
        global.setTimeout(initialize, 0);
    }
})(window);
