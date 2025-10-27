import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { Pool } from 'pg'
import { createClient } from 'redis'

// Load environment variables
dotenv.config()

/**
 * Digital Sponsor Backend API with Database Integration
 * 
 * AA Traditions Compliant:
 * - Tradition 12: Anonymous sessions, no user tracking
 * - Tradition 6: No endorsements, filtered responses only
 * - Tradition 11: Privacy-first, no public relations
 */

const app = express()
const PORT = process.env.PORT || 3001

// Database connections
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6380',
  password: 'password'
})

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

// Database connection status
let dbConnected = false
let redisConnected = false

// Initialize database connections
async function initializeDatabases() {
  try {
    // Test PostgreSQL
    const client = await pgPool.connect()
    await client.query('SELECT NOW()')
    client.release()
    dbConnected = true
    console.log('✅ PostgreSQL connected successfully')
    
    // Test Redis
    await redisClient.connect()
    await redisClient.ping()
    redisConnected = true
    console.log('✅ Redis connected successfully')
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Digital Sponsor API',
    version: '0.1.0',
    description: 'AI-powered AA literature companion',
    traditions: 'AA Traditions Compliant',
    privacy: 'Anonymous sessions only',
    status: 'operational',
    databases: {
      postgresql: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected'
    },
    timestamp: new Date().toISOString()
  })
})

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Digital Sponsor API',
    version: '0.1.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    compliance: 'AA Traditions 1-12',
    anonymous: true,
    databases: {
      postgresql: 'unknown',
      redis: 'unknown',
      chroma: 'unknown'
    }
  }
  
  // Test PostgreSQL
  try {
    await pgPool.query('SELECT 1')
    health.databases.postgresql = 'healthy'
  } catch (error) {
    health.databases.postgresql = 'unhealthy'
    health.status = 'degraded'
  }
  
  // Test Redis
  try {
    await redisClient.ping()
    health.databases.redis = 'healthy'
  } catch (error) {
    health.databases.redis = 'unhealthy'
    health.status = 'degraded'
  }
  
  // Test Chroma
  try {
    const response = await fetch('http://localhost:8000/api/v1/heartbeat')
    health.databases.chroma = response.ok ? 'healthy' : 'unhealthy'
  } catch (error) {
    health.databases.chroma = 'unhealthy'
    health.status = 'degraded'
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503
  res.status(statusCode).json(health)
})

// Enhanced session endpoint with database storage
app.post('/api/sessions', async (req, res) => {
  try {
    const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Store session in PostgreSQL
    await pgPool.query(
      'INSERT INTO anonymous_sessions (session_id, expires_at) VALUES ($1, $2)',
      [sessionId, expiresAt]
    )
    
    // Store session in Redis for fast access
    await redisClient.setEx(`session:${sessionId}`, 86400, JSON.stringify({
      sessionId,
      created: new Date().toISOString(),
      anonymous: true
    }))
    
    console.log(`✅ Anonymous session created: ${sessionId}`)
    
    res.status(201).json({
      session: {
        id: sessionId,
        created: new Date().toISOString(),
        expires: expiresAt.toISOString(),
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
    
  } catch (error) {
    console.error('Session creation failed:', error)
    res.status(500).json({
      error: 'Failed to create session',
      message: 'Please try again',
      timestamp: new Date().toISOString()
    })
  }
})

// Get session info
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    // Check Redis first (faster)
    const redisSession = await redisClient.get(`session:${sessionId}`)
    if (redisSession) {
      return res.json({
        session: JSON.parse(redisSession),
        source: 'cache',
        timestamp: new Date().toISOString()
      })
    }
    
    // Fallback to PostgreSQL
    const result = await pgPool.query(
      'SELECT * FROM anonymous_sessions WHERE session_id = $1 AND expires_at > NOW()',
      [sessionId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found or expired',
        timestamp: new Date().toISOString()
      })
    }
    
    const session = result.rows[0]
    res.json({
      session: {
        id: session.session_id,
        created: session.created_at,
        lastAccessed: session.last_accessed_at,
        expires: session.expires_at,
        anonymous: session.anonymous,
        preferences: session.preferences
      },
      source: 'database',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Session retrieval failed:', error)
    res.status(500).json({
      error: 'Failed to retrieve session',
      timestamp: new Date().toISOString()
    })
  }
})

// Literature sources endpoint
app.get('/api/literature/sources', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT id, title, category, author, published_date, aa_approved FROM literature_sources WHERE aa_approved = true ORDER BY category, title'
    )
    
    res.json({
      sources: result.rows,
      total: result.rows.length,
      compliance: 'AA Traditions 6 - Only approved literature',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Literature sources retrieval failed:', error)
    res.status(500).json({
      error: 'Failed to retrieve literature sources',
      timestamp: new Date().toISOString()
    })
  }
})

