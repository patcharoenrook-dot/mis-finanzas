/* Mis finanzas · service worker
   Estrategia «stale-while-revalidate»: responde con lo guardado en caché
   y actualiza la copia en segundo plano.
   Para publicar una versión nueva de la app, sube este número. */
const VERSION = 2;
const CACHE = 'mis-finanzas-v' + VERSION;
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('mis-finanzas-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isNav = req.mode === 'navigate';

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: isNav });
    const network = fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
        return res;
      })
      .catch(() => null);

    if (cached) {
      event.waitUntil(network);
      return cached;
    }
    const res = await network;
    if (res) return res;
    if (isNav) {
      const fallback = (await cache.match('./index.html')) || (await cache.match('./'));
      if (fallback) return fallback;
    }
    return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
