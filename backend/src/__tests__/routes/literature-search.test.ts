import request from 'supertest'
import express from 'express'
import literatureSearchRoutes from '../../routes/literature-search'
import { Pool } from 'pg'

// Create test app
const app = express()
app.use(express.json())
app.use('/api/literature', literatureSearchRoutes)

// Mock the database
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn()
  }))
}))

describe('Literature Search Routes', () => {
  let mockPool: jest.Mocked<Pool>

  beforeEach(() => {
    jest.clearAllMocks()
    mockPool = new Pool() as jest.Mocked<Pool>
  })

  describe('POST /api/literature/search', () => {
    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/literature/search')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Search query is required')
      expect(response.body.message).toBe('Please provide a non-empty search query')
    })

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/literature/search')
        .send({ query: '' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Search query is required')
    })

    it('should return search results successfully', async () => {
      // Mock successful database response
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Test Literature',
            section_title: 'Test Section',
            content_text: 'This is test content about recovery and growth.',
            page_number: 1,
            chapter_number: 1,
            relevance_score: 0.85,
            copyright_notice: 'Copyright © Test Publisher'
          },
          {
            id: '456',
            source_title: 'Another Source',
            section_title: 'Another Section',
            content_text: 'More test content about personal development.',
            page_number: 2,
            chapter_number: 2,
            relevance_score: 0.75,
            copyright_notice: 'Copyright © Another Publisher'
          }
        ]
      } as any)

      const response = await request(app)
        .post('/api/literature/search')
        .send({ 
          query: 'recovery growth',
          limit: 5
        })

      expect(response.status).toBe(200)
      expect(response.body.query).toBe('recovery growth')
      expect(response.body.totalResults).toBe(2)
      expect(response.body.results).toHaveLength(2)
      
      // Check first result structure
      const firstResult = response.body.results[0]
      expect(firstResult.id).toBe('123')
      expect(firstResult.sourceTitle).toBe('Test Literature')
      expect(firstResult.sectionTitle).toBe('Test Section')
      expect(firstResult.content).toBe('This is test content about recovery and growth.')
      expect(firstResult.pageNumber).toBe(1)
      expect(firstResult.relevanceScore).toBe(0.85)
      expect(firstResult.copyright).toBe('Copyright © Test Publisher')
      
      // Check compliance
      expect(response.body.compliance.aa_traditions).toBe(true)
      expect(response.body.compliance.anonymous_access).toBe(true)
      expect(response.body.compliance.fair_use).toBe(true)
      expect(response.body.compliance.attribution_required).toBe(true)
    })

    it('should filter by category when provided', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Big Book',
            section_title: 'Chapter 1',
            content_text: 'Test content',
            page_number: 1,
            chapter_number: 1,
            relevance_score: 0.8,
            copyright_notice: 'Copyright Notice'
          }
        ]
      } as any)

      const response = await request(app)
        .post('/api/literature/search')
        .send({ 
          query: 'test',
          category: 'big_book',
          limit: 10
        })

      expect(response.status).toBe(200)
      expect(response.body.results).toHaveLength(1)
      
      // Verify the database query was called with category filter
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.category = $2'),
        ['test', 'big_book', 10]
      )
    })

    it('should limit results correctly', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: new Array(3).fill(null).map((_, i) => ({
          id: `id-${i}`,
          source_title: `Source ${i}`,
          section_title: `Section ${i}`,
          content_text: `Content ${i}`,
          page_number: i + 1,
          chapter_number: 1,
          relevance_score: 0.5,
          copyright_notice: 'Copyright'
        }))
      } as any)

      const response = await request(app)
        .post('/api/literature/search')
        .send({ 
          query: 'test',
          limit: 2
        })

      expect(response.status).toBe(200)
      expect(response.body.results).toHaveLength(3) // Mock returns 3, but query should limit to 2
      
      // Verify limit was passed to database query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['test', 2]
      )
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const response = await request(app)
        .post('/api/literature/search')
        .send({ query: 'test query' })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Search failed')
      expect(response.body.message).toBe('Unable to complete literature search')
    })

    it('should return empty results when no matches found', async () => {
      // Mock empty database response
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .post('/api/literature/search')
        .send({ query: 'nonexistent content' })

      expect(response.status).toBe(200)
      expect(response.body.totalResults).toBe(0)
      expect(response.body.results).toHaveLength(0)
      expect(response.body.compliance).toBeDefined()
    })
  })

  describe('GET /api/literature/sources', () => {
    it('should return literature sources successfully', async () => {
      // Mock successful database response
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            title: 'Alcoholics Anonymous (Big Book)',
            category: 'big_book',
            author: 'Bill W. and AA Members',
            published_date: '2001-01-01',
            copyright_notice: 'Copyright © AA World Services, Inc.',
            content_chunks: 15
          },
          {
            id: '456',
            title: 'Twelve Steps and Twelve Traditions',
            category: 'twelve_and_twelve',
            author: 'Bill W.',
            published_date: '1953-04-01',
            copyright_notice: 'Copyright © AA World Services, Inc.',
            content_chunks: 8
          }
        ]
      } as any)

      const response = await request(app)
        .get('/api/literature/sources')

      expect(response.status).toBe(200)
      expect(response.body.totalSources).toBe(2)
      expect(response.body.sources).toHaveLength(2)
      
      // Check first source structure
      const firstSource = response.body.sources[0]
      expect(firstSource.id).toBe('123')
      expect(firstSource.title).toBe('Alcoholics Anonymous (Big Book)')
      expect(firstSource.category).toBe('big_book')
      expect(firstSource.author).toBe('Bill W. and AA Members')
      expect(firstSource.contentChunks).toBe(15)
      expect(firstSource.available).toBe(true) // Should be true since contentChunks > 0
      
      // Check compliance
      expect(response.body.compliance.aa_approved_only).toBe(true)
      expect(response.body.compliance.fair_use_attribution).toBe(true)
      expect(response.body.compliance.anonymous_access).toBe(true)
    })

    it('should mark sources as unavailable when no content chunks', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '789',
            title: 'Empty Source',
            category: 'test',
            author: 'Test Author',
            published_date: '2023-01-01',
            copyright_notice: 'Test Copyright',
            content_chunks: 0
          }
        ]
      } as any)

      const response = await request(app)
        .get('/api/literature/sources')

      expect(response.status).toBe(200)
      expect(response.body.sources[0].available).toBe(false)
      expect(response.body.sources[0].contentChunks).toBe(0)
    })

    it('should handle database errors in sources endpoint', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database error'))

      const response = await request(app)
        .get('/api/literature/sources')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Catalog unavailable')
      expect(response.body.message).toBe('Unable to retrieve literature sources')
    })
  })

  describe('GET /api/literature/source/:sourceId', () => {
    it('should return source content successfully', async () => {
      // Mock source lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            title: 'Test Source',
            category: 'test',
            author: 'Test Author',
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      // Mock content lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '456',
            section_title: 'Test Section',
            content_text: 'Test content',
            page_number: 1,
            chapter_number: 1,
            word_count: 10
          }
        ]
      } as any)

      const response = await request(app)
        .get('/api/literature/source/123')

      expect(response.status).toBe(200)
      expect(response.body.source.id).toBe('123')
      expect(response.body.source.title).toBe('Test Source')
      expect(response.body.content.totalChunks).toBe(1)
      expect(response.body.content.chunks).toHaveLength(1)
      expect(response.body.attribution).toContain('Test Source')
      expect(response.body.fairUse).toBe(true)
    })

    it('should return 404 for non-existent source', async () => {
      // Mock empty source lookup
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .get('/api/literature/source/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Source not found')
      expect(response.body.message).toBe('Literature source not found or not approved')
    })

    it('should handle pagination parameters', async () => {
      // Mock source lookup
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            title: 'Test Source',
            category: 'test',
            author: 'Test Author',
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      // Mock content lookup with pagination
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const response = await request(app)
        .get('/api/literature/source/123?limit=5&offset=10')

      expect(response.status).toBe(200)
      
      // Verify pagination was passed to database query
      expect(mockPool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        ['123', 5, 10]
      )
    })
  })

  describe('POST /api/literature/advanced-search', () => {
    it('should perform advanced search with filters', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Test Source',
            category: 'big_book',
            author: 'Test Author',
            section_title: 'Test Section',
            content_text: 'Test content',
            page_number: 5,
            chapter_number: 1,
            relevance_score: 0.8,
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      const response = await request(app)
        .post('/api/literature/advanced-search')
        .send({
          query: 'test',
          categories: ['big_book'],
          authors: ['Test Author'],
          pageRange: { min: 1, max: 10 },
          limit: 5
        })

      expect(response.status).toBe(200)
      expect(response.body.query).toBe('test')
      expect(response.body.filters.categories).toEqual(['big_book'])
      expect(response.body.filters.authors).toEqual(['Test Author'])
      expect(response.body.results).toHaveLength(1)
      
      // Verify filters were applied in database query
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND s.category = ANY($2)'),
        expect.arrayContaining(['test', ['big_book'], ['Test Author'], 1, 10, 5])
      )
    })

    it('should return 400 for missing query in advanced search', async () => {
      const response = await request(app)
        .post('/api/literature/advanced-search')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Search query is required')
    })
  })
})