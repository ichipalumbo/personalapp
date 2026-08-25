(function () {
    const ORDEM_NIVEIS = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    };
    const NIVEL_PADRAO = 'info';
    const STORAGE_KEY = 'personal_app_log_nivel';

    function normalizarNivel(valor) {
        const nivel = String(valor || '').trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(ORDEM_NIVEIS, nivel)
            ? nivel
            : NIVEL_PADRAO;
    }

    function persistirNivel(nivel) {
        try {
            if (window.localStorage) {
                window.localStorage.setItem(STORAGE_KEY, nivel);
            }
        } catch (_) {
            // Ignora falhas de persistência para não derrubar o app.
        }
    }

    function lerNivelPersistido() {
        try {
            if (!window.localStorage) {
                return NIVEL_PADRAO;
            }
            return normalizarNivel(window.localStorage.getItem(STORAGE_KEY));
        } catch (_) {
            return NIVEL_PADRAO;
        }
    }

    let nivelAtual = normalizarNivel(lerNivelPersistido());

    function deveRegistrar(nivel) {
        const alvo = ORDEM_NIVEIS[normalizarNivel(nivel)] ?? ORDEM_NIVEIS[NIVEL_PADRAO];
        const atual = ORDEM_NIVEIS[nivelAtual] ?? ORDEM_NIVEIS[NIVEL_PADRAO];
        return alvo <= atual;
    }

    function chamarMetodoNativo(metodo, args) {
        try {
            if (!console || typeof console[metodo] !== 'function') {
                return;
            }
            console[metodo].apply(console, args);
        } catch (_) {
            // Log nunca pode derrubar fluxo do app.
        }
    }

    function registrar(nivel, ...args) {
        try {
            const nivelNormalizado = normalizarNivel(nivel);
            if (!deveRegistrar(nivelNormalizado)) {
                return;
            }
            const metodo = {
                error: 'error',
                warn: 'warn',
                info: 'log',
                debug: 'debug'
            }[nivelNormalizado] || 'log';
            chamarMetodoNativo(metodo, args);
        } catch (_) {
            // Ignora qualquer falha de logging para não quebrar o runtime.
        }
    }

    function grupo(titulo, fn) {
        try {
            if (!deveRegistrar('info')) {
                return typeof fn === 'function' ? fn() : undefined;
            }

            const groupFn = console && typeof console.groupCollapsed === 'function'
                ? console.groupCollapsed.bind(console)
                : (console && typeof console.group === 'function'
                    ? console.group.bind(console)
                    : null);

            if (!groupFn) {
                return typeof fn === 'function' ? fn() : undefined;
            }

            groupFn(titulo);
            try {
                return typeof fn === 'function' ? fn() : undefined;
            } finally {
                try {
                    if (console && typeof console.groupEnd === 'function') {
                        console.groupEnd();
                    }
                } catch (_) {
                    // Ignora falha ao finalizar grupo.
                }
            }
        } catch (_) {
            try {
                return typeof fn === 'function' ? fn() : undefined;
            } catch (_) {
                return undefined;
            }
        }
    }

    const api = {
        error: (...args) => registrar('error', ...args),
        warn: (...args) => registrar('warn', ...args),
        info: (...args) => registrar('info', ...args),
        debug: (...args) => registrar('debug', ...args),
        grupo
    };

    Object.defineProperty(api, 'nivel', {
        get: function () {
            return nivelAtual;
        },
        set: function (valor) {
            nivelAtual = normalizarNivel(valor);
            persistirNivel(nivelAtual);
        },
        enumerable: true,
        configurable: true
    });

    window.log = api;
})();
