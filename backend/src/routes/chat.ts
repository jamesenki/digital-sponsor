import { Router, Request, Response } from 'express'
import { RAGService } from '../services/rag-service'

/**
 * Chat Routes with RAG Integration
 * 
 * AI-powered responses using AA literature
 * AA Traditions Compliant - Anonymous and Educational
 */

const router = Router()

// Simple async handler
const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

// Initialize RAG service
const ragService = new RAGService()

/**
 * Process chat message with RAG
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
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
}))

/**
 * Get chat service status
 */
router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = await ragService.getStats()
    
    res.json({
      service: 'Digital Sponsor Chat',
      status: 'operational',
      capabilities: {
        literature_search: true,
        ai_responses: stats.aiEnabled,
        crisis_detection: true,
        citation_generation: true
      },
      statistics: {
        total_literature_chunks: stats.totalContent,
        available_sources: stats.availableSources,
        ai_model: stats.aiEnabled ? 'gpt-3.5-turbo' : 'fallback_only'
      },
      compliance: {
        aa_traditions: 'All 12 traditions observed',
        anonymity: 'No personal data collected',
        literature_only: 'Responses based on AA-approved materials',
        fair_use: 'Educational purpose with attribution'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Status check failed:', error)
    res.status(500).json({
      service: 'Digital Sponsor Chat',
      status: 'degraded',
      error: 'Unable to retrieve service status',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * Chat suggestions based on available literature
 */
router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get available content categories
    const stats = await ragService.getStats()
    
    const suggestions = [
      {
        category: 'Steps',
        examples: [
          'What does the Big Book say about Step 1?',
          'How do I work Step 4?',
          'Tell me about the Twelve Steps'
        ]
      },
      {
        category: 'Recovery Concepts',
        examples: [
          'What is a resentment?',
          'How do I find a sponsor?',
          'What are the promises?'
        ]
      },
      {
        category: 'Daily Practice',
        examples: [
          'How do I stay sober today?',
          'What about prayer and meditation?',
          'How do I help other people?'
        ]
      },
      {
        category: 'Challenges',
        examples: [
          'What if I want to drink?',
          'How do I handle difficult emotions?',
          'What about fear and anxiety?'
        ]
      }
    ]
    
    res.json({
      suggestions,
      available_content: {
        total_chunks: stats.totalContent,
        sources: stats.availableSources
      },
      notice: 'These suggestions are based on available AA literature. Responses are educational and should not replace professional help or sponsor guidance.',
      compliance: {
        aa_traditions: true,
        educational_purpose: true
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Suggestions retrieval failed:', error)
    res.status(500).json({
      error: 'Unable to retrieve suggestions',
      fallback_suggestion: 'Try asking about topics from the Big Book or Twelve Steps and Twelve Traditions',
      timestamp: new Date().toISOString()
    })
  }
}))

export default router