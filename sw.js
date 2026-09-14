// sw.js — Service Worker · Obra Comidas PWA
const CACHE_NAME = 'obra-comidas-v1';
const CACHE_URLS = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js'
];

// ── INSTALL: cachear recursos esenciales ─────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CACHE_URLS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] No se pudo cachear:', url, err);
        }))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar caches viejos ──────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first para assets, network-first para API ─
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Ignorar extensiones de Chrome y peticiones no HTTP
  if (!e.request.url.startsWith('http')) return;

  // POST al webhook de Google → solo red, no cachear
  if (e.request.method === 'POST') {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Para CDN (tailwind, sheetjs) → cache-first
  if (url.hostname.includes('tailwindcss.com') ||
      url.hostname.includes('sheetjs.com') ||
      url.hostname.includes('cdn.sheetjs.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return resp;
        }).catch(() => cached || new Response('/* offline */', { status: 503 }));
      })
    );
    return;
  }

  // Para index.html y assets propios → network-first con fallback cache
  e.respondWith(
    fetch(e.request)
      .then(resp => {
        // Guardar copia fresca en cache
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Fallback a index.html para navegación offline
        return caches.match('./index.html');
      }))
  );
});

// ── SYNC: background sync cuando recupere conexión ───────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-movimientos') {
    e.waitUntil(syncMovimientos());
  }
});

async function syncMovimientos() {
  // Notificar a la página que intente sincronizar
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_NOW' });
  });
}

// ── MENSAJE desde la app ──────────────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
