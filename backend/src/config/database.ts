import { Pool } from 'pg'
import { createClient } from 'redis'
import { logger } from '@/utils/logger'

// Environment variables with defaults
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev'
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380'
const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000'

/**
 * Database Configuration for Digital Sponsor
 * 
 * Following AA Tradition 12: Anonymous data only
 * - No personal information stored
 * - Session IDs are temporary and anonymous
 * - Literature content is public domain
 */

// PostgreSQL configuration
const pgPool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Redis configuration for session management and caching
const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 5000,
  },
  database: 0 // Use database 0 for sessions
})

/**
 * Database connection management
 */
export const config = {
  database: {
    connect: async () => {
      try {
        const client = await pgPool.connect()
        await client.query('SELECT NOW()')
        client.release()
        
        logger.info('PostgreSQL connected successfully', {
          database: 'digital_sponsor_dev',
          anonymous_mode: true
        })
        
        return true
      } catch (error: any) {
        logger.error('PostgreSQL connection failed', { error: error.message })
        throw error
      }
    },
    
    disconnect: async () => {
      try {
        await pgPool.end()
        logger.info('PostgreSQL disconnected')
      } catch (error: any) {
        logger.error('PostgreSQL disconnect error', { error: error.message })
      }
    },
    
    query: async (text: string, params?: any[]) => {
      const start = Date.now()
      try {
        const result = await pgPool.query(text, params)
        const duration = Date.now() - start
        
        logger.debug('Database query executed', {
          duration: `${duration}ms`,
          rows: result.rowCount
        })
        
        return result
      } catch (error: any) {
        logger.error('Database query failed', {
          error: error.message,
          query: text.substring(0, 100) // Log first 100 chars only
        })
        throw error
      }
    }
  },
  
  redis: {
    connect: async () => {
      try {
        await redisClient.connect()
        await redisClient.ping()
        
        logger.info('Redis connected successfully', {
          database: 0,
          purpose: 'session_management'
        })
        
        return true
      } catch (error: any) {
        logger.error('Redis connection failed', { error: error.message })
        throw error
      }
    },
    
    disconnect: async () => {
      try {
        await redisClient.disconnect()
        logger.info('Redis disconnected')
      } catch (error: any) {
        logger.error('Redis disconnect error', { error: error.message })
      }
    },
    
    get: async (key: string) => {
      try {
        return await redisClient.get(key)
      } catch (error: any) {
        logger.error('Redis GET failed', { key, error: error.message })
        return null
      }
    },
    
    set: async (key: string, value: string, ttl?: number) => {
      try {
        if (ttl) {
          await redisClient.setEx(key, ttl, value)
        } else {
          await redisClient.set(key, value)
        }
        return true
      } catch (error: any) {
        logger.error('Redis SET failed', { key, error: error.message })
        return false
      }
    },
    
    del: async (key: string) => {
      try {
        await redisClient.del(key)
        return true
      } catch (error: any) {
        logger.error('Redis DEL failed', { key, error: error.message })
        return false
      }
    }
  },
  
  chroma: {
    connect: async () => {
      try {
        // Simple HTTP check for Chroma availability
        const response = await fetch(`${CHROMA_URL}/api/v1/heartbeat`)
        
        if (response.ok) {
          logger.info('Chroma vector database connected', {
            url: CHROMA_URL,
            purpose: 'literature_embeddings'
          })
          return true
        } else {
          throw new Error(`Chroma responded with status ${response.status}`)
        }
      } catch (error: any) {
        logger.error('Chroma connection failed', { error: error.message })
        // Don't throw - make chroma optional for now
        return false
      }
    },
    
    disconnect: async () => {
      // Chroma doesn't require explicit disconnect
      logger.info('Chroma connection closed')
    }
  }
}

// Handle Redis connection errors
redisClient.on('error', (error) => {
  logger.error('Redis client error', { error: error.message })
})

redisClient.on('connect', () => {
  logger.info('Redis client connected')
})

redisClient.on('disconnect', () => {
  logger.info('Redis client disconnected')
})

// Handle PostgreSQL connection errors
pgPool.on('error', (error) => {
  logger.error('PostgreSQL pool error', { error: error.message })
})

export { pgPool, redisClient }