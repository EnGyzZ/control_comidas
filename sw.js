const CACHE_NAME = 'comidas-obra-v1';
const urlsToCache = [
  './',
  './index.html',
  // Cacheamos las librerías CDN para que funcionen offline
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
];

// Instalación y cacheo de recursos vitales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Limpieza de cachés viejos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones (Offline First)
self.addEventListener('fetch', event => {
  // Ignoramos peticiones al Webhook (POST) en el Service Worker, de eso se encarga IndexedDB
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Devuelve del caché si existe, sino intenta la red
        return response || fetch(event.request).then(fetchResponse => {
            // Guarda dinámicamente nuevos recursos GET solicitados
            return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, fetchResponse.clone());
                return fetchResponse;
            });
        });
      })
      .catch(() => {
          // Fallback en caso extremo
          return caches.match('./index.html');
      })
  );
});
