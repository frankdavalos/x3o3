// service-worker.js for X³O³ PWA
// Lives at the site root so its scope covers index.html. Paths are relative so
// the app also works when hosted under a sub-path (e.g. GitHub Pages).
const CACHE_NAME = 'x3o3-cache-v2';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/core/sound.js',
  'js/core/script.js',
  'js/multiplayer/multiplayer.js',
  'pwa/manifest.json',
  'assets/images/icons/icon-192.png',
  'assets/images/icons/icon-512.png'
];
// Cross-origin hosts worth keeping offline (the title font).
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', event => {
  event.waitUntil(
    // cache: 'reload' bypasses the HTTP cache so a new version never precaches stale files.
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: answer from cache instantly when possible, and
// refresh the cached copy in the background so edits show up on next load.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !RUNTIME_HOSTS.includes(url.hostname)) return; // Firebase etc.

  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(request, { ignoreSearch: sameOrigin });
      const network = fetch(request)
        .then(response => {
          if (response.ok || response.type === 'opaque') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const response = await network;
      if (response) return response;
      if (request.mode === 'navigate') {
        const shell = await cache.match('index.html');
        if (shell) return shell;
      }
      return Response.error();
    })
  );
});
