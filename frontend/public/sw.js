/**
 * Enhanced Service Worker for Digital Sponsor PWA
 * 
 * Provides offline functionality, background sync, and advanced caching
 * while maintaining AA Tradition 12 (complete anonymity)
 */

const CACHE_VERSION = 'v1.2.0'
const CACHE_NAMES = {
  static: `digital-sponsor-static-${CACHE_VERSION}`,
  dynamic: `digital-sponsor-dynamic-${CACHE_VERSION}`,
  literature: `digital-sponsor-literature-${CACHE_VERSION}`,
  crisis: `digital-sponsor-crisis-${CACHE_VERSION}`,
  sync: `digital-sponsor-sync-${CACHE_VERSION}`
}

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/App.css'
]

// Crisis support content for offline access
const CRISIS_CONTENT = {
  immediate_help: {
    suicide_lifeline: {
      number: '988',
      description: 'National Suicide Prevention Lifeline - Available 24/7',
      instructions: 'Call 988 for immediate crisis support'
    },
    crisis_text: {
      number: '741741',
      description: 'Crisis Text Line - Text HOME to 741741',
      instructions: 'Text messaging crisis support available 24/7'
    },
    emergency: {
      number: '911',
      description: 'Emergency Services',
      instructions: 'Call 911 for immediate emergency assistance'
    }
  },
  aa_resources: {
    general_service: {
      number: '(212) 870-3400',
      description: 'AA General Service Office',
      hours: 'Monday-Friday 8:30am-4:30pm ET'
    },
    meeting_guide: {
      website: 'aa.org',
      description: 'Find local AA meetings',
      offline_instruction: 'When online, visit aa.org for meeting information'
    }
  },
  self_care: [
    'Take deep breaths - breathe in for 4 counts, hold for 4, breathe out for 4',
    'Remember: This feeling is temporary',
    'Reach out to someone you trust',
    'Focus on one moment at a time',
    'You are not alone in this struggle'
  ],
  offline: true
}

// Background sync queue for when offline
let syncQueue = []

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  
  event.waitUntil(
    (async () => {
      // Cache static assets
      const staticCache = await caches.open(CACHE_NAMES.static)
      await staticCache.addAll(STATIC_ASSETS)
      
      // Cache crisis content
      const crisisCache = await caches.open(CACHE_NAMES.crisis)
      await crisisCache.put('/crisis-offline', new Response(JSON.stringify(CRISIS_CONTENT)))
      
      console.log('✅ Service Worker installed and assets cached')
      
      // Force activation
      self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(name => !Object.values(CACHE_NAMES).includes(name))
          .map(name => caches.delete(name))
      )
      
      // Take control of all pages
      await self.clients.claim()
      
      console.log('✅ Service Worker activated')
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and external domains
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }
  
  // Handle different types of requests
  if (url.pathname.startsWith('/crisis')) {
    event.respondWith(handleCrisisRequest(request))
  } else if (url.pathname.startsWith('/literature')) {
    event.respondWith(handleLiteratureRequest(request))
  } else if (url.pathname.startsWith('/api/sync')) {
    event.respondWith(handleSyncRequest(request))
  } else {
    event.respondWith(handleGeneralRequest(request))
  }
})

