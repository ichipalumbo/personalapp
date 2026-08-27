// [TAG-API-CONFIG] Fonte unica da URL da API no frontend.
// Define producao x ambiente local em um unico lugar; a porta 5000 e o default do backend local.
(function (global) {
    'use strict';

    const APP_ENV_BADGE_ID = 'appEnvBadge';
    const LOCAL_API_ROOT_URL = 'http://localhost:5000';
    const LOCAL_API_BASE_URL = 'http://localhost:5000/api';
    const PRODUCAO_API_ROOT_URL = 'https://personal-app-api.vercel.app';
    const PRODUCAO_API_BASE_URL = 'https://personal-app-api.vercel.app/api';
    const hostname = global.location && typeof global.location.hostname === 'string'
        ? global.location.hostname
        : '';
    const ambienteLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    const config = Object.freeze({
        apiRootUrl: ambienteLocal ? LOCAL_API_ROOT_URL : PRODUCAO_API_ROOT_URL,
        apiBaseUrl: ambienteLocal ? LOCAL_API_BASE_URL : PRODUCAO_API_BASE_URL,
        ambiente: ambienteLocal ? 'local' : 'producao'
    });

    global.APP_API_CONFIG = config;

    if (global.log && typeof global.log.info === 'function') {
        global.log.info('[api-config]', 'Ambiente detectado', {
            ambiente: config.ambiente,
            apiBaseUrl: config.apiBaseUrl
        });
    } else if (global.console && typeof global.console.info === 'function') {
        global.console.info('[api-config] Ambiente detectado:', config.ambiente, config.apiBaseUrl);
    }

    if (config.ambiente === 'local') {
        function criarTarjaAmbienteLocal() {
            if (!global.document || global.document.getElementById(APP_ENV_BADGE_ID)) {
                return;
            }

            const badge = global.document.createElement('div');
            const titulo = global.document.createElement('div');
            const detalhe = global.document.createElement('div');

            badge.id = APP_ENV_BADGE_ID;
            badge.setAttribute('aria-hidden', 'true');
            badge.style.position = 'fixed';
            badge.style.right = '12px';
            badge.style.bottom = '12px';
            badge.style.zIndex = '4000';
            badge.style.pointerEvents = 'none';
            badge.style.background = '#111827';
            badge.style.color = '#f9fafb';
            badge.style.borderRadius = '8px';
            badge.style.padding = '8px 10px';
            badge.style.fontFamily = 'system-ui, sans-serif';
            badge.style.fontSize = '11px';
            badge.style.lineHeight = '1.2';
            badge.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.35)';

            titulo.textContent = 'LOCAL';
            titulo.style.fontWeight = '700';
            titulo.style.letterSpacing = '0.08em';
            titulo.style.marginBottom = '2px';

            detalhe.textContent = config.apiBaseUrl;
            detalhe.style.fontSize = '10px';
            detalhe.style.opacity = '0.9';

            badge.appendChild(titulo);
            badge.appendChild(detalhe);
            global.document.body.appendChild(badge);
        }

        function agendarTarjaAmbienteLocal() {
            if (!global.document) {
                return;
            }

            if (global.document.body) {
                criarTarjaAmbienteLocal();
                return;
            }

            global.document.addEventListener('DOMContentLoaded', function onReady() {
                global.document.removeEventListener('DOMContentLoaded', onReady);
                criarTarjaAmbienteLocal();
            });
        }

        agendarTarjaAmbienteLocal();
    }
})(window);
