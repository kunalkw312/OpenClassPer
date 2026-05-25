const CACHE_NAME = 'openclass-v1';
const GHPATH = '/<OpenClassPer>'; 
const ASSETS = [
  `${GHPATH}/`,
  `${GHPATH}/index.html`,
  `${GHPATH}/app.js`,
  `${GHPATH}/config.js`
];


self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
