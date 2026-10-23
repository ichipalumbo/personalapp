const CACHE_NAME = 'josy-personal';
const APP_SHELL_FILES = [
  '/index.html',
  '/assets/css/style.css',
  '/assets/js/app.js',
  // Etapa 5 da identidade visual: a Poppins precisa existir offline desde a
  // instalação. O activate remove caches anteriores após instalar este shell.
  '/assets/vendor/poppins/poppins-400.woff2',
  '/assets/vendor/poppins/poppins-600.woff2',
  '/assets/vendor/poppins/poppins-700.woff2',
  '/assets/vendor/poppins/poppins-800.woff2',
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

  const isSameOrigin = requestUrl.origin === self.location.origin;
  const isApiRequest = isSameOrigin && requestUrl.pathname.startsWith('/api/');
  const isCacheableGet =
    request.method === 'GET' &&
    (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') &&
    isSameOrigin &&
    !isApiRequest;

  if (!isCacheableGet) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache only successful same-origin "basic" responses (avoid caching opaque/error responses).
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }

        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
          if (request.mode === 'navigate' || acceptsHtml) {
            return caches.match('/index.html');
          }

          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});