// Enhanced chat endpoint (still placeholder but with session tracking)
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body
  
  if (!message) {
    return res.status(400).json({
      error: 'Message is required',
      example: {
        message: 'What does the Big Book say about resentments?',
        sessionId: 'optional-session-id'
      }
    })
  }
  
  try {
    // Log chat interaction (anonymously)
    if (sessionId) {
      const sessionHash = require('crypto').createHash('sha256').update(sessionId).digest('hex').substring(0, 16)
      // Could log to analytics table here
      console.log(`Chat interaction: ${sessionHash}`)
    }
    
    // Simple response for now (will be replaced with RAG system)
    const response = {
      message: 'Thank you for your question about AA literature. This is a placeholder response that will be replaced with a comprehensive RAG system providing detailed answers from the Big Book, Twelve Steps and Twelve Traditions, and other AA-approved materials.',
      sources: ['Placeholder - AA Literature Database'],
      context: 'general',
      confidence: 0.5,
      processed_at: new Date().toISOString()
    }
    
    res.json({
      response,
      session: {
        id: sessionId || 'anonymous',
        anonymous: true
      },
      compliance: {
        aa_traditions: true,
        literature_only: true,
        no_endorsements: true
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Chat processing failed:', error)
    res.status(500).json({
      error: 'Chat processing failed',
      message: 'Please try again',
      timestamp: new Date().toISOString()
    })
  }
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

// Enhanced literature search (with database)
app.get('/api/literature/search', async (req, res) => {
  const { query, category } = req.query
  
  if (!query) {
    return res.status(400).json({
      error: 'Search query is required',
      example: '/api/literature/search?query=resentments&category=big_book'
    })
  }
  
  try {
    let whereClause = 'WHERE s.aa_approved = true'
    const params = [`%${query}%`]
    
    if (category && category !== 'all') {
      whereClause += ' AND s.category = $2'
      params.push(category as string)
    }
    
    const searchQuery = `
      SELECT 
        c.id,
        s.title as source_title,
        c.section_title,
        c.content_text,
        c.page_number,
        c.chapter_number,
        s.category,
        s.author
      FROM literature_content c
      JOIN literature_sources s ON c.source_id = s.id
      ${whereClause}
      AND (c.content_text ILIKE $1 OR c.section_title ILIKE $1)
      ORDER BY s.category, c.page_number, c.chapter_number
      LIMIT 10
    `
    
    const result = await pgPool.query(searchQuery, params)
    
    const results = result.rows.map(row => ({
      id: row.id,
      title: `${row.section_title} - ${row.source_title}`,
      excerpt: row.content_text.substring(0, 200) + (row.content_text.length > 200 ? '...' : ''),
      source: `${row.source_title}, Page ${row.page_number || 'N/A'}`,
      page: row.page_number,
      category: row.category,
      author: row.author,
      relevance_score: 0.8 // Placeholder
    }))
    
    res.json({
      results,
      search: {
        query: query,
        category: category || 'all',
        total_results: results.length
      },
      compliance: {
        aa_approved: true,
        copyright_compliant: true,
        excerpts_only: true
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Literature search failed:', error)
    res.status(500).json({
      error: 'Search temporarily unavailable',
      message: 'Please try again later',
      timestamp: new Date().toISOString()
    })
  }
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
      'GET /api/sessions/:sessionId',
      'POST /api/chat',
      'GET /api/literature/sources',
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

// Start server and initialize databases
async function startServer() {
  try {
    await initializeDatabases()
    
    app.listen(PORT, () => {
      console.log(`🤝 Digital Sponsor API running on port ${PORT}`)
      console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`🔒 Anonymous sessions enabled`)
      console.log(`✅ AA Traditions compliant`)
      console.log(`💾 Database integration: ${dbConnected ? 'active' : 'inactive'}`)
      console.log(`🔄 Redis caching: ${redisConnected ? 'active' : 'inactive'}`)
      console.log(`🌐 CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`)
    })
    
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully')
  
  try {
    await pgPool.end()
    await redisClient.disconnect()
    console.log('Database connections closed')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
})

startServer()

export default app