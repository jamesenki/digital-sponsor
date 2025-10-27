import { Router, Request, Response } from 'express'
import { asyncHandler } from '@/middleware/errorHandler'
import { initializeAnonymousSession } from '@/middleware/session'
import { logger } from '@/utils/logger'

/**
 * Literature Routes for AA-Approved Materials
 * 
 * AA Traditions Compliant:
 * - Tradition 6: Only AA-approved literature
 * - Tradition 12: Anonymous access
 * - Copyright compliant excerpts only
 */

const router = Router()

// Initialize anonymous session
router.use(initializeAnonymousSession)

/**
 * Search AA literature
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const { query, category, limit = 10 } = req.query
  
  if (!query) {
    return res.status(400).json({
      error: 'Search query is required',
      example: '/api/literature/search?query=resentments&category=big_book'
    })
  }
  
  // Validate search parameters
  const validCategories = [
    'big_book', 'twelve_and_twelve', 'daily_reflections', 
    'pamphlets', 'traditions', 'all'
  ]
  
  if (category && !validCategories.includes(category as string)) {
    return res.status(400).json({
      error: 'Invalid category',
      valid_categories: validCategories
    })
  }
  
  logger.info('Literature search', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    query: (query as string).substring(0, 50),
    category: category || 'all',
    anonymous: true
  })
  
  try {
    // TODO: Implement vector search with Chroma
    const results = await searchAALiterature(
      query as string, 
      category as string, 
      parseInt(limit as string)
    )
    
    // Record literature access
    if (!req.session.literatureHistory) {
      req.session.literatureHistory = []
    }
    req.session.literatureHistory.push(
      `search:${category || 'all'}:${Date.now()}`
    )
    
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
    logger.error('Literature search failed', {
      sessionId: req.sessionID.substring(0, 8) + '...',
      error: error.message
    })
    
    res.status(500).json({
      error: 'Search temporarily unavailable',
      message: 'Please try again later',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * Get literature categories
 */
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const categories = [
    {
      id: 'big_book',
      title: 'Alcoholics Anonymous (Big Book)',
      description: 'The basic text of Alcoholics Anonymous',
      chapters: [
        'The Doctor\'s Opinion',
        'Bill\'s Story',
        'There Is a Solution',
        'More About Alcoholism',
        'How It Works',
        'Into Action',
        'Working with Others',
        'To Wives',
        'The Family Afterward',
        'To Employers',
        'A Vision for You'
      ],
      available: true
    },
    {
      id: 'twelve_and_twelve',
      title: 'Twelve Steps and Twelve Traditions',
      description: 'Detailed discussion of the Steps and Traditions',
      sections: ['Twelve Steps', 'Twelve Traditions'],
      available: true
    },
    {
      id: 'daily_reflections',
      title: 'Daily Reflections',
      description: '365 daily meditations for AA members',
      format: 'Daily readings with reflections',
      available: true
    },
    {
      id: 'pamphlets',
      title: 'AA Pamphlets',
      description: 'Various topics in short pamphlet form',
      examples: [
        'Is AA for You?',
        'The Twelve Steps Illustrated',
        'Questions and Answers on Sponsorship',
        'AA for the Woman',
        'Young People and AA'
      ],
      available: true
    },
    {
      id: 'traditions',
      title: 'The Twelve Traditions',
      description: 'Guidelines for AA groups and the fellowship',
      focus: 'Unity and service',
      available: true
    }
  ]
  
  res.json({
    categories,
    note: 'All content is from AA World Services approved literature',
    compliance: 'AA Traditions 6 - No outside literature',
    timestamp: new Date().toISOString()
  })
}))

/**
 * Get specific literature content
 */
