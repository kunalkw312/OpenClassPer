const CACHE_NAME = 'openclass-v1';
const ASSETS = [
  '/OpenClassPer/',
  '/OpenClassPer/index.html',
  '/OpenClassPer/app.js',
  '/OpenClassPer/config.js'
];
// ... rest of your worker code

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
