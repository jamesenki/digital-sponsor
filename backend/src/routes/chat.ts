import { Router, Request, Response } from 'express'
import { asyncHandler } from '@/middleware/errorHandler'
import { initializeAnonymousSession } from '@/middleware/session'
import { logger } from '@/utils/logger'

/**
 * Chat Routes for AA Literature Q&A
 * 
 * AA Traditions Compliant:
 * - Tradition 6: No endorsements, only AA-approved literature
 * - Tradition 12: Anonymous conversations
 * - Focus on recovery from alcoholism only
 */

const router = Router()

// Initialize anonymous session
router.use(initializeAnonymousSession)

/**
 * Chat completion endpoint
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { message, context } = req.body
  
  if (!message) {
    return res.status(400).json({
      error: 'Message is required',
      example: {
        message: 'What does the Big Book say about resentments?',
        context: 'step_work'
      }
    })
  }
  
  // Validate message content for AA compliance
  const isAACompliant = validateAACompliance(message)
  if (!isAACompliant.valid) {
    return res.status(400).json({
      error: 'Message violates AA Traditions',
      reason: isAACompliant.reason,
      guidance: 'Please focus on AA literature and recovery topics',
      traditions: {
        tradition_6: 'No outside issues or endorsements',
        tradition_5: 'Recovery from alcoholism focus only'
      }
    })
  }
  
  // Log anonymous chat request
  logger.info('Chat request received', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    messageLength: message.length,
    context: context || 'general',
    anonymous: true
  })
  
  try {
    // TODO: Implement RAG system integration
    // For now, return a placeholder response
    const response = await generateAALiteratureResponse(message, context)
    
    // Record literature access
    if (!req.session.literatureHistory) {
      req.session.literatureHistory = []
    }
    req.session.literatureHistory.push(`chat:${context || 'general'}:${Date.now()}`)
    
    res.json({
      response: {
        message: response.message,
        sources: response.sources,
        context: response.context,
        confidence: response.confidence
      },
      session: {
        id: req.sessionID,
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
    logger.error('Chat processing failed', {
      sessionId: req.sessionID.substring(0, 8) + '...',
      error: error.message
    })
    
    res.status(500).json({
      error: 'Unable to process chat request',
      message: 'Please try again or contact crisis support if needed',
      crisis_support: '988 - Suicide & Crisis Lifeline',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * Get conversation history (anonymous)
 */
router.get('/history', asyncHandler(async (req: Request, res: Response) => {
  // Note: We don't store conversation history for privacy
  // Only access statistics
  
  const accessCount = req.session.literatureHistory?.filter(
    item => item.startsWith('chat:')
  ).length || 0
  
  res.json({
    history: {
      message: 'Conversation history not stored for privacy',
      access_count: accessCount,
      anonymous: true
    },
    privacy: {
      notice: 'No conversation content is stored',
      compliance: 'AA Tradition 12 - Anonymity',
      retention: 'Session only'
    },
    timestamp: new Date().toISOString()
  })
}))

/**
 * Get suggested questions
 */
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const suggestions = [
    {
      category: 'Big Book',
      questions: [
        'What does the Big Book say about resentments?',
        'How does the Big Book describe the spiritual experience?',
        'What are the promises in the Big Book?',
        'How does the Big Book describe powerlessness?'
      ]
    },
    {
      category: 'Twelve Steps',
      questions: [
        'Can you explain Step 4 from the Twelve and Twelve?',
        'What does Step 11 mean in practical terms?',
        'How does the Twelve and Twelve describe making amends?',
        'What is the difference between Step 1 and Step 2?'
      ]
    },
    {
      category: 'Daily Reflections',
      questions: [
        'What does today\'s daily reflection say?',
        'Are there reflections about gratitude?',
        'What reflections discuss sponsorship?',
        'Find reflections about surrender'
      ]
    },
    {
      category: 'AA Traditions',
      questions: [
        'What is Tradition 1 about?',
        'How do the Traditions protect anonymity?',
        'What does Tradition 6 mean for AA groups?',
        'Why is Tradition 7 important?'
      ]
    }
  ]
  
  res.json({
    suggestions,
    note: 'These are example questions about AA literature',
    compliance: 'All suggestions focus on AA-approved materials only',
    timestamp: new Date().toISOString()
  })
}))

/**
 * Validate message content for AA compliance
 */
function validateAACompliance(message: string): { valid: boolean; reason?: string } {
  const lowerMessage = message.toLowerCase()
  
  // Check for outside issues (Tradition 6)
  const outsideIssues = [
    'politics', 'religion', 'drugs', 'narcotics', 'cocaine', 'marijuana',
    'therapy', 'medication', 'doctor', 'treatment center', 'rehab',
    'gambling', 'sex addiction', 'eating disorder', 'smoking'
  ]
  
  for (const issue of outsideIssues) {
    if (lowerMessage.includes(issue)) {
      return {
        valid: false,
        reason: `References outside issues (${issue}). Please focus on AA literature and alcoholism recovery.`
      }
    }
  }
  
  // Check for endorsements
  const endorsementWords = ['recommend', 'endorse', 'advertise', 'sell', 'buy', 'product']
  for (const word of endorsementWords) {
    if (lowerMessage.includes(word)) {
      return {
        valid: false,
        reason: 'AA does not endorse outside enterprises. Please focus on AA literature.'
      }
    }
  }
  
  // Check for personal information requests
  const personalWords = ['name', 'address', 'phone', 'email', 'location', 'where do you live']
  for (const word of personalWords) {
    if (lowerMessage.includes(word)) {
      return {
        valid: false,
        reason: 'Personal information is not shared. Please maintain anonymity.'
      }
    }
  }
  
  return { valid: true }
}

/**
 * Generate AA literature response (placeholder for RAG system)
 */
async function generateAALiteratureResponse(message: string, context?: string) {
  // TODO: Implement RAG system with Chroma and OpenAI
  // This is a placeholder implementation
  
  const responses = {
    resentments: {
      message: 'The Big Book describes resentments as the "dubious luxury of normal men" and explains that resentment is the number one offender, destroying more alcoholics than anything else. On page 64, it states that resentments shut us off from the sunlight of the Spirit.',
      sources: ['Alcoholics Anonymous (Big Book), pages 64-65'],
      context: 'step_4_inventory',
      confidence: 0.95
    },
    default: {
      message: 'I can help you find information from AA literature including the Big Book, Twelve Steps and Twelve Traditions, Daily Reflections, and AA-approved pamphlets. Please ask about specific topics related to recovery from alcoholism.',
      sources: ['General AA Literature'],
      context: 'general',
      confidence: 0.8
    }
  }
  
  // Simple keyword matching (to be replaced with RAG)
  if (message.toLowerCase().includes('resentment')) {
    return responses.resentments
  }
  
  return responses.default
}

export default router