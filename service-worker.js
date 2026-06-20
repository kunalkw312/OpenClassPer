const CACHE_NAME = 'openclass-v9';
const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/config.js'
];

const OFFLINE_IMAGE_URL = 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1781938208/404-svg-animation_drwflw.svg';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache the offline image asset along with critical application shell assets
      fetch(OFFLINE_IMAGE_URL).then(res => {
        if (res.ok) cache.put(OFFLINE_IMAGE_URL, res);
      }).catch(() => {});
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept internal GET navigation/resource operations. Ignore external write states or mutations.
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
      return; 
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchRes) => {
            return caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, fetchRes.clone());
                return fetchRes;
            });
        });
    }).catch(() => {
        // Intercept navigation requests to display the offline standalone visual placeholder
        if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
            return caches.match(OFFLINE_IMAGE_URL) || new Response(
                `<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050505;margin:0;"><img src="${OFFLINE_IMAGE_URL}" style="width:100%;height:100%;object-fit:contain;" /></div>`,
                { headers: { 'Content-Type': 'text/html' } }
            );
        }
        return new Response('Network Connection Dropped.', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
