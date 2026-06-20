const CACHE_NAME = 'openclass-v9';
const OFFLINE_SVG_URL = 'https://res.cloudinary.com/dowhvdkjh/image/upload/v1781938208/404-svg-animation_drwflw.svg';

const ASSETS = [
  '/',
  '/index.html',
  '/app.js',
  '/config.js',
  OFFLINE_SVG_URL // Pre-cache the animation SVG
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Clean up old caches to prevent storage bloat
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  // Proceed with our smart caching strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 1. Return cached version if found
      if (response) {
        return response;
      }
      
      // 2. Otherwise, fetch from the network
      return fetch(event.request).then((fetchRes) => {
        // Cache dynamic requests if they belong to our origin
        if (event.request.url.startsWith(self.location.origin)) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        }
        return fetchRes;
      }).catch((error) => {
        // 3. OFFLINE FALLBACK: If network fetch completely fails and user is navigating
        if (event.request.mode === 'navigate') {
          // Generate an HTML page dynamically serving the SVG with monochromatic styles
          const offlineHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                <title>Offline | OpenClass</title>
                <style>
                    :root { --bg: #050505; --text: #ffffff; --accent: #f7941d; }
                    @media (prefers-color-scheme: light) {
                        :root { --bg: #fbf9f1; --text: #1a1a1a; }
                    }
                    * { box-sizing: border-box; }
                    html, body {
                        margin: 0; padding: 0; width: 100%; height: 100vh;
                        background-color: var(--bg); color: var(--text);
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                        text-align: center; overflow: hidden;
                        filter: grayscale(100%); /* Monochromatic enforcement */
                    }
                    .illustration {
                        width: 80%; max-width: 400px;
                        max-height: 50vh; object-fit: contain;
                        margin-bottom: 2rem;
                        animation: float 6s ease-in-out infinite;
                    }
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                        100% { transform: translateY(0px); }
                    }
                    h1 {
                        font-size: 28px; font-weight: 900; letter-spacing: 1px;
                        margin: 0 0 10px 0; font-style: italic;
                    }
                    p {
                        font-size: 12px; opacity: 0.6; font-weight: 700;
                        text-transform: uppercase; letter-spacing: 2px;
                        max-width: 80%; line-height: 1.6; margin: 0 0 2rem 0;
                    }
                    button {
                        background: transparent; color: var(--text);
                        border: 2px solid rgba(128,128,128,0.3); border-radius: 14px;
                        padding: 16px 32px; font-weight: 900; font-size: 12px;
                        text-transform: uppercase; letter-spacing: 1px;
                        cursor: pointer; transition: all 0.3s ease;
                    }
                    button:hover, button:active {
                        background: var(--text); color: var(--bg); transform: scale(1.05);
                    }
                </style>
            </head>
            <body>
                <img src="${OFFLINE_SVG_URL}" alt="Lost Connection" class="illustration">
                <h1>CONNECTION LOST</h1>
                <p>You have gone offline. Please check your internet connection.</p>
                <button onclick="window.location.reload()">Retry Connection</button>
            </body>
            </html>
          `;

          return new Response(offlineHtml, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Let other failed requests (images, api calls) fail naturally
        throw error;
      });
    })
  );
});
