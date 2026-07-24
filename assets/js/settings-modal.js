(function (global) {
    'use strict';

    let _settingsModalOpen = false;

    /**
     * Opens the Settings Modal
     */
    function openAppSettingsModal() {
        const modal = document.getElementById('appSettingsModal');
        const backdrop = document.getElementById('appSettingsBackdrop');

        if (!modal || !backdrop) {
            console.warn('[settings-modal] Modal elements not found');
            return;
        }

        modal.style.display = 'flex';
        backdrop.style.display = 'block';
        _settingsModalOpen = true;
        document.body.style.overflow = 'hidden';

        // Check and update Google Calendar connection status when modal opens
        if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.checkCalendarConnectionStatus === 'function') {
            global.googleIdentity.checkCalendarConnectionStatus()
                .then(function (status) {
                    if (typeof global.googleIdentity.updateGoogleCalendarStatusUI === 'function') {
                        global.googleIdentity.updateGoogleCalendarStatusUI(status);
                    }
                })
                .catch(function (error) {
                    console.warn('[settings-modal] Erro ao verificar status do Google Calendar:', error);
                });
        }
    }

    /**
     * Closes the Settings Modal
     */
    function closeAppSettingsModal() {
        const modal = document.getElementById('appSettingsModal');
        const backdrop = document.getElementById('appSettingsBackdrop');

        if (!modal || !backdrop) {
            return;
        }

        modal.style.display = 'none';
        backdrop.style.display = 'none';
        _settingsModalOpen = false;
        document.body.style.overflow = '';
    }

    /**
     * Initialize Settings Modal and button handlers
     */
    function initialize() {
        // Wire Gear Icon Button (Open Modal)
        const btnAppSettings = document.getElementById('btnAppSettings');
        if (btnAppSettings) {
            btnAppSettings.addEventListener('click', function () {
                openAppSettingsModal();
            });
        }

        // Wire Close Button
        const btnCloseSettings = document.getElementById('btnCloseSettings');
        if (btnCloseSettings) {
            btnCloseSettings.addEventListener('click', function () {
                closeAppSettingsModal();
            });
        }

        // Wire Backdrop Click (Close Modal)
        const backdrop = document.getElementById('appSettingsBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function () {
                closeAppSettingsModal();
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

        // Hook into auth state change to check calendar status and update modal visibility
        if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.addAuthChangeListener === 'function') {
            global.googleIdentity.addAuthChangeListener(function (session) {
                if (session && session.isSignedIn) {
                    // User signed in - check calendar status
                    if (typeof global.googleIdentity.checkCalendarConnectionStatus === 'function') {
                        global.googleIdentity.checkCalendarConnectionStatus()
                            .then(function (status) {
                                if (typeof global.googleIdentity.updateGoogleCalendarStatusUI === 'function') {
                                    global.googleIdentity.updateGoogleCalendarStatusUI(status);
                                }
                            })
                            .catch(function (error) {
                                console.warn('[settings-modal] Erro ao verificar status do Google Calendar no sign-in:', error);
                            });
                    }
                } else {
                    // User signed out - close modal
                    closeAppSettingsModal();
                }
            });
        }
    }

    /**
     * Handle Connect Google Calendar Button Click
     */
    async function handleConnectGoogleCalendar() {
        const btnConnect = document.getElementById('btnConnectGoogleCalendar');
        if (!btnConnect) return;

        const originalText = btnConnect.textContent;
        btnConnect.disabled = true;

        try {
            // Show loading state
            const span = btnConnect.querySelector('span');
            const originalSpan = span ? span.textContent : '';
            if (span) {
                span.textContent = 'Conectando...';
            }

            // Call ensureCalendarConnection with interactive mode
            if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.ensureCalendarConnection === 'function') {
                const result = await global.googleIdentity.ensureCalendarConnection({ interactive: true, force: true });

                // Update UI
                if (typeof global.googleIdentity.updateGoogleCalendarStatusUI === 'function') {
                    global.googleIdentity.updateGoogleCalendarStatusUI(result);
                }

                // Show success toast
                if (typeof global.mostrarToast === 'function') {
                    global.mostrarToast('✅ Google Calendar conectado com sucesso!', 'success');
                }
            }
        } catch (error) {
            console.error('[settings-modal] Erro ao conectar Google Calendar:', error);
            const errorMsg = error && error.message ? error.message : 'Falha ao conectar Google Calendar';
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
        const confirmed = window.confirm('Tem certeza de que deseja desconectar o Google Calendar?');
        if (!confirmed) {
            return;
        }

        const btnDisconnect = document.getElementById('btnDisconnectGoogleCalendar');
        if (!btnDisconnect) return;

        btnDisconnect.disabled = true;

        try {
            // Show loading state
            const icon = btnDisconnect.querySelector('i');
            const originalIcon = icon ? icon.className : '';
            if (icon) {
                icon.className = 'fa-solid fa-spinner fa-spin';
            }

            // Call deleteCalendarConnection
            if (typeof global.googleIdentity === 'object' && typeof global.googleIdentity.deleteCalendarConnection === 'function') {
                const result = await global.googleIdentity.deleteCalendarConnection();

                // Update UI
                if (typeof global.googleIdentity.updateGoogleCalendarStatusUI === 'function') {
                    global.googleIdentity.updateGoogleCalendarStatusUI({ connected: false });
                }

                // Show success toast
                if (typeof global.mostrarToast === 'function') {
                    global.mostrarToast('✅ Google Calendar desconectado com sucesso!', 'success');
                }
            }
        } catch (error) {
            console.error('[settings-modal] Erro ao desconectar Google Calendar:', error);
            const errorMsg = error && error.message ? error.message : 'Falha ao desconectar Google Calendar';
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
    global.openAppSettingsModal = openAppSettingsModal;
    global.closeAppSettingsModal = closeAppSettingsModal;
    global.initSettingsModal = initialize;

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM is already ready
        global.setTimeout(initialize, 0);
    }
})(window);
