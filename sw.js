// Digital Sponsor Service Worker
// Implements comprehensive PWA functionality with AA Traditions compliance

const CACHE_NAME = 'digital-sponsor-v1.2'
const STATIC_CACHE = 'digital-sponsor-static-v1.2'
const API_CACHE = 'digital-sponsor-api-v1.2'
const LITERATURE_CACHE = 'digital-sponsor-literature-v1.2'

// URLs to cache for offline functionality
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/chat',
  '/literature',
  '/step-work',
  '/meetings'
]

// API endpoints to cache
const apiEndpoints = [
  '/api/literature/sources',
  '/api/chat/suggestions',
  '/api/health'
]

// Crisis support content for offline access
const offlineCrisisContent = {
  message: "I understand you're going through a difficult time. Even though you're offline, help is still available.",
  immediate_help: {
    suicide_lifeline: '988',
    crisis_text: 'Text HOME to 741741',
    emergency: '911'
  },
  aa_resources: {
    meeting_guide: 'Visit aa.org when back online',
    general_service: '(212) 870-3400'
  },
  offline_guidance: [
    'Remember the Serenity Prayer',
    'Reach out to your sponsor or AA friend when possible',
    'Consider attending a local meeting',
    'Practice the principles in all your affairs'
  ]
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('🔧 Digital Sponsor Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(cache => cache.addAll(urlsToCache)),
      caches.open(API_CACHE).then(cache => {
        // Pre-cache critical API endpoints
        return Promise.all(
          apiEndpoints.map(endpoint => 
            fetch(endpoint)
              .then(response => response.ok ? cache.put(endpoint, response) : null)
              .catch(() => null) // Ignore failures during pre-caching
          )
        )
      })
    ])
  )
  
  // Force activation of new service worker
  self.skipWaiting()
})

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('✅ Digital Sponsor Service Worker activated')
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== LITERATURE_CACHE &&
              cacheName !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all clients immediately
  return self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip caching for non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip caching for external domains (except allowed CDNs)
  if (url.origin !== location.origin && !isAllowedCDN(url.origin)) {
    return
  }
  
  event.respondWith(handleFetch(request))
})

function isAllowedCDN(origin) {
  const allowedCDNs = [
    'https://cdnjs.cloudflare.com',
    'https://cdn.jsdelivr.net',
    'https://unpkg.com'
  ]
  return allowedCDNs.includes(origin)
}

async function handleFetch(request) {
  const url = new URL(request.url)
  
  // Handle different types of requests with appropriate caching strategies
  
  // 1. API requests - Cache-First with Network Fallback
  if (url.pathname.startsWith('/api/')) {
    return handleAPIRequest(request)
  }
  
  // 2. Literature content - Cache-First (long-term)
  if (url.pathname.includes('/literature/') || url.pathname.includes('/content/')) {
    return handleLiteratureRequest(request)
  }
  
  // 3. Static assets - Cache-First
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
    return handleStaticRequest(request)
  }
  
  // 4. Navigation requests - Network-First with Cache Fallback
  if (request.mode === 'navigate') {
    return handleNavigationRequest(request)
  }
  
  // 5. Default - Network-First
  return handleDefaultRequest(request)
}

async function handleAPIRequest(request) {
  const cache = await caches.open(API_CACHE)
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful API responses
      cache.put(request, networkResponse.clone())
      return networkResponse
    }
    
    // If network fails, try cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('📦 Serving API from cache:', request.url)
      return cachedResponse
    }
    
    // If both fail, return offline response for critical endpoints
    return createOfflineAPIResponse(request)
    
  } catch (error) {
    // Network error, try cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.log('📦 Serving API from cache (network error):', request.url)
      return cachedResponse
    }
    
    return createOfflineAPIResponse(request)
  }
}

async function handleLiteratureRequest(request) {
  const cache = await caches.open(LITERATURE_CACHE)
  
  // Cache-First for literature (stable content)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    console.log('📚 Serving literature from cache:', request.url)
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Literature temporarily unavailable offline',
      message: 'Please connect to internet to access literature content',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  
  // Cache-First for static assets
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // Return a basic fallback for critical assets
    if (request.url.includes('.css')) {
      return new Response('/* Offline - styles unavailable */', {
        headers: { 'Content-Type': 'text/css' }
      })
    }
    throw error
  }
}

async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // Fall back to cached version or offline page
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return cached index.html for SPA routing
    const indexResponse = await cache.match('/')
    if (indexResponse) {
      return indexResponse
    }
    
    // Ultimate fallback
    return new Response(
      createOfflineHTML(),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}

async function handleDefaultRequest(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }
    
    throw error
  }
}

