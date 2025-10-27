import winston from 'winston'
import path from 'path'

/**
 * Winston Logger Configuration for Digital Sponsor
 * 
 * AA Tradition 11 & 12 Compliant:
 * - No personal information logged
 * - Anonymous session IDs only
 * - No public relations data
 * - Focus on service availability and system health
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const LOG_DIR = process.env.LOG_DIR || 'logs'

// Custom format for AA Traditions compliance
const aaCompliantFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  // Filter out any potentially personal information
  const safeMeta = { ...meta }
  
  // Remove any fields that might contain personal data
  delete safeMeta.email
  delete safeMeta.phone
  delete safeMeta.name
  delete safeMeta.address
  delete safeMeta.location
  
  // Keep only anonymous session IDs (not user IDs)
  if (safeMeta.userId) {
    delete safeMeta.userId
  }
  
  const metaString = Object.keys(safeMeta).length > 0 ? 
    JSON.stringify(safeMeta, null, 2) : ''
  
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaString}`
})

// Create logger instance
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    aaCompliantFormat
  ),
  
  defaultMeta: {
    service: 'digital-sponsor-api',
    compliance: 'AA-Traditions-12',
    anonymous: true
  },
  
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        aaCompliantFormat
      )
    }),
    
    // File output for all logs
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Error-only file
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false
})

// Handle uncaught exceptions and rejections
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'exceptions.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 3
  })
)

logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(LOG_DIR, 'rejections.log'),
    maxsize: 10 * 1024 * 1024,
    maxFiles: 3
  })
)

/**
 * AA Traditions compliant logging methods
 */
export const aaLogger = {
  // Session activity (anonymous only)
  sessionActivity: (action: string, sessionId: string, metadata?: object) => {
    logger.info(`Session ${action}`, {
      sessionId: sessionId.substring(0, 8) + '...', // Partial session ID only
      action,
      anonymous: true,
      ...metadata
    })
  },
  
  // Literature access (no personal data)
  literatureAccess: (resource: string, sessionId: string, metadata?: object) => {
    logger.info('Literature accessed', {
      resource,
      sessionId: sessionId.substring(0, 8) + '...',
      traditions_compliant: true,
      ...metadata
    })
  },
  
  // API usage patterns (anonymous)
  apiUsage: (endpoint: string, method: string, responseTime: number, statusCode: number) => {
    logger.info('API request', {
      endpoint,
      method,
      responseTime: `${responseTime}ms`,
      statusCode,
      timestamp: new Date().toISOString()
    })
  },
  
  // Crisis support access (important for service monitoring)
  crisisSupport: (sessionId: string, resource: string) => {
    logger.warn('Crisis support accessed', {
      sessionId: sessionId.substring(0, 8) + '...',
      resource,
      priority: 'high',
      follow_up_required: false // Per AA traditions - no follow-up
    })
  },
  
  // System health and availability
  systemHealth: (component: string, status: 'healthy' | 'degraded' | 'down', details?: object) => {
    logger.info('System health check', {
      component,
      status,
      availability: status === 'healthy',
      ...details
    })
  },
  
  // Security events (anonymous)
  securityEvent: (event: string, sessionId: string, details?: object) => {
    logger.warn('Security event', {
      event,
      sessionId: sessionId.substring(0, 8) + '...',
      anonymous: true,
      ...details
    })
  }
}

// Create logs directory if it doesn't exist
if (process.env.NODE_ENV !== 'test') {
  const fs = require('fs')
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

export default logger