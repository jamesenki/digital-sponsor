import { RAGService } from '../../services/rag-service'
import { Pool } from 'pg'

// Mock the database
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    end: jest.fn()
  }))
}))

describe('RAGService', () => {
  let ragService: RAGService
  let mockPool: jest.Mocked<Pool>

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    
    // Create mocked pool instance
    mockPool = new Pool() as jest.Mocked<Pool>
    
    // Create RAG service instance
    ragService = new RAGService()
    
    // Override the pool with our mock
    ragService['pgPool'] = mockPool
  })

  afterEach(async () => {
    await ragService.close()
  })

  describe('processChat', () => {
    it('should return literature-based response when content is found', async () => {
      // Mock database response with literature content
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: '123',
            source_title: 'Test Literature',
            section_title: 'Test Section',
            content_text: 'This is test content about recovery and community support.',
            page_number: 1,
            chapter_number: 1,
            relevance_score: 0.8,
            copyright_notice: 'Test Copyright'
          }
        ]
      } as any)

      const result = await ragService.processChat('What about community support?')

      expect(result.responseType).toBe('literature_based')
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0].title).toBe('Test Literature - Test Section')
      expect(result.confidence).toBeGreaterThan(0.3)
      expect(result.compliance.aa_traditions).toBe(true)
      expect(result.compliance.fair_use).toBe(true)
    })

    it('should return general guidance when no content is found', async () => {
      // Mock empty database response
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const result = await ragService.processChat('Some random question')

      expect(result.responseType).toBe('general_guidance')
      expect(result.sources).toHaveLength(0)
      expect(result.confidence).toBe(0.2)
      expect(result.response).toContain('didn\'t find specific content')
    })

    it('should detect crisis keywords and return crisis referral', async () => {
      // Mock database response (doesn't matter for crisis detection)
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      const result = await ragService.processChat('I want to kill myself')

      expect(result.responseType).toBe('crisis_referral')
      expect(result.confidence).toBe(1.0)
    })

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const result = await ragService.processChat('test query')

      expect(result.responseType).toBe('crisis_referral')
      expect(result.response).toContain('unable to process')
      expect(result.confidence).toBe(0.1)
    })

    it('should validate input parameters', async () => {
      // Mock database response
      mockPool.query.mockResolvedValueOnce({
        rows: []
      } as any)

      // Test with empty query
      const result = await ragService.processChat('')

      expect(result.responseType).toBe('general_guidance')
      expect(result.confidence).toBe(0.2)
    })
  })

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      // Mock database responses
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ total: '5' }]
        } as any)
        .mockResolvedValueOnce({
          rows: [{ total: '3' }]
        } as any)

      const stats = await ragService.getStats()

      expect(stats.totalContent).toBe(5)
      expect(stats.availableSources).toBe(3)
      expect(typeof stats.aiEnabled).toBe('boolean')
    })

    it('should handle database errors in stats', async () => {
      // Mock database error
      mockPool.query.mockRejectedValueOnce(new Error('Stats query failed'))

      const stats = await ragService.getStats()

      expect(stats.totalContent).toBe(0)
      expect(stats.availableSources).toBe(0)
      expect(stats.aiEnabled).toBe(false)
    })
  })

  describe('private methods', () => {
    it('should build context correctly from search results', () => {
      const searchResults = [
        {
          id: '1',
          sourceTitle: 'Test Source 1',
          sectionTitle: 'Section 1',
          content: 'First piece of content',
          pageNumber: 1,
          chapterNumber: 1,
          relevanceScore: 0.9,
          copyright: 'Copyright 1'
        },
        {
          id: '2', 
          sourceTitle: 'Test Source 2',
          sectionTitle: 'Section 2',
          content: 'Second piece of content',
          pageNumber: 2,
          chapterNumber: 2,
          relevanceScore: 0.7,
          copyright: 'Copyright 2'
        }
      ]

      // Access private method through type assertion
      const context = (ragService as any).buildContext(searchResults)

      expect(context).toContain('Test Source 1')
      expect(context).toContain('Section 1')
      expect(context).toContain('First piece of content')
      expect(context).toContain('p. 1')
    })

    it('should determine response types correctly', () => {
      // Test crisis detection
      const crisisType = (ragService as any).determineResponseType('I want to kill myself', [])
      expect(crisisType).toBe('crisis_referral')

      // Test literature-based response
      const literatureType = (ragService as any).determineResponseType('test query', [{
        relevanceScore: 0.5
      }])
      expect(literatureType).toBe('literature_based')

      // Test general guidance
      const generalType = (ragService as any).determineResponseType('test query', [])
      expect(generalType).toBe('general_guidance')
    })

    it('should calculate confidence scores appropriately', () => {
      // Test with high relevance results
      const highConfidence = (ragService as any).calculateConfidence([
        { relevanceScore: 0.8 },
        { relevanceScore: 0.9 }
      ], 'literature_based')
      expect(highConfidence).toBeGreaterThan(0.5)

      // Test with no results
      const lowConfidence = (ragService as any).calculateConfidence([], 'general_guidance')
      expect(lowConfidence).toBe(0.2)

      // Test crisis referral
      const crisisConfidence = (ragService as any).calculateConfidence([], 'crisis_referral')
      expect(crisisConfidence).toBe(1.0)
    })
  })
})