// Handle crisis support requests with offline fallback
async function handleCrisisRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful response
      const crisisCache = await caches.open(CACHE_NAMES.crisis)
      await crisisCache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('🆘 Network failed for crisis request, serving offline content')
  }
  
  // Serve cached or offline crisis content
  const crisisCache = await caches.open(CACHE_NAMES.crisis)
  const cachedResponse = await crisisCache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Return offline crisis content
  return new Response(JSON.stringify(CRISIS_CONTENT), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// Handle literature requests with caching
async function handleLiteratureRequest(request) {
  const literatureCache = await caches.open(CACHE_NAMES.literature)
  
  try {
    // Try cache first for literature (often large files)
    const cachedResponse = await literatureCache.match(request)
    
    if (cachedResponse) {
      // Return cached version, but update in background
      fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
          await literatureCache.put(request, networkResponse.clone())
        }
      }).catch(() => {
        // Ignore network errors when updating cache
      })
      
      return cachedResponse
    }
    
    // Not in cache, try network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      await literatureCache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('📚 Literature request failed:', error)
  }
  
  // Return offline message
  return new Response(JSON.stringify({
    error: 'Content not available offline',
    message: 'This literature content is not cached for offline viewing.'
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Handle sync requests with queue for offline
async function handleSyncRequest(request) {
  try {
    // Try network request
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Process any queued sync operations
      await processBackgroundSync()
      return networkResponse
    }
  } catch (error) {
    console.log('🔄 Sync request failed, adding to queue')
  }
  
  // Add to sync queue for when online
  if (request.method === 'POST' || request.method === 'PUT') {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    }
    
    syncQueue.push(requestData)
    
    // Store queue in cache for persistence
    const syncCache = await caches.open(CACHE_NAMES.sync)
    await syncCache.put('/sync-queue', new Response(JSON.stringify(syncQueue)))
  }
  
  return new Response(JSON.stringify({
    success: false,
    queued: true,
    message: 'Request queued for when connection is restored'
  }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' }
  })
}

// Handle general requests with caching strategy
async function handleGeneralRequest(request) {
  const dynamicCache = await caches.open(CACHE_NAMES.dynamic)
  
  try {
    // Network first for dynamic content
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      await dynamicCache.put(request, networkResponse.clone())
      return networkResponse
    }
  } catch (error) {
    console.log('🌐 Network request failed, trying cache')
  }
  
  // Try cache
  const cachedResponse = await dynamicCache.match(request)
  
  if (cachedResponse) {
    return cachedResponse
  }
  
  // Try static cache for app shell
  const staticCache = await caches.open(CACHE_NAMES.static)
  const staticResponse = await staticCache.match(request)
  
  if (staticResponse) {
    return staticResponse
  }
  
  // Fallback to offline page
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Digital Sponsor - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex; 
            flex-direction: column;
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 2rem;
          }
          .offline-content { max-width: 400px; }
          h1 { margin-bottom: 1rem; }
          p { margin-bottom: 1.5rem; line-height: 1.6; }
          .crisis-info { 
            background: rgba(255,255,255,0.1); 
            padding: 1rem; 
            border-radius: 8px; 
            margin-top: 1rem;
          }
          .emergency { color: #ff4757; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="offline-content">
          <h1>🤝 Digital Sponsor</h1>
          <h2>📱 Offline Mode</h2>
          <p>You're currently offline, but help is still available.</p>
          
          <div class="crisis-info">
            <h3>🆘 Emergency Support</h3>
            <p class="emergency">Crisis Lifeline: 988</p>
            <p class="emergency">Emergency: 911</p>
            <p>Text HOME to 741741 for crisis support</p>
          </div>
          
          <p>Your recovery data remains private and secure on your device.</p>
          <p>We'll reconnect automatically when your internet returns.</p>
        </div>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  })
}

// Background sync handler
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processBackgroundSync())
  }
})

