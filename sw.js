const CACHE_NAME = 'd2ip-cache-v3';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// INSTALL
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache);
    })
  );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );

  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  // Ignore chrome extensions and unsupported requests
  if (
    event.request.url.startsWith('chrome-extension://') ||
    event.request.url.includes('dns.google') ||
    event.request.url.includes('mixkit.co')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Invalid response
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        // Clone response
        const responseToCache = networkResponse.clone();

        // Save fresh response in cache
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(() => {
        // If offline → serve cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Optional offline fallback
          return new Response(
            'You are offline. Please check your internet connection.',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: {
                'Content-Type': 'text/plain'
              }
            }
          );
        });
      })
  );
});