// service-worker.js for X³O³ PWA
const CACHE_NAME = 'x3o3-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/image/icon-192.png',
  '/image/icon-512.png',
  '/sounds/x.mp3', // Added X sound
  '/sounds/o.mp3'  // Added O sound
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Bypass Firestore requests
  if (event.request.url.startsWith('https://firestore.googleapis.com/')) {
    return; // Let the network handle it, do not intercept
  }

  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    )
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
