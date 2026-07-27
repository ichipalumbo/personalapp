(function (global) {
    'use strict';

    const CLIENT_ID = '799456461369-r4g75ok414jf9gb104um8j0k0ucimu1g.apps.googleusercontent.com';
    const API_BASE_URL = 'https://personal-app-api.vercel.app/api';
    const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
    const PROFILE_CACHE_KEY = 'gis_profile_cache';
    const CALENDAR_STATUS_CACHE_KEY = 'gcal_connection_cache';
    const READY_TIMEOUT_MS = 1500;
    const AUTO_PROMPT_ON_INIT = false;
    const AUTO_RESTORE_SESSION_ON_INIT = true;

    let _initialized = false;
    let _gisInitialized = false;
    let _idToken = null;
    let _profile = null;
    let _readyResolved = false;
    let _resolveReady = null;
    let _promptBloqueado = false;
    let _calendarCodeClient = null;
    let _calendarConnected = false;
    let _calendarConnectionDetails = null;
    let _calendarStatusCheckedAt = 0;
    let _pendingCalendarCodeResolver = null;
    let _pendingCalendarCodeRejecter = null;
    const _authListeners = [];

    const _readyPromise = new Promise(function (resolve) {
        _resolveReady = resolve;
    });

    global.__appGoogleConfig = global.__appGoogleConfig || {};
    if (!global.__appGoogleConfig.clientId) {
        global.__appGoogleConfig.clientId = CLIENT_ID;
    }

    global.__gisReadyHandlers = global.__gisReadyHandlers || [];
    global.__registerGISReadyHandler = function (handler) {
        if (typeof handler !== 'function') {
            return;
        }

        global.__gisReadyHandlers.push(handler);

        if (global.google && global.google.accounts) {
            try {
                handler();
            } catch (error) {
                console.error('[auth] Erro ao executar handler GIS já carregado:', error);
            }
        }
    };

    global._onGISLoad = function () {
        const handlers = Array.isArray(global.__gisReadyHandlers)
            ? global.__gisReadyHandlers.slice()
            : [];

        handlers.forEach(function (handler) {
            try {
                handler();
            } catch (error) {
                console.error('[auth] Erro ao inicializar handler GIS:', error);
            }
        });
    };

    function _markReady() {
        if (_readyResolved) {
            return;
        }

        _readyResolved = true;
        _resolveReady();
    }

    function _decodeJwtPayload(token) {
        try {
            const parts = String(token || '').split('.');
            if (parts.length < 2) {
                return null;
            }

            const base64Url = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64Url + '='.repeat((4 - (base64Url.length % 4)) % 4);
            const json = global.atob(padded);
            return JSON.parse(json);
        } catch (error) {
            console.warn('[auth] Falha ao decodificar JWT do Google:', error);
            return null;
        }
    }

    function _showAuthMessage(message, level) {
        const tipo = level || 'warning';
        if (typeof global.mostrarToast === 'function') {
            global.mostrarToast(message, tipo);
            return;
        }
        if (tipo === 'error') {
            console.error('[auth]', message);
            return;
        }
        console.warn('[auth]', message);
    }

    function _obterMotivoPrompt(notification) {
        try {
            if (notification && notification.getNotDisplayedReason && notification.isNotDisplayed && notification.isNotDisplayed()) {
                return notification.getNotDisplayedReason() || 'not_displayed';
            }
            if (notification && notification.getSkippedReason && notification.isSkippedMoment && notification.isSkippedMoment()) {
                return notification.getSkippedReason() || 'skipped';
            }
        } catch (_) {
            return 'unknown';
        }

        return 'unknown';
    }

    function _tratarResultadoPrompt(notification) {
        if (!notification) {
            return;
        }

        const isNotDisplayed = notification.isNotDisplayed && notification.isNotDisplayed();
        const isSkipped = notification.isSkippedMoment && notification.isSkippedMoment();

        if (!isNotDisplayed && !isSkipped) {
            return;
        }

        const motivo = _obterMotivoPrompt(notification);
        console.warn('[auth] Prompt de login não exibido/ignorado. Motivo:', motivo);

        if (motivo === 'unregistered_origin') {
            _promptBloqueado = true;
            _showAuthMessage('Origem atual não autorizada no Google Client ID. Adicione este domínio em Authorized JavaScript origins.', 'error');
            return;
        }

        if (motivo === 'browser_not_supported') {
            _promptBloqueado = true;
            _showAuthMessage('Este ambiente é tratado como WebView e o Google Sign-In pode não funcionar. Abra em navegador padrão (Chrome/Safari).', 'warning');
            return;
        }

        if (motivo === 'suppressed_by_user') {
            _showAuthMessage('O navegador suprimiu o prompt automático. Use o botão "Entrar com Google".', 'warning');
            return;
        }

        _showAuthMessage('Prompt de login não foi exibido neste contexto. Tente no navegador padrão.', 'warning');
    }

    function _persistProfile(profile) {
        try {
            if (profile) {
                localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
            } else {
                localStorage.removeItem(PROFILE_CACHE_KEY);
            }
        } catch (error) {
            console.warn('[auth] Falha ao persistir perfil localmente:', error);
        }
    }

    function _restoreCachedProfile() {
        try {
            const raw = localStorage.getItem(PROFILE_CACHE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            if (parsed && parsed.email) {
                _profile = parsed;
            }
        } catch (error) {
            console.warn('[auth] Falha ao restaurar perfil em cache:', error);
        }
    }

    function _persistCalendarStatusCache(payload) {
        try {
            if (!payload) {
                localStorage.removeItem(CALENDAR_STATUS_CACHE_KEY);
                return;
            }

            localStorage.setItem(CALENDAR_STATUS_CACHE_KEY, JSON.stringify(payload));
        } catch (error) {
            console.warn('[auth] Falha ao persistir status de conexão do calendário:', error);
        }
    }

    function _restoreCalendarStatusCache() {
        try {
            const raw = localStorage.getItem(CALENDAR_STATUS_CACHE_KEY);
            if (!raw) {
                return;
            }

            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') {
                return;
            }

            _calendarConnected = parsed.connected === true;
            _calendarConnectionDetails = parsed.details && typeof parsed.details === 'object'
                ? parsed.details
                : null;
            _calendarStatusCheckedAt = parsed.checkedAt ? Number(parsed.checkedAt) : 0;
        } catch (error) {
            console.warn('[auth] Falha ao restaurar cache de status do calendário:', error);
        }
    }

    function _atualizarCacheConexaoCalendario(connected, details) {
        _calendarConnected = connected === true;
        _calendarConnectionDetails = details && typeof details === 'object' ? details : null;
        _calendarStatusCheckedAt = Date.now();

        _persistCalendarStatusCache({
            connected: _calendarConnected,
            details: _calendarConnectionDetails,
            checkedAt: _calendarStatusCheckedAt
        });
    }

    function _getSessionSnapshot() {
        const profile = _profile || null;
        return {
            isSignedIn: !!(_idToken && profile && profile.email),
            ownerEmail: profile && profile.email ? String(profile.email).toLowerCase() : null,
            name: profile && profile.name ? profile.name : '',
            email: profile && profile.email ? profile.email : '',
            picture: profile && profile.picture ? profile.picture : ''
        };
    }

    function _notifyAuthListeners() {
        const snapshot = _getSessionSnapshot();
        _authListeners.forEach(function (listener) {
            try {
                listener(snapshot);
            } catch (error) {
                console.error('[auth] Listener de autenticação falhou:', error);
            }
        });
    }

    function _updateUi() {
        const session = _getSessionSnapshot();
        const signedOutState = document.getElementById('googleSignedOutState');
        const signedInState = document.getElementById('googleSignedInState');
        const sessionName = document.getElementById('headerSessionName');
        const sessionEmail = document.getElementById('headerSessionEmail');
        const sessionAvatar = document.getElementById('headerSessionAvatar');
        const btnAppSettings = document.getElementById('btnAppSettings');

        if (signedOutState) {
            signedOutState.hidden = session.isSignedIn;
        }

        if (signedInState) {
            signedInState.hidden = !session.isSignedIn;
        }

        if (btnAppSettings) {
            btnAppSettings.hidden = !session.isSignedIn;
        }

        if (sessionName) {
            sessionName.textContent = session.name || 'Conectado com Google';
        }

        if (sessionEmail) {
            sessionEmail.textContent = session.email || 'Conta ativa';
        }

        if (sessionAvatar) {
            if (session.picture) {
                sessionAvatar.innerHTML = '<img src="' + session.picture + '" alt="Avatar da conta Google" />';
            } else {
                const email = session.email || '';
                const fallback = email ? String(email).charAt(0).toUpperCase() : 'G';
                sessionAvatar.textContent = fallback;
            }
        }
    }

    function _handleCredentialResponse(response) {
        if (!response || !response.credential) {
            _markReady();
            return;
        }

        const payload = _decodeJwtPayload(response.credential);
        if (!payload || !payload.email) {
            console.warn('[auth] Credencial do Google sem email utilizável.');
            _markReady();
            return;
        }

        _idToken = response.credential;
        _profile = {
            name: payload.name || '',
            email: payload.email || '',
            picture: payload.picture || '',
            sub: payload.sub || ''
        };

        _persistProfile(_profile);
        _updateUi();
        _notifyAuthListeners();
        _markReady();
        console.info('[auth] Sessão Google ativa para:', _profile.email);
    }

    function _requestInteractiveSignIn() {
        if (!global.google || !global.google.accounts || !global.google.accounts.id) {
            _showAuthMessage('Autenticação Google ainda está carregando (ou foi bloqueada pelo navegador). Tente novamente em alguns segundos.', 'warning');
            return;
        }

        if (_promptBloqueado) {
            _showAuthMessage('Login Google bloqueado neste contexto. Verifique origem autorizada ou use navegador padrão.', 'warning');
            return;
        }

        global.google.accounts.id.prompt(function (notification) {
            _tratarResultadoPrompt(notification);
        });
    }

    function _attemptSilentSessionRestore() {
        if (!global.google || !global.google.accounts || !global.google.accounts.id || _idToken) {
            return;
        }

        global.google.accounts.id.prompt(function (notification) {
            if (!notification) {
                return;
            }

            const isNotDisplayed = notification.isNotDisplayed && notification.isNotDisplayed();
            const isSkipped = notification.isSkippedMoment && notification.isSkippedMoment();

            if (!isNotDisplayed && !isSkipped) {
                return;
            }

            const motivo = _obterMotivoPrompt(notification);

            if (motivo === 'unregistered_origin') {
                _promptBloqueado = true;
                _showAuthMessage('Origem atual não autorizada no Google Client ID. Adicione este domínio em Authorized JavaScript origins.', 'error');
                return;
            }

            if (motivo === 'browser_not_supported') {
                _promptBloqueado = true;
                _showAuthMessage('Este ambiente é tratado como WebView e o Google Sign-In pode não funcionar. Abra em navegador padrão (Chrome/Safari).', 'warning');
                return;
            }

            console.info('[auth] Restauração silenciosa de sessão não concluída. Motivo:', motivo);
        });
    }

    function _bindCustomLoginButton() {
        const customLoginButton = document.getElementById('custom-google-login');
        if (!customLoginButton || customLoginButton.dataset.boundAuthClick === 'true') {
            return;
        }

        customLoginButton.dataset.boundAuthClick = 'true';
        customLoginButton.addEventListener('click', function () {
            _requestInteractiveSignIn();
        });
    }

    function _initializeGISCalendarCodeClient() {
        if (_calendarCodeClient || !global.google || !global.google.accounts || !global.google.accounts.oauth2) {
            return;
        }

        _calendarCodeClient = global.google.accounts.oauth2.initCodeClient({
            client_id: global.__appGoogleConfig.clientId,
            scope: CALENDAR_SCOPE,
            ux_mode: 'popup',
            callback: function (response) {
                if (_pendingCalendarCodeResolver) {
                    _pendingCalendarCodeResolver(response || {});
                }
                _pendingCalendarCodeResolver = null;
                _pendingCalendarCodeRejecter = null;
            },
            error_callback: function (error) {
                if (_pendingCalendarCodeRejecter) {
                    _pendingCalendarCodeRejecter(error || new Error('Falha ao solicitar autorização de calendário.'));
                }
                _pendingCalendarCodeResolver = null;
                _pendingCalendarCodeRejecter = null;
            }
        });
    }

    async function _postCalendarCodeToBackend(code) {
        const ownerEmail = _getSessionSnapshot().ownerEmail;

        if (!ownerEmail) {
            throw new Error('Faça login com Google antes de conectar o calendário.');
        }

        const endpoints = [
            `${API_BASE_URL}/gcal/exchange`,
            `${API_BASE_URL}/auth/exchange`,
            `${API_BASE_URL}/auth`,
            `${API_BASE_URL}/gcal`
        ];

        let ultimoErro = null;

        for (const endpoint of endpoints) {
            try {
                let resposta;
                if (typeof global.apiFetchBackend === 'function') {
                    resposta = await global.apiFetchBackend(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, ownerEmail })
                    });
                } else {
                    resposta = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(global.googleIdentity && global.googleIdentity.getIdToken && global.googleIdentity.getIdToken()
                                ? { Authorization: 'Bearer ' + global.googleIdentity.getIdToken() }
                                : {})
                        },
                        body: JSON.stringify({ code, ownerEmail })
                    });
                }

                if (resposta.status === 404) {
                    continue;
                }

                if (!resposta.ok) {
                    const detalhe = await resposta.text().catch(() => '');
                    throw new Error(`Backend retornou ${resposta.status}: ${detalhe}`);
                }

                const dados = await resposta.json().catch(() => ({}));
                const details = dados && typeof dados === 'object' ? dados : null;
                _atualizarCacheConexaoCalendario(true, details);
                return dados;
            } catch (error) {
                ultimoErro = error;
            }
        }

        throw ultimoErro || new Error('Não foi possível enviar o Auth Code para o backend.');
    }

    async function _consultarConexaoCalendario() {
        const ownerEmail = _getSessionSnapshot().ownerEmail;

        if (!ownerEmail) {
            _atualizarCacheConexaoCalendario(false, null);
            return { connected: false };
        }

        const endpoints = [
            `${API_BASE_URL}/gcal/connection?ownerEmail=${encodeURIComponent(ownerEmail)}`,
            `${API_BASE_URL}/auth/connection?ownerEmail=${encodeURIComponent(ownerEmail)}`
        ];

        for (const endpoint of endpoints) {
            try {
                const resposta = typeof global.apiFetchBackend === 'function'
                    ? await global.apiFetchBackend(endpoint, { method: 'GET' })
                    : await fetch(endpoint, {
                        method: 'GET',
                        headers: {
                            ...(global.googleIdentity && global.googleIdentity.getIdToken && global.googleIdentity.getIdToken()
                                ? { Authorization: 'Bearer ' + global.googleIdentity.getIdToken() }
                                : {})
                        }
                    });

                if (resposta.status === 404) {
                    continue;
                }

                if (!resposta.ok) {
                    continue;
                }

                const dados = await resposta.json().catch(() => ({}));
                const connected = !!(dados && (dados.connected === true || dados.connection));
                const details = dados && typeof dados === 'object' ? dados : null;
                _atualizarCacheConexaoCalendario(connected, details);
                return { connected, details };
            } catch (_) {
                // tenta o próximo endpoint
            }
        }

        _atualizarCacheConexaoCalendario(false, null);
        return { connected: false };
    }

    function getCachedCalendarConnectionStatus() {
        return {
            connected: _calendarConnected === true,
            details: _calendarConnectionDetails,
            checkedAt: _calendarStatusCheckedAt,
            fromCache: true
        };
    }

    function _solicitarAuthCodeCalendario() {
        return new Promise(function (resolve, reject) {
            if (!_calendarCodeClient) {
                reject(new Error('Cliente de autorização de calendário não inicializado.'));
                return;
            }

            const profile = _profile || null;
            const hint = profile && profile.email ? String(profile.email) : undefined;

            _pendingCalendarCodeResolver = resolve;
            _pendingCalendarCodeRejecter = reject;

            _calendarCodeClient.requestCode({
                hint,
                prompt: 'consent'
            });
        });
    }

    async function ensureCalendarConnection(options = {}) {
        const opts = options && typeof options === 'object' ? options : {};
        const interactive = opts.interactive === true;
        const force = opts.force === true;

        if (!global.googleIdentity || !global.googleIdentity.isSignedIn || !global.googleIdentity.isSignedIn()) {
            throw new Error('Faça login com Google antes de conectar o calendário.');
        }

        if (!force && _calendarConnected) {
            return {
                connected: true,
                fromCache: true,
                details: _calendarConnectionDetails
            };
        }

        const statusAtual = await _consultarConexaoCalendario();
        if (statusAtual.connected) {
            return statusAtual;
        }

        if (!interactive) {
            return { connected: false, needsConsent: true };
        }

        const codeResponse = await _solicitarAuthCodeCalendario();
        if (!codeResponse || !codeResponse.code) {
            throw new Error('Não foi possível obter o código de autorização do Google Calendar.');
        }

        const detalhesConexao = await _postCalendarCodeToBackend(codeResponse.code);
        return {
            connected: true,
            connectedNow: true,
            details: detalhesConexao
        };
    }

    async function checkCalendarConnectionStatus() {
        try {
            const status = await _consultarConexaoCalendario();
            return status;
        } catch (error) {
            console.error('[auth] Erro ao verificar status da conexão do Google Calendar:', error);
            return { connected: false };
        }
    }

    async function deleteCalendarConnection() {
        const ownerEmail = _getSessionSnapshot().ownerEmail;

        if (!ownerEmail) {
            throw new Error('Não há sessão ativa para desconectar Google Calendar.');
        }

        const endpoint = `${API_BASE_URL}/gcal/connection?ownerEmail=${encodeURIComponent(ownerEmail)}`;

        try {
            const resposta = typeof global.apiFetchBackend === 'function'
                ? await global.apiFetchBackend(endpoint, { method: 'DELETE' })
                : await fetch(endpoint, {
                    method: 'DELETE',
                    headers: {
                        ...(global.googleIdentity && global.googleIdentity.getIdToken && global.googleIdentity.getIdToken()
                            ? { Authorization: 'Bearer ' + global.googleIdentity.getIdToken() }
                            : {})
                    }
                });

            if (!resposta.ok) {
                const errorData = await resposta.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao desconectar Google Calendar.');
            }

            const dados = await resposta.json().catch(() => ({}));
            _atualizarCacheConexaoCalendario(false, null);
            return { disconnected: true, details: dados };
        } catch (error) {
            console.error('[auth] Erro ao desconectar Google Calendar:', error);
            throw error;
        }
    }

    function _formatarDataConexao(valor) {
        if (!valor) {
            return '';
        }

        const data = new Date(String(valor));
        if (Number.isNaN(data.getTime())) {
            return '';
        }

        return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function updateGoogleCalendarStatusUI(status) {
        const btnConnect = document.getElementById('btnConnectGoogleCalendar');
        const connectedState = document.getElementById('gcalConnectedState');
        const connectedEmail = document.getElementById('gcalConnectedEmail');
        const connectedSince = document.getElementById('gcalConnectedSince');
        const feedback = document.getElementById('gcalStatusFeedback');

        if (!btnConnect || !connectedState) {
            return;
        }

        const detalhesRaiz = status && status.details
            ? (status.details.connection || status.details)
            : null;
        const emailGoogle = detalhesRaiz && detalhesRaiz.googleEmail ? String(detalhesRaiz.googleEmail) : '';
        const ultimaConexao = detalhesRaiz && detalhesRaiz.lastConnectedAt
            ? _formatarDataConexao(detalhesRaiz.lastConnectedAt)
            : '';

        if (status && status.connected === true) {
            btnConnect.hidden = true;
            connectedState.hidden = false;

            if (connectedEmail) {
                if (emailGoogle) {
                    connectedEmail.textContent = `Conta: ${emailGoogle}`;
                    connectedEmail.hidden = false;
                } else {
                    connectedEmail.textContent = '';
                    connectedEmail.hidden = true;
                }
            }

            if (connectedSince) {
                if (ultimaConexao) {
                    connectedSince.textContent = `Conectado em: ${ultimaConexao}`;
                    connectedSince.hidden = false;
                } else {
                    connectedSince.textContent = '';
                    connectedSince.hidden = true;
                }
            }
        } else {
            btnConnect.hidden = false;
            connectedState.hidden = true;

            if (connectedEmail) {
                connectedEmail.textContent = '';
                connectedEmail.hidden = true;
            }

            if (connectedSince) {
                connectedSince.textContent = '';
                connectedSince.hidden = true;
            }
        }

        if (feedback) {
            const mensagem = status && status.message ? String(status.message) : '';
            const estadoUI = status && status.uiState ? String(status.uiState) : '';

            if (mensagem) {
                feedback.textContent = mensagem;
                feedback.hidden = false;

                if (estadoUI === 'error') {
                    feedback.classList.add('error');
                } else {
                    feedback.classList.remove('error');
                }
            } else {
                feedback.textContent = '';
                feedback.hidden = true;
                feedback.classList.remove('error');
            }
        }
    }

    function _initializeGISIdentity() {
        if (_gisInitialized || !global.google || !global.google.accounts || !global.google.accounts.id) {
            return;
        }

        _gisInitialized = true;

        global.google.accounts.id.initialize({
            client_id: global.__appGoogleConfig.clientId,
            callback: _handleCredentialResponse,
            auto_select: true,
            cancel_on_tap_outside: false,
            use_fedcm_for_prompt: true
        });

        _bindCustomLoginButton();
        _initializeGISCalendarCodeClient();
        _updateUi();

        if (AUTO_PROMPT_ON_INIT) {
            global.google.accounts.id.prompt(function (notification) {
                _tratarResultadoPrompt(notification);
                _markReady();
            });
        } else {
            if (AUTO_RESTORE_SESSION_ON_INIT) {
                _attemptSilentSessionRestore();
            }
            _markReady();
        }
    }

    function initialize() {
        if (_initialized) {
            return whenReady();
        }

        _initialized = true;
        _restoreCachedProfile();
        _restoreCalendarStatusCache();
        _updateUi();
        _bindCustomLoginButton();

        const signOutButton = document.getElementById('btnGoogleSignOut');
        if (signOutButton) {
            signOutButton.addEventListener('click', function () {
                if (global.google && global.google.accounts && global.google.accounts.id) {
                    global.google.accounts.id.disableAutoSelect();
                }

                _idToken = null;
                _profile = null;
                _calendarConnected = false;
                _persistProfile(null);
                
                // Close settings modal on sign-out
                if (typeof global.closeAppSettingsModal === 'function') {
                    global.closeAppSettingsModal();
                }
                
                _updateUi();
                _notifyAuthListeners();
                console.info('[auth] Sessão Google encerrada localmente.');
            });
        }

        if (typeof global.__registerGISReadyHandler === 'function') {
            global.__registerGISReadyHandler(_initializeGISIdentity);
        }

        global.setTimeout(_markReady, READY_TIMEOUT_MS);
        return whenReady();
    }

    function whenReady(timeoutMs) {
        const waitMs = typeof timeoutMs === 'number' ? timeoutMs : READY_TIMEOUT_MS;
        return Promise.race([
            _readyPromise,
            new Promise(function (resolve) {
                global.setTimeout(resolve, waitMs);
            })
        ]);
    }

    function addAuthChangeListener(listener) {
        if (typeof listener !== 'function') {
            return function () {};
        }

        _authListeners.push(listener);
        return function () {
            const idx = _authListeners.indexOf(listener);
            if (idx !== -1) {
                _authListeners.splice(idx, 1);
            }
        };
    }

    global.googleIdentity = {
        initialize: initialize,
        whenReady: whenReady,
        isSignedIn: function () {
            return !!_idToken;
        },
        getIdToken: function () {
            return _idToken;
        },
        getOwnerEmail: function () {
            return _idToken && _profile && _profile.email
                ? String(_profile.email).toLowerCase()
                : null;
        },
        getProfile: function () {
            return _profile ? { ..._profile } : null;
        },
        ensureCalendarConnection: ensureCalendarConnection,
        checkCalendarConnectionStatus: checkCalendarConnectionStatus,
        getCachedCalendarConnectionStatus: getCachedCalendarConnectionStatus,
        deleteCalendarConnection: deleteCalendarConnection,
        updateGoogleCalendarStatusUI: updateGoogleCalendarStatusUI,
        connectCalendar: function () {
            return ensureCalendarConnection({ interactive: true, force: false });
        },
        getCalendarConnectionStatus: function () {
            return _consultarConexaoCalendario();
        },
        addAuthChangeListener: addAuthChangeListener,
        refreshButton: _bindCustomLoginButton,
        updateUi: _updateUi
    };
})(window);