import { useState, useEffect } from 'react'
import serviceWorkerManager from '@/utils/serviceWorker'
import type { CacheStatus } from '@/utils/serviceWorker'

interface PWAState {
  isInstalled: boolean
  canInstall: boolean
  isOnline: boolean
  updateAvailable: boolean
  cacheStatus: CacheStatus | null
  swRegistered: boolean
}

interface PWAActions {
  installApp: () => Promise<boolean>
  checkForUpdates: () => Promise<void>
  clearCache: (cacheName: string) => Promise<boolean>
  refreshCacheStatus: () => Promise<void>
  getCrisisSupport: () => Promise<any>
}

/**
 * Hook for managing PWA functionality
 * Implements offline-first approach with AA Traditions compliance
 */
export function usePWA(): PWAState & PWAActions {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: serviceWorkerManager.isPWA(),
    canInstall: serviceWorkerManager.canInstall(),
    isOnline: serviceWorkerManager.isAppOnline(),
    updateAvailable: false,
    cacheStatus: null,
    swRegistered: false
  })

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    initializePWA()
    setupEventListeners()
    
    return () => {
      // Cleanup event listeners
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('connectionchange', handleConnectionChange)
      window.removeEventListener('swupdate', handleServiceWorkerUpdate)
    }
  }, [])

  const initializePWA = async (): Promise<void> => {
    try {
      const registered = await serviceWorkerManager.register()
      setPWAState(prev => ({ ...prev, swRegistered: registered }))

      if (registered) {
        console.log('🚀 PWA initialized successfully')
        await refreshCacheStatus()
      }
    } catch (error) {
      console.error('PWA initialization failed:', error)
    }
  }

  const setupEventListeners = (): void => {
    // Install prompt
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Connection changes
    window.addEventListener('connectionchange', handleConnectionChange)
    
    // Service worker updates
    window.addEventListener('swupdate', handleServiceWorkerUpdate)
    
    // App installed
    window.addEventListener('appinstalled', () => {
      console.log('📱 Digital Sponsor installed as PWA')
      setPWAState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false 
      }))
      setDeferredPrompt(null)
    })
  }

  const handleBeforeInstallPrompt = (event: Event): void => {
    // Prevent the mini-infobar from appearing on mobile
    event.preventDefault()
    setDeferredPrompt(event)
    setPWAState(prev => ({ ...prev, canInstall: true }))
    console.log('📱 PWA install prompt available')
  }

  const handleConnectionChange = (event: Event): void => {
    const customEvent = event as CustomEvent
    const { isOnline } = customEvent.detail
    setPWAState(prev => ({ ...prev, isOnline }))
    
    if (isOnline) {
      console.log('🟢 Connection restored - refreshing cache')
      refreshCacheStatus()
    } else {
      console.log('🟡 Offline mode - using cached content')
    }
  }

  const handleServiceWorkerUpdate = (event: Event): void => {
    const customEvent = event as CustomEvent
    if (customEvent.detail.updateAvailable) {
      setPWAState(prev => ({ ...prev, updateAvailable: true }))
      console.log('🔄 App update available')
    }
  }

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('❌ Install prompt not available')
      return false
    }

    try {
      // Show the install prompt
      deferredPrompt.prompt()
      
      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted PWA install')
        setDeferredPrompt(null)
        setPWAState(prev => ({ ...prev, canInstall: false }))
        return true
      } else {
        console.log('❌ User dismissed PWA install')
        return false
      }
    } catch (error) {
      console.error('PWA install failed:', error)
      return false
    }
  }

  const checkForUpdates = async (): Promise<void> => {
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        console.log('🔍 Checked for service worker updates')
      }
    } catch (error) {
      console.error('Update check failed:', error)
    }
  }

  const clearCache = async (cacheName: string): Promise<boolean> => {
    try {
      const success = await serviceWorkerManager.clearCache(cacheName)
      if (success) {
        await refreshCacheStatus()
        console.log(`🗑️ Cache cleared: ${cacheName}`)
      }
      return success
    } catch (error) {
      console.error('Cache clear failed:', error)
      return false
    }
  }

  const refreshCacheStatus = async (): Promise<void> => {
    try {
      const status = await serviceWorkerManager.getCacheStatus()
      setPWAState(prev => ({ ...prev, cacheStatus: status }))
    } catch (error) {
      console.error('Failed to refresh cache status:', error)
    }
  }

  const getCrisisSupport = async (): Promise<any> => {
    try {
      return await serviceWorkerManager.getCrisisSupport()
    } catch (error) {
      console.error('Failed to get crisis support:', error)
      // Return default crisis support
      return {
        message: "Immediate help is available even when the app isn't working properly.",
        immediate_help: {
          suicide_lifeline: '988',
          crisis_text: 'Text HOME to 741741',
          emergency: '911'
        },
        aa_resources: {
          meeting_guide: 'Visit aa.org for local meetings',
          general_service: '(212) 870-3400'
        }
      }
    }
  }

  return {
    // State
    ...pwaState,
    
    // Actions
    installApp,
    checkForUpdates,
    clearCache,
    refreshCacheStatus,
    getCrisisSupport
  }
}