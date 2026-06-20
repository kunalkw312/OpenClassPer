const CACHE_NAME = 'openclass-v9';
const OFFLINE_ASSET_URL = 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1781938208/404-svg-animation_drwflw.svg';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/config.js',
  OFFLINE_ASSET_URL
];

// Force immediate installation and storage configurations setup
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Purge obsolete cache structures during new version alignment
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Network Interception Strategies with custom asset overrides
self.addEventListener('fetch', (event) => {
  // Only intercept internal GET network transactions
  if (event.request.method !== 'GET') return;

  // If request targets external APIs or database hubs, use standard network fallbacks
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return resource from asset cache, but sync in background if online
        if (navigator.onLine && event.request.url.startsWith(self.location.origin)) {
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // Cache newly discovered local application resources dynamically
          if (event.request.url.startsWith(self.location.origin)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Absolute Network Loss Exception Matrix
          // If the user attempts an HTML page change/refresh while offline, yield full-screen vector asset
          if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
            return caches.match(OFFLINE_ASSET_URL).then((fallbackSvg) => {
              if (fallbackSvg) {
                // Wrap vector inside HTML layout wrapper to maintain user orientation context safely
                return new Response(
                  `<!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Offline | OpenClass</title>
                    <style>
                      body { margin: 0; padding: 0; background: #050505; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
                      img { width: 100%; max-width: 600px; height: auto; padding: 20px; box-sizing: border-box; }
                    </style>
                  </head>
                  <body>
                    <img src="${OFFLINE_ASSET_URL}" alt="Network Unreachable Context Graphic">
                  </body>
                  </html>`,
                  { headers: { 'Content-Type': 'text/html' } }
                );
              }
            });
          }
        });
    })
  );
});
