import { Request, Response, NextFunction } from 'express'
import session from 'express-session'
import { v4 as uuidv4 } from 'uuid'
import { config } from '@/config/database'
import { logger } from '@/utils/logger'

/**
 * Anonymous Session Middleware
 * 
 * AA Tradition 12 Compliant:
 * - All sessions are anonymous
 * - No personal data collection
 * - Temporary session IDs only
 * - No cross-session tracking
 */

export interface AnonymousSession {
  id: string
  created: Date
  lastAccessed: Date
  temporary: boolean
  anonymous: true
}

declare module 'express-session' {
  interface SessionData {
    anonymousId: string
    created: Date
    lastAccessed: Date
    literatureHistory: string[]
    preferences: {
      textSize: 'small' | 'medium' | 'large'
      theme: 'light' | 'dark'
    }
  }
}

/**
 * Redis Session Store (AA Traditions compliant)
 */
class AnonymousRedisStore extends session.Store {
  private redis = config.redis
  private ttl = 24 * 60 * 60 // 24 hours
  
  async get(sid: string, callback: (err?: any, session?: session.SessionData) => void) {
    try {
      const sessionData = await this.redis.get(`session:${sid}`)
      
      if (!sessionData) {
        return callback(null, undefined)
      }
      
      const parsed = JSON.parse(sessionData)
      callback(null, parsed)
      
    } catch (error) {
      logger.error('Session get error', { 
        sessionId: sid.substring(0, 8) + '...',
        error: error.message 
      })
      callback(error)
    }
  }
  
  async set(sid: string, session: session.SessionData, callback?: (err?: any) => void) {
    try {
      // Ensure session is anonymous and compliant
      const anonymousSession = {
        ...session,
        anonymousId: session.anonymousId || uuidv4(),
        created: session.created || new Date(),
        lastAccessed: new Date(),
        // Remove any personal data that might have been added
        name: undefined,
        email: undefined,
        phone: undefined,
        address: undefined,
        userId: undefined
      }
      
      const sessionData = JSON.stringify(anonymousSession)
      await this.redis.set(`session:${sid}`, sessionData, this.ttl)
      
      logger.debug('Anonymous session created/updated', {
        sessionId: sid.substring(0, 8) + '...',
        anonymous: true
      })
      
      if (callback) callback()
      
    } catch (error) {
      logger.error('Session set error', {
        sessionId: sid.substring(0, 8) + '...',
        error: error.message
      })
      if (callback) callback(error)
    }
  }
  
  async destroy(sid: string, callback?: (err?: any) => void) {
    try {
      await this.redis.del(`session:${sid}`)
      
      logger.debug('Anonymous session destroyed', {
        sessionId: sid.substring(0, 8) + '...'
      })
      
      if (callback) callback()
      
    } catch (error) {
      logger.error('Session destroy error', {
        sessionId: sid.substring(0, 8) + '...',
        error: error.message
      })
      if (callback) callback(error)
    }
  }
  
  async length(callback: (err?: any, length?: number) => void) {
    try {
      // This is not implemented for privacy reasons
      // We don't want to track the number of active sessions
      callback(null, 0)
    } catch (error) {
      callback(error)
    }
  }
  
  async clear(callback?: (err?: any) => void) {
    try {
      // Not implemented for security reasons
      if (callback) callback()
    } catch (error) {
      if (callback) callback(error)
    }
  }
  
  async touch(sid: string, session: session.SessionData, callback?: (err?: any) => void) {
    try {
      // Update last accessed time
      const sessionData = await this.redis.get(`session:${sid}`)
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        parsed.lastAccessed = new Date()
        await this.redis.set(`session:${sid}`, JSON.stringify(parsed), this.ttl)
      }
      
      if (callback) callback()
      
    } catch (error) {
      if (callback) callback(error)
    }
  }
}

/**
 * Session middleware configuration
 */
export const sessionMiddleware = session({
  name: 'digital-sponsor-session',
  secret: process.env.SESSION_SECRET || 'digital-sponsor-anonymous-sessions-2024',
  store: new AnonymousRedisStore(),
  
  resave: false,
  saveUninitialized: true,
  rolling: true,
  
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  
  genid: () => {
    // Generate anonymous session ID
    return `anon_${uuidv4()}`
  }
})

/**
 * Initialize anonymous session data
 */
export const initializeAnonymousSession = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.anonymousId) {
    req.session.anonymousId = uuidv4()
    req.session.created = new Date()
    req.session.literatureHistory = []
    req.session.preferences = {
      textSize: 'medium',
      theme: 'light'
    }
    
    logger.info('New anonymous session initialized', {
      sessionId: req.sessionID.substring(0, 8) + '...',
      anonymous: true,
      compliance: 'AA Tradition 12'
    })
  }
  
  // Update last accessed
  req.session.lastAccessed = new Date()
  
  next()
}

/**
 * Session cleanup middleware
 */
export const sessionCleanup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Clean up old sessions (runs occasionally)
  if (Math.random() < 0.01) { // 1% chance to run cleanup
    try {
      // This would implement cleanup of expired sessions
      // For now, we rely on Redis TTL
      logger.debug('Session cleanup check completed')
    } catch (error) {
      logger.error('Session cleanup error', { error: error.message })
    }
  }
  
  next()
}

/**
 * Get session info for API responses
 */
export const getSessionInfo = (req: Request): AnonymousSession => {
  return {
    id: req.sessionID,
    created: req.session.created || new Date(),
    lastAccessed: req.session.lastAccessed || new Date(),
    temporary: true,
    anonymous: true
  }
}

/**
 * Destroy session (for logout)
 */
export const destroySession = (req: Request): Promise<void> => {
  return new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        logger.error('Session destroy failed', {
          sessionId: req.sessionID?.substring(0, 8) + '...',
          error: error.message
        })
        reject(error)
      } else {
        logger.info('Anonymous session destroyed', {
          sessionId: req.sessionID?.substring(0, 8) + '...'
        })
        resolve()
      }
    })
  })
}