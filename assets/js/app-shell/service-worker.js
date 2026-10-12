(function (global) {
    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        let hasReloadedForServiceWorkerUpdate = false;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hasReloadedForServiceWorkerUpdate) {
                return;
            }

            hasReloadedForServiceWorkerUpdate = true;
            global.location.reload();
        });

        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                registration.update();
                console.log('Service Worker registered successfully:', registration);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }

    global.__appServiceWorker = {
        register: registerServiceWorker
    };
})(window);
