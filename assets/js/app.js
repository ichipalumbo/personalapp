// [TAG-APP-ROUTER] app.js
// Responsabilidade: manter o ponto de entrada estável enquanto o bootstrap SPA
// é migrado para assets/js/app/* de forma incremental.

(function () {
    async function initializeApp() {
        if (!window.__appBootstrap || typeof window.__appBootstrap.initialize !== 'function') {
            throw new Error('Bootstrap da aplicação não encontrado.');
        }

        await window.__appBootstrap.initialize();
    }

    function reportBootstrapError(error) {
        console.error('Falha ao inicializar a aplicação:', error);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeApp().catch(reportBootstrapError);
        });
    } else {
        initializeApp().catch(reportBootstrapError);
    }
})();
