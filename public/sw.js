
const CACHE_NAME = 'digital-sponsor-v1';
const CRISIS_CACHE = 'crisis-support-v1';

const OFFLINE_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

const CRISIS_RESOURCES = [
  '/crisis-support',
  '/hotlines',
  '/offline-resources'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_RESOURCES)),
      caches.open(CRISIS_CACHE).then(cache => cache.addAll(CRISIS_RESOURCES))
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Crisis support always from cache for instant access
  if (event.request.url.includes('crisis')) {
    event.respondWith(
      caches.match(event.request, { cacheName: CRISIS_CACHE })
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Regular caching strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
