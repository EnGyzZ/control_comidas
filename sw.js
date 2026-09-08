const CACHE_NAME = 'comidas-obra-v3';
const urlsToCache = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Fuerza a que el nuevo service worker tome el control de inmediato
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Borra cachés viejos
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network First (Intenta buscar internet, si falla usa el caché)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Si hay internet, guarda la nueva versión en el caché y muéstrala
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => {
        // Si NO hay internet, saca la página del caché
        return caches.match(event.request);
      })
  );
});
