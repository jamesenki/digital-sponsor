import { Router, Request, Response } from 'express'
import { config } from '@/config/database'
import { logger } from '@/utils/logger'
import { asyncHandler } from '@/middleware/errorHandler'

/**
 * Health Check Routes
 * 
 * Provides system health monitoring without exposing sensitive data
 * AA Traditions compliant - no personal information
 */

const router = Router()

/**
 * Basic health check
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Digital Sponsor API',
    version: '0.1.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    compliance: 'AA Traditions 1-12',
    anonymous: true
  }
  
  res.json(healthStatus)
}))

/**
 * Detailed health check (includes database connections)
 */
router.get('/detailed', asyncHandler(async (req: Request, res: Response) => {
  const checks = {
    timestamp: new Date().toISOString(),
    service: 'Digital Sponsor API',
    overall: 'healthy',
    components: {
      api: { status: 'healthy', responseTime: 0 },
      database: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
      redis: { status: 'unknown', responseTime: 0, error: undefined as string | undefined },
      chroma: { status: 'unknown', responseTime: 0, error: undefined as string | undefined }
    },
    compliance: {
      aa_traditions: true,
      anonymity: true,
      data_collection: false,
      personal_tracking: false
    }
  }
  
  // Test PostgreSQL connection
  try {
    const start = Date.now()
    await config.database.query('SELECT 1')
    checks.components.database = {
      status: 'healthy',
      responseTime: Date.now() - start,
      error: undefined
    }
  } catch (error) {
    checks.components.database = {
      status: 'unhealthy',
      responseTime: 0,
      error: 'Connection failed'
    }
    checks.overall = 'degraded'
  }
  
  // Test Redis connection
  try {
    const start = Date.now()
    await config.redis.set('health:check', 'ok', 60)
    await config.redis.get('health:check')
    checks.components.redis = {
      status: 'healthy',
      responseTime: Date.now() - start,
      error: undefined
    }
  } catch (error) {
    checks.components.redis = {
      status: 'unhealthy',
      responseTime: 0,
      error: 'Connection failed'
    }
    checks.overall = 'degraded'
  }
  
  // Test Chroma connection
  try {
    const start = Date.now()
    await config.chroma.connect()
    checks.components.chroma = {
      status: 'healthy',
      responseTime: Date.now() - start,
      error: undefined
    }
  } catch (error) {
    checks.components.chroma = {
      status: 'unhealthy',
      responseTime: 0,
      error: 'Connection failed'
    }
    checks.overall = 'degraded'
  }
  
  // Log health check
  logger.info('Health check performed', {
    overall: checks.overall,
    database: checks.components.database.status,
    redis: checks.components.redis.status,
    chroma: checks.components.chroma.status
  })
  
  // Set appropriate status code
  const statusCode = checks.overall === 'healthy' ? 200 : 503
  
  res.status(statusCode).json(checks)
}))

/**
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Quick checks for critical dependencies
    await Promise.all([
      config.database.query('SELECT 1'),
      config.redis.get('health:check')
    ])
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      message: 'Service is ready to accept requests'
    })
    
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message })
    
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      message: 'Service is not ready to accept requests'
    })
  }
}))

/**
 * Liveness probe (for Kubernetes)
 */
router.get('/live', asyncHandler(async (req: Request, res: Response) => {
  // Simple liveness check
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    pid: process.pid
  })
}))

/**
 * Crisis support health check
 */
router.get('/crisis', asyncHandler(async (req: Request, res: Response) => {
  // Ensure crisis support endpoints are always available
  const crisisHealth = {
    status: 'operational',
    message: 'Crisis support is always available',
    resources: {
      suicide_lifeline: '988',
      crisis_text: 'Text HOME to 741741',
      emergency: '911',
      aa_hotline: 'Contact local AA intergroup'
    },
    availability: '24/7',
    response_time: '< 1s',
    timestamp: new Date().toISOString()
  }
  
  res.json(crisisHealth)
}))

export default router