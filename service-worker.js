const CACHE_NAME = 'openclass-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/config.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force new service worker to activate immediately
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  // CRITICAL FIX: Only intercept internal GET requests. Ignore POST requests and external APIs.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
      return; 
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
        // Return cached version or fetch new
        return response || fetch(event.request).then((fetchRes) => {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, fetchRes.clone());
                return fetchRes;
            });
        });
    }).catch(() => fetch(event.request))
  );
});