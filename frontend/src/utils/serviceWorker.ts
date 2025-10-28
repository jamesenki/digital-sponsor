/**
 * Service Worker Registration and Management
 * Implements PWA functionality with AA Traditions compliance
 */

interface ServiceWorkerMessage {
  type: string
  payload?: any
}

interface CacheStatus {
  [cacheName: string]: {
    entries: number
    urls: string[]
  }
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private isOnline = navigator.onLine

  constructor() {
    this.setupOnlineStatusListener()
  }

  /**
   * Register the service worker
   */
  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      })

      console.log('🚀 Service Worker registered successfully')
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        console.log('📦 Service Worker update found')
        const newWorker = this.registration?.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New Service Worker available - consider refreshing')
              this.notifyUpdate()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data)
      })

      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!this.registration?.active) {
      throw new Error('Service Worker not active')
    }

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel()
      
      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error))
        } else {
          resolve(event.data)
        }
      }

      this.registration!.active!.postMessage(message, [channel.port2])
    })
  }

  /**
   * Cache literature content for offline access
   */
  async cacheLiteratureContent(url: string, content: any): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CACHE_LITERATURE',
        payload: { url, content }
      })
      console.log('📚 Literature content cached for offline access')
    } catch (error) {
      console.error('Failed to cache literature content:', error)
    }
  }

  /**
   * Get crisis support offline
   */
  async getCrisisSupport(): Promise<any> {
    try {
      const response = await this.sendMessage({
        type: 'CRISIS_SUPPORT'
      })
      return response.data
    } catch (error) {
      console.error('Failed to get offline crisis support:', error)
      return this.getDefaultCrisisSupport()
    }
  }

  /**
   * Get cache status
   */
  async getCacheStatus(): Promise<CacheStatus> {
    try {
      const response = await this.sendMessage({
        type: 'GET_CACHE_STATUS'
      })
      return response.data
    } catch (error) {
      console.error('Failed to get cache status:', error)
      return {}
    }
  }

  /**
   * Clear specific cache
   */
  async clearCache(cacheName: string): Promise<boolean> {
    try {
      const response = await this.sendMessage({
        type: 'CLEAR_CACHE',
        payload: { cacheName }
      })
      return response.data.success
    } catch (error) {
      console.error('Failed to clear cache:', error)
      return false
    }
  }

  /**
   * Check if app is running in standalone mode (PWA)
   */
  isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://')
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return 'beforeinstallprompt' in window
  }

  /**
   * Check if app is online
   */
  isAppOnline(): boolean {
    return this.isOnline
  }

  private setupOnlineStatusListener(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      console.log('🟢 Connection restored')
      this.handleOnlineStatusChange(true)
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      console.log('🟡 Connection lost - entering offline mode')
      this.handleOnlineStatusChange(false)
    })
  }

  private handleOnlineStatusChange(isOnline: boolean): void {
    // Dispatch custom event for components to listen
    window.dispatchEvent(new CustomEvent('connectionchange', {
      detail: { isOnline }
    }))

    if (isOnline) {
      // Trigger background sync when back online
      if ('serviceWorker' in navigator && this.registration) {
        try {
          // Check if background sync is supported
          if ('sync' in (this.registration as any)) {
            (this.registration as any).sync.register('background-sync')
          }
        } catch (error) {
          console.log('Background sync not supported')
        }
      }
    }
  }

  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'CRISIS_RESPONSE':
        console.log('🆘 Crisis support response received')
        break
      case 'CACHE_STATUS':
        console.log('📊 Cache status updated')
        break
      case 'CACHE_CLEARED':
        console.log('🗑️ Cache cleared:', data.data.cacheName)
        break
      default:
        console.log('📨 Service Worker message:', data.type)
    }
  }

  private notifyUpdate(): void {
    // Dispatch update event for UI notification
    window.dispatchEvent(new CustomEvent('swupdate', {
      detail: { updateAvailable: true }
    }))
  }

  private getDefaultCrisisSupport(): any {
    return {
      message: "Even though the app is having issues, immediate help is available.",
      immediate_help: {
        suicide_lifeline: '988',
        crisis_text: 'Text HOME to 741741',
        emergency: '911'
      },
      aa_resources: {
        meeting_guide: 'Visit aa.org for meetings',
        general_service: '(212) 870-3400'
      },
      offline: true
    }
  }
}

// Create singleton instance
const serviceWorkerManager = new ServiceWorkerManager()

export default serviceWorkerManager
export { ServiceWorkerManager }
export type { ServiceWorkerMessage, CacheStatus }