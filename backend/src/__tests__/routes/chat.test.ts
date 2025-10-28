import request from 'supertest'
import express from 'express'
import chatRoutes from '../../routes/chat'
import { Pool } from 'pg'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/chat', chatRoutes)

// Mock the database
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn()
  }))
}))

describe('Chat Routes', () => {
  let mockPool: jest.Mocked<Pool>

  beforeEach(() => {
    jest.clearAllMocks()
    mockPool = new Pool() as jest.Mocked<Pool>
  })

  describe('POST /api/chat', () => {
    it('should return 400 for missing message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Message is required')
      expect(response.body.compliance.aa_traditions).toBe(true)
    })

    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: '' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Message is required')
    })

    it('should return 400 for message too long', async () => {
      const longMessage = 'a'.repeat(501)
      
      const response = await request(app)
        .post('/api/chat')
        .send({ message: longMessage })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Message too long')
      expect(response.body.current_length).toBe(501)
      expect(response.body.max_length).toBe(500)
    })

    it('should process valid chat message successfully', async () => {
      // Mock successful database response
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Test Literature',
            section_title: 'Test Section',
            content_text: 'This is test content about recovery.',
            page_number: 1,
            chapter_number: 1,
            relevance_score: 0.8,
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Tell me about recovery',
          sessionId: 'test-session'
        })

      expect(response.status).toBe(200)
      expect(response.body.response).toBeDefined()
      expect(response.body.response.type).toBeDefined()
      expect(response.body.response.confidence).toBeDefined()
      expect(response.body.response.sources).toBeDefined()
      expect(response.body.session.id).toBe('test-session')
      expect(response.body.session.anonymous).toBe(true)
      expect(response.body.compliance.aa_traditions).toBe(true)
      expect(response.body.compliance.fair_use).toBe(true)
      expect(response.body.compliance.educational_purpose).toBe(true)
    })

    it('should return 202 for crisis-related messages', async () => {
      // Mock database response (doesn't matter for crisis detection)
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'I want to hurt myself' })

      expect(response.status).toBe(202)
      expect(response.body.response.type).toBe('crisis_referral')
      expect(response.body.crisis_support).toBeDefined()
      expect(response.body.crisis_support.immediate_help.suicide_lifeline).toBe('988')
      expect(response.body.crisis_support.immediate_help.crisis_text).toBe('Text HOME to 741741')
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'test message' })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Chat processing failed')
      expect(response.body.fallback).toBeDefined()
      expect(response.body.fallback.crisis_support.suicide_lifeline).toBe('988')
    })

    it('should include processing time in response', async () => {
      // Mock successful database response
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'test message' })

      expect(response.status).toBe(200)
      expect(response.body.response.processing_time_ms).toBeDefined()
      expect(typeof response.body.response.processing_time_ms).toBe('number')
      expect(response.body.response.processing_time_ms).toBeGreaterThan(0)
    })
  })

  describe('GET /api/chat/status', () => {
    it('should return service status', async () => {
      // Mock database responses for stats
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '10' }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '5' }]
        } as any)

      const response = await request(app)
        .get('/api/chat/status')

      expect(response.status).toBe(200)
      expect(response.body.service).toBe('Digital Sponsor Chat')
      expect(response.body.status).toBe('operational')
      expect(response.body.capabilities).toBeDefined()
      expect(response.body.capabilities.literature_search).toBe(true)
      expect(response.body.capabilities.crisis_detection).toBe(true)
      expect(response.body.statistics).toBeDefined()
      expect(response.body.statistics.total_literature_chunks).toBe(10)
      expect(response.body.statistics.available_sources).toBe(5)
      expect(response.body.compliance).toBeDefined()
      expect(response.body.compliance.aa_traditions).toBe('All 12 traditions observed')
    })

    it('should handle database errors in status check', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/chat/status')

      expect(response.status).toBe(500)
      expect(response.body.service).toBe('Digital Sponsor Chat')
      expect(response.body.status).toBe('degraded')
      expect(response.body.error).toBeDefined()
    })
  })

  describe('GET /api/chat/suggestions', () => {
    it('should return chat suggestions', async () => {
      // Mock database responses for stats
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '15' }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '7' }]
        } as any)

      const response = await request(app)
        .get('/api/chat/suggestions')

      expect(response.status).toBe(200)
      expect(response.body.suggestions).toBeDefined()
      expect(Array.isArray(response.body.suggestions)).toBe(true)
      expect(response.body.suggestions.length).toBeGreaterThan(0)
      
      // Check suggestion structure
      const firstSuggestion = response.body.suggestions[0]
      expect(firstSuggestion.category).toBeDefined()
      expect(firstSuggestion.examples).toBeDefined()
      expect(Array.isArray(firstSuggestion.examples)).toBe(true)
      
      expect(response.body.available_content).toBeDefined()
      expect(response.body.available_content.total_chunks).toBe(15)
      expect(response.body.available_content.sources).toBe(7)
      expect(response.body.compliance.aa_traditions).toBe(true)
      expect(response.body.notice).toContain('educational')
    })

    it('should handle database errors in suggestions', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/chat/suggestions')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Unable to retrieve suggestions')
      expect(response.body.fallback_suggestion).toBeDefined()
    })
  })

  describe('AA Traditions Compliance', () => {
    it('should ensure all responses maintain anonymity', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'test message' })

      expect(response.body.session.anonymous).toBe(true)
      expect(response.body.compliance.aa_traditions).toBe(true)
    })

    it('should include proper attribution in literature-based responses', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Test Literature',
            section_title: 'Test Section',
            content_text: 'Test content',
            page_number: 1,
            chapter_number: 1,
            relevance_score: 0.8,
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'test message' })

      expect(response.body.compliance.attribution_included).toBe(true)
      expect(response.body.compliance.literature_based).toBe(true)
      expect(response.body.response.sources[0].copyright).toBeDefined()
    })
  })
})