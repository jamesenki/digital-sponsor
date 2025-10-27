import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from '@/config/database'
import { logger } from '@/utils/logger'
import { errorHandler } from '@/middleware/errorHandler'
import { aaComplianceMiddleware } from '@/middleware/aaCompliance'
import { sessionMiddleware } from '@/middleware/session'

// Route imports
import healthRoutes from '@/routes/health'
import sessionRoutes from '@/routes/sessions'
import chatRoutes from '@/routes/chat'
import literatureRoutes from '@/routes/literature'

/**
 * Digital Sponsor Backend API
 * 
 * AA Traditions Compliant:
 * - Tradition 12: Anonymous sessions, no user tracking
 * - Tradition 6: No endorsements, filtered responses only
 * - Tradition 11: Privacy-first, no public relations
 */

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}))

// Rate limiting - protecting against abuse while serving those in need
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    guidance: 'If you are in crisis, please call 988 for immediate help.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Session management (anonymous per AA Tradition 12)
app.use(sessionMiddleware)

// AA Traditions compliance middleware
app.use(aaComplianceMiddleware)

// Request logging
app.use((req, res, next) => {
  logger.info('API Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.sessionID || 'anonymous',
    timestamp: new Date().toISOString()
  })
  next()
})

// Health check (no sensitive data)
app.use('/api/health', healthRoutes)

// Core API routes
app.use('/api/sessions', sessionRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/literature', literatureRoutes)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Digital Sponsor API',
    version: '0.1.0',
    description: 'AI-powered AA literature companion',
    traditions: 'AA Traditions Compliant',
    privacy: 'Anonymous sessions only',
    status: 'operational',
    timestamp: new Date().toISOString()
  })
})

// Crisis support endpoint (always available)
app.get('/api/crisis', (req, res) => {
  res.json({
    emergency: {
      suicide_lifeline: '988',
      crisis_text: 'Text HOME to 741741',
      emergency: '911'
    },
    aa_resources: {
      general_service_office: '(212) 870-3400',
      aa_website: 'https://www.aa.org',
      meeting_guide: 'https://meetingguide.aa.org'
    },
    message: 'You are not alone. Help is available 24/7.',
    timestamp: new Date().toISOString()
  })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested resource does not exist',
    available_endpoints: [
      'GET /api/health',
      'GET /api/crisis',
      'POST /api/sessions',
      'POST /api/chat',
      'GET /api/literature/search'
    ],
    timestamp: new Date().toISOString()
  })
})

// Start server
async function startServer() {
  try {
    // Initialize database connections
    await config.database.connect()
    await config.redis.connect()
    await config.chroma.connect()
    
    app.listen(PORT, () => {
      logger.info('Digital Sponsor API Server Started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        traditions_compliant: true,
        anonymous_mode: true
      })
      
      console.log(`🤝 Digital Sponsor API running on port ${PORT}`)
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🔒 Anonymous sessions enabled`)
      console.log(`✅ AA Traditions compliant`)
    })
    
  } catch (error) {
    logger.error('Failed to start server', { error: error.message })
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  
  try {
    await config.database.disconnect()
    await config.redis.disconnect()
    await config.chroma.disconnect()
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message })
    process.exit(1)
  }
})

startServer()

export default app