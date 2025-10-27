const CACHE_NAME = 'digital-sponsor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Crisis support offline functionality
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CRISIS_SUPPORT') {
    // Handle offline crisis support
    console.log('🆘 Crisis support accessed offline');
  }
});
