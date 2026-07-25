// Service worker for the padangos PWA. The listing data is inlined into
// padangos.html, so caching the page + icons makes the whole app work offline.
// Bump CACHE on every data/UI change so clients pull the fresh page.
const CACHE = 'padangos-2026-07-25n';

const ASSETS = [
  './',
  './index.html',
  './padangos.html',
  './manifest.webmanifest',
  './pwa/icon-192.png',
  './pwa/icon-512.png',
  './pwa/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Drop old caches so a new deploy takes effect immediately.
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // Network-first for the page so fresh listings win when online; fall back to
  // the cached copy offline. Everything else is cache-first.
  const isPage = e.request.mode === 'navigate'
    || e.request.url.endsWith('padangos.html')
    || e.request.url.endsWith('index.html');
  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
  } else {
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
  }
});
