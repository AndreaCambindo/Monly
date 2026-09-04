/* =====================================================
   MONLY — SERVICE WORKER
   Cachea la app (HTML/CSS/JS/íconos) y las librerías externas
   (Chart.js, XLSX, jsPDF, Google Fonts) desde la PRIMERA visita,
   así funciona sin internet incluso si nunca se volvió a abrir
   estando offline antes.

   Estrategia: "cache primero, con actualización en segundo
   plano" — abre instantáneo desde caché, y si hay internet
   disponible, actualiza la caché calladamente para la próxima
   vez. Sube CACHE_VERSION cada vez que publiques cambios en la
   app para que los usuarios reciban la versión nueva.
   ===================================================== */

const CACHE_VERSION = 'monly-cache-v4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.bundle.css',
  './js/app.bundle.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.png',
  // Librerías externas (CDN) — se cachean como respuestas "opacas" (no-cors),
  // que el navegador sí permite guardar y reutilizar aunque no se pueda leer su contenido.
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.5.0/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) => {
          const isExternal = url.startsWith('http');
          const req = new Request(url, isExternal ? { mode: 'no-cors' } : {});
          return fetch(req)
            .then((res) => cache.put(url, res))
            .catch(() => { /* si una librería externa falla al precachear, no rompe la instalación */ });
        })
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.ok || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached); // sin internet: usa lo que haya en caché

      return cached || networkFetch;
    })
  );
});
