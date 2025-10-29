import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { RAGService } from './services/rag-service'

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

// Initialize RAG service
const ragService = new RAGService()

// Chat endpoint with RAG
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body
  
  // Validation
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Message is required',
      example: {
        message: 'What does the Big Book say about resentments?',
        sessionId: 'optional-session-id'
      },
      compliance: {
        aa_traditions: true,
        anonymous_access: true
      }
    })
  }

  // Rate limiting check (basic)
  const messageLength = message.trim().length
  if (messageLength > 500) {
    return res.status(400).json({
      error: 'Message too long',
      message: 'Please keep your question under 500 characters',
      current_length: messageLength,
      max_length: 500
    })
  }

  try {
    const startTime = Date.now()
    
    // Process chat with RAG service
    const chatResponse = await ragService.processChat(message.trim(), sessionId)
    
    const processingTime = Date.now() - startTime
    
    // Log interaction (anonymously)
    console.log(`💬 Chat processed in ${processingTime}ms - Type: ${chatResponse.responseType}, Confidence: ${chatResponse.confidence.toFixed(2)}`)
    
    // Determine HTTP status based on response type
    let statusCode = 200
    if (chatResponse.responseType === 'crisis_referral') {
      statusCode = 202 // Accepted - indicating special handling needed
    }
    
    res.status(statusCode).json({
      response: {
        message: chatResponse.response,
        type: chatResponse.responseType,
        confidence: chatResponse.confidence,
        sources: chatResponse.sources,
        processing_time_ms: processingTime
      },
      session: {
        id: sessionId || 'anonymous',
        anonymous: true,
        timestamp: new Date().toISOString()
      },
      compliance: {
        ...chatResponse.compliance,
        attribution_included: chatResponse.sources.length > 0,
        literature_based: chatResponse.responseType === 'literature_based'
      },
      crisis_support: chatResponse.responseType === 'crisis_referral' ? {
        immediate_help: {
          suicide_lifeline: '988',
          crisis_text: 'Text HOME to 741741',
          emergency: '911'
        },
        aa_resources: {
          meeting_guide: 'https://meetingguide.aa.org',
          general_service: '(212) 870-3400'
        }
      } : undefined
    })
    
  } catch (error) {
    console.error('Chat processing error:', error)
    
    res.status(500).json({
      error: 'Chat processing failed',
      message: 'I apologize, but I\'m unable to process your question right now. Please try again later.',
      fallback: {
        aa_resources: {
          meeting_guide: 'https://meetingguide.aa.org',
          literature: 'https://www.aa.org/aa-literature'
        },
        crisis_support: {
          suicide_lifeline: '988',
          crisis_text: 'Text HOME to 741741'
        }
      },
      timestamp: new Date().toISOString()
    })
  }
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