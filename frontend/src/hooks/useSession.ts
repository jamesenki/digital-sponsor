import { useState, useCallback, useEffect } from 'react'
import type { Session } from '@/types'

/**
 * useSession Hook
 * 
 * Manages anonymous user sessions per AA Tradition 12 (Anonymity)
 * - No personal data collection
 * - Session-only storage
 * - Automatic cleanup for privacy
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Generate anonymous session ID
  const generateSessionId = (): string => {
    return `ds_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Create new anonymous session
  const createSession = useCallback(async (): Promise<Session> => {
    const newSession: Session = {
      id: generateSessionId(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isAnonymous: true
    }

    setSession(newSession)
    
    // Store in sessionStorage (not localStorage for privacy)
    sessionStorage.setItem('ds_session', JSON.stringify(newSession))
    
    console.log('🔒 Anonymous session created:', newSession.id)
    return newSession
  }, [])

  // Clear session (for privacy compliance)
  const clearSession = useCallback(() => {
    setSession(null)
    sessionStorage.removeItem('ds_session')
    console.log('🗑️ Session cleared for privacy')
  }, [])

  // Check if session is expired
  const isSessionExpired = useCallback((session: Session): boolean => {
    return new Date() > new Date(session.expiresAt)
  }, [])

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Try to restore session from sessionStorage
        const storedSession = sessionStorage.getItem('ds_session')
        
        if (storedSession) {
          const parsedSession: Session = JSON.parse(storedSession)
          
          // Check if session is still valid
          if (!isSessionExpired(parsedSession)) {
            setSession(parsedSession)
            console.log('🔄 Session restored:', parsedSession.id)
          } else {
            console.log('⏰ Session expired, creating new one')
            await createSession()
          }
        } else {
          // No existing session, create new one
          await createSession()
        }
      } catch (error) {
        console.error('Session initialization error:', error)
        // Fallback: create new session
        await createSession()
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [createSession, isSessionExpired])

  // Auto-cleanup expired sessions
  useEffect(() => {
    if (!session) return

    const checkExpiration = () => {
      if (isSessionExpired(session)) {
        console.log('⏰ Session expired, clearing for privacy')
        clearSession()
      }
    }

    // Check every minute
    const interval = setInterval(checkExpiration, 60000)
    
    return () => clearInterval(interval)
  }, [session, isSessionExpired, clearSession])

  // Cleanup on page unload (privacy)
  useEffect(() => {
    const handleUnload = () => {
      // Clear session on page unload for privacy
      clearSession()
    }

    window.addEventListener('beforeunload', handleUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [clearSession])

  return {
    session,
    isLoading,
    createSession,
    clearSession,
    isSessionExpired: session ? isSessionExpired(session) : false
  }
}