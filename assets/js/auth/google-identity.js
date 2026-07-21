(function (global) {
    'use strict';

    const CLIENT_ID = '799456461369-r4g75ok414jf9gb104um8j0k0ucimu1g.apps.googleusercontent.com';
    const PROFILE_CACHE_KEY = 'gis_profile_cache';
    const READY_TIMEOUT_MS = 1500;

    let _initialized = false;
    let _gisInitialized = false;
    let _idToken = null;
    let _profile = null;
    let _readyResolved = false;
    let _resolveReady = null;
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
        const buttonContainer = document.getElementById('googleSignInButton');
        const summary = document.getElementById('googleSessionSummary');
        const signedOutState = document.getElementById('googleSignedOutState');
        const nameEl = document.getElementById('googleSessionName');
        const emailEl = document.getElementById('googleSessionEmail');
        const avatarEl = document.getElementById('googleSessionAvatar');

        if (buttonContainer) {
            buttonContainer.style.display = session.isSignedIn ? 'none' : 'block';
        }
        if (summary) {
            summary.hidden = !session.isSignedIn;
        }
        if (signedOutState) {
            signedOutState.hidden = session.isSignedIn;
        }
        if (nameEl) {
            nameEl.textContent = session.name || 'Conta Google';
        }
        if (emailEl) {
            emailEl.textContent = session.email || 'Faça login para sincronizar com a nuvem';
        }
        if (avatarEl) {
            if (session.picture) {
                avatarEl.innerHTML = '<img src="' + session.picture + '" alt="Foto do usuário" />';
            } else {
                const initial = session.name ? session.name.charAt(0).toUpperCase() : 'G';
                avatarEl.textContent = initial;
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

    function _renderSignInButton() {
        const buttonContainer = document.getElementById('googleSignInButton');
        if (!buttonContainer || !global.google || !global.google.accounts || !global.google.accounts.id) {
            return;
        }

        buttonContainer.innerHTML = '';
        global.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            shape: 'pill',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 260
        });
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

        _renderSignInButton();
        _updateUi();

        global.google.accounts.id.prompt(function (notification) {
            if (!notification) {
                _markReady();
                return;
            }

            if (notification.isNotDisplayed && notification.isNotDisplayed()) {
                _markReady();
                return;
            }

            if (notification.isSkippedMoment && notification.isSkippedMoment()) {
                _markReady();
                return;
            }

            if (notification.isDismissedMoment && notification.isDismissedMoment()) {
                _markReady();
            }
        });
    }

    function initialize() {
        if (_initialized) {
            return whenReady();
        }

        _initialized = true;
        _restoreCachedProfile();
        _updateUi();

        const signOutButton = document.getElementById('btnGoogleSignOut');
        if (signOutButton) {
            signOutButton.addEventListener('click', function () {
                if (global.google && global.google.accounts && global.google.accounts.id) {
                    global.google.accounts.id.disableAutoSelect();
                }

                _idToken = null;
                _profile = null;
                _persistProfile(null);
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
        addAuthChangeListener: addAuthChangeListener,
        refreshButton: _renderSignInButton,
        updateUi: _updateUi
    };
})(window);