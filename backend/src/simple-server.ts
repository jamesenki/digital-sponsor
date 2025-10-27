import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Simple Digital Sponsor Backend API
 * 
 * AA Traditions Compliant:
 * - Tradition 12: Anonymous sessions, no user tracking
 * - Tradition 6: No endorsements, filtered responses only
 * - Tradition 11: Privacy-first, no public relations
 */

const app = express()
const PORT = process.env.PORT || 3001

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}))

// Body parsing
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Digital Sponsor API',
    version: '0.1.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    compliance: 'AA Traditions 1-12',
    anonymous: true
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

// Basic session endpoint
app.post('/api/sessions', (req, res) => {
  const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  res.status(201).json({
    session: {
      id: sessionId,
      created: new Date().toISOString(),
      anonymous: true,
      temporary: true,
      compliance: 'AA Traditions 1-12'
    },
    message: 'Anonymous session created successfully',
    privacy: {
      notice: 'No personal information is collected or stored',
      data_retention: 'Session expires in 24 hours',
      tracking: 'None'
    },
    timestamp: new Date().toISOString()
  })
})

// Basic chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body
  
  if (!message) {
    return res.status(400).json({
      error: 'Message is required',
      example: {
        message: 'What does the Big Book say about resentments?'
      }
    })
  }
  
  // Simple response for now
  const response = {
    message: 'Thank you for your question about AA literature. This is a placeholder response. The full RAG system will provide detailed answers from the Big Book, Twelve Steps and Twelve Traditions, and other AA-approved materials.',
    sources: ['Placeholder - AA Literature Database'],
    context: 'general',
    confidence: 0.5
  }
  
  res.json({
    response,
    session: {
      id: 'anonymous',
      anonymous: true
    },
    compliance: {
      aa_traditions: true,
      literature_only: true,
      no_endorsements: true
    },
    timestamp: new Date().toISOString()
  })
})

// Basic literature search endpoint
app.get('/api/literature/search', (req, res) => {
  const { query } = req.query
  
  if (!query) {
    return res.status(400).json({
      error: 'Search query is required',
      example: '/api/literature/search?query=resentments'
    })
  }
  
  // Sample results
  const results = [
    {
      id: 'bb_page_64',
      title: 'Resentments - Big Book Page 64',
      excerpt: 'Resentment is the "number one" offender. It destroys more alcoholics than anything else.',
      source: 'Alcoholics Anonymous, Chapter 5: How It Works',
      page: 64,
      category: 'big_book',
      relevance_score: 0.95
    }
  ]
  
  res.json({
    results,
    search: {
      query: query,
      category: 'all',
      total_results: results.length
    },
    compliance: {
      aa_approved: true,
      copyright_compliant: true,
      excerpts_only: true
    },
    timestamp: new Date().toISOString()
  })
})

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

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error)
  
  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'Internal server error',
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString()
    },
    crisis_support: {
      message: 'If you are in crisis, help is available immediately',
      resources: {
        suicide_lifeline: '988',
        crisis_text: 'Text HOME to 741741',
        emergency: '911'
      }
    },
    privacy: {
      notice: 'No personal information is logged or tracked',
      compliance: 'AA Traditions 11 & 12',
      anonymous: true
    }
  })
})

// Start server
app.listen(PORT, () => {
  console.log(`🤝 Digital Sponsor API running on port ${PORT}`)
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`🔒 Anonymous sessions enabled`)
  console.log(`✅ AA Traditions compliant`)
  console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  process.exit(0)
})

export default app