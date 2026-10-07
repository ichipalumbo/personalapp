(function (global) {
    'use strict';

    const CLIENT_ID = '799456461369-r4g75ok414jf9gb104um8j0k0ucimu1g.apps.googleusercontent.com';
    const APP_API_CONFIG = global.APP_API_CONFIG;
    if (!APP_API_CONFIG || typeof APP_API_CONFIG.apiBaseUrl !== 'string') {
        throw new Error('assets/js/config/api-config.js precisa ser carregado antes de assets/js/auth/google-identity.js.');
    }
    const API_BASE_URL = APP_API_CONFIG.apiBaseUrl;
    const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
    const PROFILE_CACHE_KEY = 'gis_profile_cache';
    const SESSION_CACHE_KEY = 'gis_session_cache';
    const TOKEN_SKEW_MS = 5 * 60 * 1000;
    const CALENDAR_STATUS_CACHE_KEY = 'gcal_connection_cache';
    const READY_TIMEOUT_MS = 1500;
    const GIS_RENDER_RETRY_MS = 400;
    const GIS_RENDER_MAX_TENTATIVAS = 3;
    const AUTO_PROMPT_ON_INIT = false;
    const AUTO_RESTORE_SESSION_ON_INIT = true;

    let _initialized = false;
    let _gisInitialized = false;
    let _idToken = null;
    let _idTokenExpiraEm = 0;
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
    let _gisLoadIssueReported = false;
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

    global._onGISError = function () {
        _promptBloqueado = true;
        _reportGISUnavailable('script_load_error');
        _markReady();
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

    function _reportGISUnavailable(reason) {
        if (_gisLoadIssueReported) {
            return;
        }

        _gisLoadIssueReported = true;
        const motivo = reason || 'unknown';
        console.error('[auth] GIS indisponível. Motivo:', motivo);
        _showAuthMessage('Não foi possível carregar o login Google (GIS). Verifique bloqueadores, CSP, domínio autorizado e conexão com accounts.google.com.', 'error');
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

    function _revelarBotaoOficialGoogle() {
        const container = document.getElementById('googleSignInButtonFallback');
        if (!container) {
            return;
        }

        container.classList.add('is-visible');
        _renderGoogleOfficialButton();
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
            _revelarBotaoOficialGoogle();
            _showAuthMessage('O Google bloqueou o login automático. Use o botão do Google que apareceu no topo.', 'warning');
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

    function _lerExpiracaoDoToken(token) {
        try {
            const partes = String(token).split('.');
            if (partes.length < 2) {
                return 0;
            }

            const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
            if (!payload || typeof payload.exp !== 'number') {
                return 0;
            }

            return payload.exp * 1000;
        } catch (_) {
            return 0;
        }
    }

    function _lerEmailDoToken(token) {
        try {
            const partes = String(token).split('.');
            if (partes.length < 2) {
                return '';
            }

            const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(decodeURIComponent(escape(atob(base64))));
            if (!payload || typeof payload.email !== 'string') {
                return '';
            }

            return payload.email.trim().toLowerCase();
        } catch (_) {
            return '';
        }
    }

    function _tokenAindaValido(expiraEm) {
        if (!expiraEm) {
            return false;
        }

        return expiraEm - Date.now() > TOKEN_SKEW_MS;
    }

    function _persistSession(token) {
        try {
            if (!token) {
                localStorage.removeItem(SESSION_CACHE_KEY);
                return;
            }

            const expiraEm = _lerExpiracaoDoToken(token);
            if (!_tokenAindaValido(expiraEm)) {
                localStorage.removeItem(SESSION_CACHE_KEY);
                return;
            }

            localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({
                idToken: token,
                expiraEm: expiraEm,
                email: _lerEmailDoToken(token)
            }));
        } catch (error) {
            console.warn('[auth] Não foi possível persistir a sessão:', error);
        }
    }

    function _restoreCachedSession() {
        try {
            const raw = localStorage.getItem(SESSION_CACHE_KEY);
            if (!raw) {
                return;
            }

            const cache = JSON.parse(raw);
            if (!cache || !cache.idToken || !_tokenAindaValido(cache.expiraEm)) {
                localStorage.removeItem(SESSION_CACHE_KEY);
                return;
            }

            const emailPerfil = _profile && _profile.email
                ? String(_profile.email).trim().toLowerCase()
                : '';

            if (emailPerfil && cache.email && cache.email !== emailPerfil) {
                console.warn('[auth] Cache de sessão pertence a outra conta. Descartando sessão e perfil.');
                localStorage.removeItem(SESSION_CACHE_KEY);
                _persistProfile(null);
                _profile = null;
                return;
            }

            _idToken = cache.idToken;
            _idTokenExpiraEm = cache.expiraEm;
            console.info('[auth] Sessão restaurada do dispositivo.');
        } catch (error) {
            console.warn('[auth] Cache de sessão inválido. Descartando.', error);
            localStorage.removeItem(SESSION_CACHE_KEY);
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

    function _performSignOut() {
        if (global.google && global.google.accounts && global.google.accounts.id) {
            global.google.accounts.id.disableAutoSelect();
        }

        _idToken = null;
        _idTokenExpiraEm = 0;
        _persistSession(null);
        _profile = null;
        _calendarConnected = false;
        _persistProfile(null);

        if (typeof global.closeUserAreaModal === 'function') {
            global.closeUserAreaModal();
        }

        _updateUi();
        _notifyAuthListeners();
        console.info('[auth] Sessão Google encerrada localmente.');
    }

    function _updateUi() {
        const session = _getSessionSnapshot();
        const signedOutState = document.getElementById('googleSignedOutState');
        const signedInState = document.getElementById('googleSignedInState');
        const sessionAvatar = document.getElementById('headerSessionAvatar');

        if (signedOutState) {
            signedOutState.hidden = session.isSignedIn;
        }

        if (signedInState) {
            signedInState.hidden = !session.isSignedIn;
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
        _idTokenExpiraEm = _lerExpiracaoDoToken(_idToken);
        _persistSession(_idToken);
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

            if (motivo === 'suppressed_by_user') {
                _revelarBotaoOficialGoogle();
            }

            console.info('[auth] Restauração silenciosa de sessão não concluída. Motivo:', motivo);
        });
    }

    function _renderGoogleOfficialButton(tentativa) {
        const container = document.getElementById('googleSignInButtonFallback');
        if (!container || !global.google || !global.google.accounts || !global.google.accounts.id) {
            return;
        }

        if (container.dataset.gisRendered === 'true') {
            return;
        }

        try {
            global.google.accounts.id.renderButton(container, {
                type: 'icon',
                theme: 'filled_black',
                size: 'medium',
                shape: 'circle'
            });
        } catch (error) {
            console.warn('[auth] Falha ao renderizar botão oficial do Google:', error);
            return;
        }

        if (container.childElementCount > 0) {
            container.dataset.gisRendered = 'true';
            return;
        }

        const proxima = (typeof tentativa === 'number' ? tentativa : 0) + 1;
        if (proxima >= GIS_RENDER_MAX_TENTATIVAS) {
            console.warn('[auth] Botão oficial do Google não renderizou após', proxima, 'tentativas.');
            return;
        }

        global.setTimeout(function () {
            _renderGoogleOfficialButton(proxima);
        }, GIS_RENDER_RETRY_MS);
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

    function _exigirContextoCalendario(contexto) {
        if (!global.contextoDados || !global.contextoDados.atual(contexto)) throw new Error('CONTEXTO_OBSOLETO');
    }

    function _exigirOperacaoCalendario(contexto, operacao) {
        _exigirContextoCalendario(contexto);
        if (operacao && (!global.contextoDados.operacaoAtual(operacao) || operacao.falha)) {
            throw new Error('OPERACAO_INTERROMPIDA');
        }
        const pendencia = global.contextoDados.obterPendencia(contexto);
        if (pendencia && (!operacao || pendencia.tentativaId !== operacao.id)) {
            throw new Error('PENDENCIA_LOCAL');
        }
    }

    function _acompanharConexaoCalendario(operacao, executar) {
        // A tarefa cobre GIS, headers e corpo, não apenas o fetch. A raiz emprestada
        // não pode terminar enquanto esta conexão ainda puder iniciar outra etapa.
        const tarefa = Promise.resolve().then(executar).catch(function (error) {
            const motivosSeguros = ['CONTEXTO_OBSOLETO', 'OPERACAO_INTERROMPIDA', 'PENDENCIA_LOCAL', 'AUTH_REQUIRED'];
            const erroSeguro = new Error(error && motivosSeguros.includes(error.message)
                ? error.message : 'Conexão da Google Agenda não confirmada.');
            if (error && error.code === 'TIMEOUT') erroSeguro.code = 'TIMEOUT';
            if (operacao) {
                // Não persistir code, credenciais ou mensagens devolvidas pelo exchange.
                global.contextoDados.marcarFalhaOperacao(operacao, new Error('Conexão da Google Agenda não confirmada.'));
            }
            // Chamadores também registram a falha na raiz: devolver somente erro seguro.
            throw erroSeguro;
        });
        return operacao ? global.contextoDados.acompanharTarefa(operacao, tarefa) : tarefa;
    }

    async function _requisitarConexaoCalendario(endpoint, options) {
        _exigirContextoCalendario(options.contextoDados);
        if (options.operacao) _exigirOperacaoCalendario(options.contextoDados, options.operacao);
        if (typeof global.apiFetchBackend === 'function') {
            return global.apiFetchBackend(endpoint, options);
        }

        const { operacao, contextoDados, statusEsperados = [], ...opcoesFetch } = options;
        const token = global.googleIdentity.getIdToken();
        if (!token) throw new Error('AUTH_REQUIRED');
        const etapa = operacao && options.method !== 'GET'
            ? { url: endpoint, method: options.method, confirmada: false } : null;
        if (etapa) global.contextoDados.registrarEtapa(operacao, etapa);
        const tarefa = fetch(endpoint, {
            ...opcoesFetch,
            headers: { ...opcoesFetch.headers, Authorization: 'Bearer ' + token }
        });
        const resposta = await (operacao ? global.contextoDados.acompanharTarefa(operacao, tarefa) : tarefa);
        if (etapa) {
            etapa.status = resposta.status;
            etapa.confirmada = resposta.ok || statusEsperados.includes(resposta.status);
            if (!etapa.confirmada) throw new Error(`Backend retornou ${resposta.status}.`);
            global.contextoDados.atualizarOperacao(operacao);
        }
        _exigirContextoCalendario(contextoDados);
        return resposta;
    }

    async function _postCalendarCodeToBackend(code, contexto, operacao) {
        _exigirOperacaoCalendario(contexto, operacao);
        if (!operacao) throw new Error('OPERACAO_INTERROMPIDA');
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

        for (const endpoint of endpoints) {
            _exigirOperacaoCalendario(contexto, operacao);
            let resposta;
            try {
                resposta = await _requisitarConexaoCalendario(endpoint, {
                    method: 'POST',
                    contextoDados: contexto,
                    operacao,
                    statusEsperados: [404],
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, ownerEmail })
                });
            } catch (error) {
                // Sem garantia de que o envio não chegou: reenviar o mesmo code para outro
                // endpoint pode consumir a autorização duas vezes. A tentativa para aqui.
                _exigirContextoCalendario(contexto);
                throw error;
            }

            // Só 404 (rota inexistente neste deploy) autoriza tentar o próximo caminho.
            // Qualquer outra resposta prova que o endpoint existe e respondeu: repetir o
            // exchange no caminho seguinte reenviaria o mesmo code sem necessidade.
            if (resposta.status === 404) {
                continue;
            }

            if (!resposta.ok) {
                throw new Error(`Backend retornou ${resposta.status}.`);
            }

            const dados = await resposta.json();
            _exigirOperacaoCalendario(contexto, operacao);
            const details = dados && typeof dados === 'object' ? dados : null;
            _atualizarCacheConexaoCalendario(true, details);
            return dados;
        }

        throw new Error('Não foi possível enviar o Auth Code para o backend.');
    }

    async function _consultarConexaoCalendario(contexto = global.contextoDados.capturar(), operacao = null) {
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
            _exigirContextoCalendario(contexto);
            const resposta = await _requisitarConexaoCalendario(endpoint, {
                method: 'GET', contextoDados: contexto, operacao, statusEsperados: [404]
            });

            if (resposta.status === 404) {
                continue;
            }

            if (!resposta.ok) {
                throw new Error(`Backend retornou ${resposta.status}.`);
            }

            const dados = await resposta.json();
            _exigirContextoCalendario(contexto);
            if (operacao) _exigirOperacaoCalendario(contexto, operacao);
            const connected = !!(dados && (dados.connected === true || dados.connection));
            const details = dados && typeof dados === 'object' ? dados : null;
            _atualizarCacheConexaoCalendario(connected, details);
            return { connected, details };
        }

        _exigirContextoCalendario(contexto);
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
            if (_pendingCalendarCodeResolver) {
                reject(new Error('Autorização de calendário já em andamento.'));
                return;
            }

            const profile = _profile || null;
            const hint = profile && profile.email ? String(profile.email) : undefined;

            _pendingCalendarCodeResolver = resolve;
            _pendingCalendarCodeRejecter = reject;

            try {
                _calendarCodeClient.requestCode({ hint, prompt: 'consent' });
            } catch (error) {
                _pendingCalendarCodeResolver = null;
                _pendingCalendarCodeRejecter = null;
                reject(error);
            }
        });
    }

    async function ensureCalendarConnection(options = {}) {
        const opts = options && typeof options === 'object' ? options : {};
        const operacao = opts.operacao || null;
        const contexto = opts.contextoDados || (operacao && operacao.contexto) || global.contextoDados.capturar();
        _exigirOperacaoCalendario(contexto, operacao);
        return _acompanharConexaoCalendario(operacao, function () {
            return _garantirConexaoCalendario(opts, contexto, operacao);
        });
    }

    async function _garantirConexaoCalendario(opts, contexto, operacao) {
        const interactive = opts.interactive === true;
        const force = opts.force === true;
        _exigirOperacaoCalendario(contexto, operacao);

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

        const statusAtual = await _consultarConexaoCalendario(contexto, operacao);
        _exigirOperacaoCalendario(contexto, operacao);
        if (statusAtual.connected) {
            return statusAtual;
        }

        if (!interactive) {
            return { connected: false, needsConsent: true };
        }

        // Só a conexão independente que realmente precisa de consentimento cria raiz.
        // Consulta/cache não criam pendência; a conexão de uma edição usa sua mesma raiz.
        const propria = !operacao;
        const raiz = operacao || global.contextoDados.iniciarOperacao({ tipo: 'conexao-calendario', contexto });
        if (!raiz) throw new Error('PENDENCIA_LOCAL');
        try {
            return await _acompanharConexaoCalendario(raiz, async function () {
                _exigirOperacaoCalendario(contexto, raiz);
                const codeResponse = await _solicitarAuthCodeCalendario();
                _exigirOperacaoCalendario(contexto, raiz);
                if (!codeResponse || !codeResponse.code) {
                    throw new Error('Não foi possível obter o código de autorização da Google Agenda.');
                }

                const detalhesConexao = await _postCalendarCodeToBackend(codeResponse.code, contexto, raiz);
                return { connected: true, connectedNow: true, details: detalhesConexao };
            });
        } finally {
            if (propria) await global.contextoDados.finalizarOperacao(raiz);
        }
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
            throw new Error('Não há sessão ativa para desconectar a Google Agenda.');
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
                throw new Error(errorData.message || 'Falha ao desconectar a Google Agenda.');
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
        const connectionDescription = document.getElementById('gcalConnectionDescription');
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

            if (connectionDescription) {
                connectionDescription.textContent = 'Sua conta está conectada. Você pode desconectar quando quiser.';
            }

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

            if (connectionDescription) {
                connectionDescription.textContent = 'Conecte sua conta para sincronizar compromissos externos com a agenda do app.';
            }

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
        _restoreCachedSession();
        _restoreCalendarStatusCache();
        _updateUi();
        _bindCustomLoginButton();

        if (typeof global.__registerGISReadyHandler === 'function') {
            global.__registerGISReadyHandler(_initializeGISIdentity);
        }

        global.setTimeout(function () {
            const gisDisponivel = !!(global.google && global.google.accounts && global.google.accounts.id);
            if (!_gisInitialized && !gisDisponivel) {
                _reportGISUnavailable('ready_timeout_without_google_accounts');
            }
            _markReady();
        }, READY_TIMEOUT_MS);
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
            if (_idToken && _idTokenExpiraEm && !_tokenAindaValido(_idTokenExpiraEm)) {
                return null;
            }

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
        signOut: _performSignOut,
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