// Process queued sync operations
async function processBackgroundSync() {
  try {
    // Load queue from cache
    const syncCache = await caches.open(CACHE_NAMES.sync)
    const queueResponse = await syncCache.match('/sync-queue')
    
    if (queueResponse) {
      const queueData = await queueResponse.json()
      syncQueue = queueData || []
    }
    
    // Process queue
    const processedItems = []
    
    for (const item of syncQueue) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        })
        
        if (response.ok) {
          processedItems.push(item)
          console.log('✅ Sync operation completed:', item.url)
        }
      } catch (error) {
        console.log('❌ Sync operation failed:', item.url, error)
      }
    }
    
    // Remove processed items from queue
    syncQueue = syncQueue.filter(item => !processedItems.includes(item))
    
    // Update cached queue
    await syncCache.put('/sync-queue', new Response(JSON.stringify(syncQueue)))
    
    // Notify clients of sync completion
    const clients = await self.clients.matchAll()
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        data: { processed: processedItems.length, remaining: syncQueue.length }
      })
    })
    
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  const { data } = event
  
  switch (data.type) {
    case 'CACHE_LITERATURE':
      handleCacheLiterature(data.payload, event.ports[0])
      break
      
    case 'CRISIS_SUPPORT':
      handleGetCrisisSupport(event.ports[0])
      break
      
    case 'GET_CACHE_STATUS':
      handleGetCacheStatus(event.ports[0])
      break
      
    case 'CLEAR_CACHE':
      handleClearCache(data.payload, event.ports[0])
      break
      
    case 'FORCE_SYNC':
      event.waitUntil(processBackgroundSync())
      break
      
    default:
      console.log('Unknown message type:', data.type)
  }
})

// Cache literature content
async function handleCacheLiterature(payload, port) {
  try {
    const { url, content } = payload
    const literatureCache = await caches.open(CACHE_NAMES.literature)
    
    await literatureCache.put(url, new Response(JSON.stringify(content), {
      headers: { 'Content-Type': 'application/json' }
    }))
    
    port.postMessage({ success: true })
  } catch (error) {
    port.postMessage({ error: error.message })
  }
}

// Get crisis support content
async function handleGetCrisisSupport(port) {
  try {
    const crisisCache = await caches.open(CACHE_NAMES.crisis)
    const response = await crisisCache.match('/crisis-offline')
    
    if (response) {
      const data = await response.json()
      port.postMessage({ data })
    } else {
      port.postMessage({ data: CRISIS_CONTENT })
    }
  } catch (error) {
    port.postMessage({ error: error.message })
  }
}

// Get cache status
async function handleGetCacheStatus(port) {
  try {
    const status = {}
    
    for (const [name, cacheName] of Object.entries(CACHE_NAMES)) {
      const cache = await caches.open(cacheName)
      const keys = await cache.keys()
      
      status[name] = {
        entries: keys.length,
        urls: keys.map(request => request.url)
      }
    }
    
    port.postMessage({ data: status })
  } catch (error) {
    port.postMessage({ error: error.message })
  }
}

// Clear specific cache
async function handleClearCache(payload, port) {
  try {
    const { cacheName } = payload
    const fullCacheName = CACHE_NAMES[cacheName]
    
    if (fullCacheName) {
      await caches.delete(fullCacheName)
      
      // Recreate empty cache
      await caches.open(fullCacheName)
      
      port.postMessage({ data: { success: true, cacheName } })
    } else {
      port.postMessage({ error: 'Invalid cache name' })
    }
  } catch (error) {
    port.postMessage({ error: error.message })
  }
}

// Periodic background sync (when supported)
self.addEventListener('periodicsync', (event) => {
  console.log('⏰ Periodic sync triggered:', event.tag)
  
  if (event.tag === 'background-recovery-sync') {
    event.waitUntil(processBackgroundSync())
  }
})

// Handle push notifications (for future crisis support features)
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  try {
    const data = event.data.json()
    
    // Only handle crisis-related notifications
    if (data.type === 'crisis-support') {
      event.waitUntil(
        self.registration.showNotification('Digital Sponsor - Crisis Support', {
          body: data.message,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'crisis-support',
          requireInteraction: true,
          actions: [
            { action: 'open-crisis', title: 'Get Help Now' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        })
      )
    }
  } catch (error) {
    console.error('Push notification error:', error)
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  if (event.action === 'open-crisis') {
    event.waitUntil(
      self.clients.openWindow('/crisis')
    )
  }
})

console.log('🚀 Digital Sponsor Service Worker loaded')