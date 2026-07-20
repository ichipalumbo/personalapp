const CACHE_NAME = 'personal-app-v1';
const APP_SHELL_FILES = [
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (
    request.method !== 'GET' ||
    (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return caches.match('/index.html');
        })
      )
  );
});