router.get('/:category/:section', asyncHandler(async (req: Request, res: Response) => {
  const { category, section } = req.params
  
  logger.info('Literature content requested', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    category,
    section,
    anonymous: true
  })
  
  try {
    const content = await getLiteratureContent(category, section)
    
    if (!content) {
      return res.status(404).json({
        error: 'Content not found',
        message: 'The requested literature section is not available',
        available_categories: ['big_book', 'twelve_and_twelve', 'daily_reflections', 'pamphlets']
      })
    }
    
    // Record access
    if (!req.session.literatureHistory) {
      req.session.literatureHistory = []
    }
    req.session.literatureHistory.push(
      `content:${category}:${section}:${Date.now()}`
    )
    
    res.json({
      content,
      metadata: {
        category,
        section,
        copyright: 'AA World Services, Inc.',
        usage: 'Fair use excerpts for recovery purposes',
        full_text: 'Available from AA World Services'
      },
      compliance: {
        aa_approved: true,
        copyright_compliant: true,
        tradition_6: true
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Literature content retrieval failed', {
      sessionId: req.sessionID.substring(0, 8) + '...',
      category,
      section,
      error: error.message
    })
    
    res.status(500).json({
      error: 'Content temporarily unavailable',
      message: 'Please try again later',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * Get daily reflection
 */
router.get('/daily', asyncHandler(async (req: Request, res: Response) => {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24))
  
  try {
    const reflection = await getDailyReflection(dayOfYear)
    
    // Record access
    if (!req.session.literatureHistory) {
      req.session.literatureHistory = []
    }
    req.session.literatureHistory.push(`daily:${dayOfYear}:${Date.now()}`)
    
    res.json({
      reflection,
      date: today.toISOString().split('T')[0],
      day_of_year: dayOfYear,
      source: 'Daily Reflections - AA World Services',
      compliance: 'AA Traditions compliant',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error('Daily reflection retrieval failed', {
      sessionId: req.sessionID.substring(0, 8) + '...',
      error: error.message
    })
    
    res.status(500).json({
      error: 'Daily reflection temporarily unavailable',
      fallback: 'Please visit aa.org for daily reflections',
      timestamp: new Date().toISOString()
    })
  }
}))

/**
 * Search AA literature (placeholder implementation)
 */
async function searchAALiterature(query: string, category: string, limit: number) {
  // TODO: Implement vector search with Chroma
  // This is a placeholder implementation
  
  const sampleResults = [
    {
      id: 'bb_page_64',
      title: 'Resentments - Big Book Page 64',
      excerpt: 'Resentment is the "number one" offender. It destroys more alcoholics than anything else.',
      source: 'Alcoholics Anonymous, Chapter 5: How It Works',
      page: 64,
      category: 'big_book',
      relevance_score: 0.95
    },
    {
      id: 'tt_step_4',
      title: 'Step 4 - Twelve Steps and Twelve Traditions',
      excerpt: 'Made a searching and fearless moral inventory of ourselves.',
      source: 'Twelve Steps and Twelve Traditions, Step Four',
      page: 42,
      category: 'twelve_and_twelve',
      relevance_score: 0.88
    }
  ]
  
  // Filter by category if specified
  if (category && category !== 'all') {
    return sampleResults.filter(result => result.category === category).slice(0, limit)
  }
  
  return sampleResults.slice(0, limit)
}

/**
 * Get literature content (placeholder implementation)
 */
async function getLiteratureContent(category: string, section: string) {
  // TODO: Implement content retrieval from database
  // This is a placeholder implementation
  
  const content = {
    big_book: {
      how_it_works: {
        title: 'How It Works',
        text: 'Rarely have we seen a person fail who has thoroughly followed our path...',
        page: 58,
        chapter: 5
      }
    },
    twelve_and_twelve: {
      step_1: {
        title: 'Step One',
        text: 'We admitted we were powerless over alcohol—that our lives had become unmanageable.',
        page: 21
      }
    }
  }
  
  return content[category]?.[section] || null
}

/**
 * Get daily reflection (placeholder implementation)
 */
async function getDailyReflection(dayOfYear: number) {
  // TODO: Implement daily reflection retrieval
  // This is a placeholder implementation
  
  return {
    title: 'Daily Reflection',
    date_range: 'Sample reflection',
    reflection: 'Today I will focus on gratitude and service to others in recovery.',
    meditation: 'Grant me the serenity to accept the things I cannot change...',
    source: 'Daily Reflections, AA World Services'
  }
}

export default router