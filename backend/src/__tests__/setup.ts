import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

// Set test environment
process.env.NODE_ENV = 'test'

// Increase timeout for database operations
jest.setTimeout(30000)

// Mock OpenAI API for tests
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: 'Mock AI response for testing purposes.'
                }
              }
            ]
          })
        }
      },
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [
            {
              embedding: new Array(1536).fill(0).map(() => Math.random())
            }
          ]
        })
      }
    }))
  }
})

// Global test utilities
global.testUtils = {
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Helper to create test session
  createTestSession: () => ({
    id: `test_session_${Date.now()}`,
    created: new Date().toISOString(),
    anonymous: true
  }),
  
  // Helper to create test literature content
  createTestLiterature: () => ({
    title: 'Test Literature Source',
    content: 'This is test content for literature search and RAG testing.',
    author: 'Test Author',
    category: 'test',
    pageNumber: 1,
    chapterNumber: 1
  })
}

// Declare global types
declare global {
  var testUtils: {
    delay: (ms: number) => Promise<void>
    createTestSession: () => { id: string; created: string; anonymous: boolean }
    createTestLiterature: () => {
      title: string
      content: string
      author: string
      category: string
      pageNumber: number
      chapterNumber: number
    }
  }
}