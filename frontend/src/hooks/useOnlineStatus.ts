import { useState, useEffect } from 'react'

/**
 * useOnlineStatus Hook
 * 
 * Tracks online/offline status for PWA functionality
 * Essential for offline-first architecture per requirements
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('🌐 Back online - syncing data...')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('📱 Offline mode - using cached data')
    }

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}