// [TAG-API-CONFIG] Fonte unica da URL da API no frontend.
// Define producao x ambiente local em um unico lugar; a porta 5000 e o default do backend local.
(function (global) {
    'use strict';

    const LOCAL_API_ROOT_URL = 'http://localhost:5000';
    const LOCAL_API_BASE_URL = 'http://localhost:5000/api';
    const PRODUCAO_API_ROOT_URL = 'https://personal-app-api.vercel.app';
    const PRODUCAO_API_BASE_URL = 'https://personal-app-api.vercel.app/api';
    const hostname = global.location && typeof global.location.hostname === 'string'
        ? global.location.hostname
        : '';
    const ambienteLocal = hostname === 'localhost'
        || hostname === '127.0.0.1'
        || hostname === '127.0.0.2'
        || hostname === '::1';
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

    // Rodada 3 da Etapa 3 (2026-09-27): a tarja visual "LOCAL" (criarTarjaAmbienteLocal /
    // agendarTarjaAmbienteLocal) foi removida a pedido do dono. A confirmacao do ambiente
    // local e feita pelo log "[api-config] Ambiente detectado" acima (console do browser).
})(window);