function createOfflineAPIResponse(request) {
  const url = new URL(request.url)
  
  // Handle specific offline API responses
  if (url.pathname === '/api/chat') {
    return new Response(JSON.stringify({
      response: {
        message: "I'm currently offline, but I want you to know that you're not alone. When you're back online, I'll be here to help with any questions about AA literature and recovery.",
        type: 'offline_message',
        confidence: 1.0,
        sources: []
      },
      session: {
        id: 'offline-session',
        anonymous: true,
        offline: true
      },
      compliance: {
        aa_traditions: true,
        offline_mode: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  if (url.pathname === '/api/literature/search') {
    return new Response(JSON.stringify({
      query: 'offline',
      totalResults: 0,
      results: [],
      message: 'Literature search requires internet connection',
      offline: true,
      compliance: {
        aa_traditions: true,
        offline_mode: true
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return new Response(JSON.stringify({
    error: 'Service temporarily unavailable',
    offline: true,
    message: 'This feature requires an internet connection'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

function createOfflineHTML() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Digital Sponsor - Offline</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .offline-content {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .crisis-section {
          background: rgba(220, 38, 38, 0.2);
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .crisis-number {
          font-size: 2em;
          font-weight: bold;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="offline-content">
        <h1>🤝 Digital Sponsor</h1>
        <h2>📱 Offline Mode</h2>
        <p>You're currently offline, but you're not alone.</p>
        
        <div class="crisis-section">
          <h3>🆘 Crisis Support (Always Available)</h3>
          <div class="crisis-number">988</div>
          <p>Suicide & Crisis Lifeline</p>
          <div class="crisis-number">911</div>
          <p>Emergency Services</p>
          <p><strong>Text HOME to 741741</strong><br>Crisis Text Line</p>
        </div>
        
        <div style="margin: 20px 0;">
          <h3>💝 Remember</h3>
          <p><em>"God, grant me the serenity to accept the things I cannot change, courage to change the things I can, and wisdom to know the difference."</em></p>
        </div>
        
        <p>When you're back online, Digital Sponsor will be here to help with AA literature and recovery support.</p>
        
        <button onclick="window.location.reload()" style="
          background: rgba(255,255,255,0.2);
          border: 2px solid white;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin: 20px 0;
        ">Try Again</button>
        
        <div style="margin-top: 30px; opacity: 0.8;">
          <p><small>✅ AA Traditions Compliant • 🔒 Privacy-First • 🤝 Community Service</small></p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Enhanced message handling for offline functionality
self.addEventListener('message', (event) => {
  if (!event.data) return
  
  const { type, payload } = event.data
  
  switch (type) {
    case 'CRISIS_SUPPORT':
      // Handle offline crisis support
      console.log('🆘 Crisis support accessed offline')
      event.ports[0]?.postMessage({
        type: 'CRISIS_RESPONSE',
        data: offlineCrisisContent
      })
      break
      
    case 'CACHE_LITERATURE':
      // Cache specific literature content
      if (payload?.url) {
        cacheLiteratureContent(payload.url, payload.content)
      }
      break
      
    case 'GET_CACHE_STATUS':
      // Return cache status
      getCacheStatus().then(status => {
        event.ports[0]?.postMessage({
          type: 'CACHE_STATUS',
          data: status
        })
      })
      break
      
    case 'CLEAR_CACHE':
      // Clear specific cache
      if (payload?.cacheName) {
        caches.delete(payload.cacheName).then(success => {
          event.ports[0]?.postMessage({
            type: 'CACHE_CLEARED',
            data: { success, cacheName: payload.cacheName }
          })
        })
      }
      break
  }
})

async function cacheLiteratureContent(url, content) {
  const cache = await caches.open(LITERATURE_CACHE)
  const response = new Response(JSON.stringify(content), {
    headers: { 'Content-Type': 'application/json' }
  })
  await cache.put(url, response)
  console.log('📚 Cached literature content:', url)
}

async function getCacheStatus() {
  const cacheNames = await caches.keys()
  const status = {}
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    status[cacheName] = {
      entries: keys.length,
      urls: keys.map(request => request.url)
    }
  }
  
  return status
}

// Background sync for when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  console.log('🔄 Background sync triggered - connectivity restored')
  
  // Update critical caches when back online
  try {
    const cache = await caches.open(API_CACHE)
    
    // Refresh critical API endpoints
    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(endpoint)
        if (response.ok) {
          await cache.put(endpoint, response)
        }
      } catch (error) {
        console.log('Failed to refresh endpoint:', endpoint)
      }
    }
    
    console.log('✅ Cache updated after connectivity restored')
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

console.log('🚀 Digital Sponsor Service Worker loaded - PWA ready')
console.log('📱 Offline support enabled - AA Traditions compliant')
