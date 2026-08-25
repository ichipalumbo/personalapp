(function () {
    'use strict';

    const LOGGER_STORAGE_KEY = 'personal_app_logger_nivel';
    const LEVELS = ['error', 'warn', 'info', 'debug'];
    const LEVEL_RANK = { error: 0, warn: 1, info: 2, debug: 3 };

    function normalizarNivel(nivel) {
        const valor = String(nivel || '').trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(LEVEL_RANK, valor) ? valor : 'info';
    }

    function carregarNivelSalvo() {
        try {
            const valor = window.localStorage.getItem(LOGGER_STORAGE_KEY);
            return normalizarNivel(valor);
        } catch (error) {
            return 'info';
        }
    }

    function persistirNivel(nivel) {
        try {
            window.localStorage.setItem(LOGGER_STORAGE_KEY, nivel);
        } catch (error) {
            // prever falhas de storage sem derrubar o app
        }
    }

    const logger = {
        _nivel: carregarNivelSalvo()
    };

    Object.defineProperty(logger, 'nivel', {
        get: function () {
            return this._nivel;
        },
        set: function (valor) {
            const nivel = normalizarNivel(valor);
            this._nivel = nivel;
            persistirNivel(nivel);
        }
    });

    logger.grupo = function (titulo, fn) {
        try {
            const groupFn = typeof console.groupCollapsed === 'function'
                ? console.groupCollapsed.bind(console)
                : (typeof console.group === 'function' ? console.group.bind(console) : null);

            if (groupFn) {
                groupFn(String(titulo || 'Grupo'));
            }
            if (typeof fn === 'function') {
                fn();
            }
        } catch (error) {
            // nunca derrubar o restante do app por causa do logger
        } finally {
            try {
                if (typeof console.groupEnd === 'function') {
                    console.groupEnd();
                }
            } catch (error) {
                // ignora também em ambientes sem groupEnd
            }
        }
    };

    function emitir(nivel, args) {
        const nivelAtual = normalizarNivel(logger.nivel);
        const nivelSolicitado = normalizarNivel(nivel);
        if (LEVEL_RANK[nivelSolicitado] > LEVEL_RANK[nivelAtual]) {
            return;
        }

        const metodo = nivelSolicitado === 'error'
            ? console.error
            : nivelSolicitado === 'warn'
                ? console.warn
                : nivelSolicitado === 'info'
                    ? console.log
                    : (console.debug || console.log);

        if (typeof metodo !== 'function') {
            return;
        }

        try {
            metodo.apply(console, args);
        } catch (error) {
            // o logger nunca deve quebrar o fluxo da página
        }
    }

    LEVELS.forEach(function (nivel) {
        logger[nivel] = function () {
            const args = Array.prototype.slice.call(arguments);
            if (args.length === 0) {
                args.push('[app]');
            }
            if (typeof args[0] !== 'string' || args[0].trim() === '') {
                args.unshift('[app]');
            }
            emitir(nivel, args);
        };
    });

    window.log = logger;
})();
