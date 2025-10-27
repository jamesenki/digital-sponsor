import { Router, Request, Response } from 'express'
import { asyncHandler } from '@/middleware/errorHandler'
import { getSessionInfo, destroySession, initializeAnonymousSession } from '@/middleware/session'
import { logger } from '@/utils/logger'

/**
 * Anonymous Session Management Routes
 * 
 * AA Tradition 12 Compliant:
 * - All sessions are anonymous
 * - No personal data stored or tracked
 * - Temporary session IDs only
 */

const router = Router()

// Initialize anonymous session for all routes
router.use(initializeAnonymousSession)

/**
 * Create new anonymous session
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const sessionInfo = getSessionInfo(req)
  
  logger.info('Anonymous session created', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    anonymous: true,
    compliance: 'AA Tradition 12'
  })
  
  res.status(201).json({
    session: {
      id: sessionInfo.id,
      created: sessionInfo.created,
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
}))

/**
 * Get current session info
 */
router.get('/current', asyncHandler(async (req: Request, res: Response) => {
  const sessionInfo = getSessionInfo(req)
  
  res.json({
    session: {
      id: sessionInfo.id,
      created: sessionInfo.created,
      lastAccessed: sessionInfo.lastAccessed,
      anonymous: true,
      temporary: true
    },
    preferences: req.session.preferences || {
      textSize: 'medium',
      theme: 'light'
    },
    activity: {
      literatureAccessed: req.session.literatureHistory?.length || 0,
      // No specific titles stored for privacy
    },
    compliance: {
      aa_traditions: true,
      anonymity: true,
      no_tracking: true
    },
    timestamp: new Date().toISOString()
  })
}))

/**
 * Update session preferences
 */
router.put('/preferences', asyncHandler(async (req: Request, res: Response) => {
  const { textSize, theme } = req.body
  
  // Validate preferences
  const validTextSizes = ['small', 'medium', 'large']
  const validThemes = ['light', 'dark']
  
  if (textSize && !validTextSizes.includes(textSize)) {
    return res.status(400).json({
      error: 'Invalid text size',
      valid_options: validTextSizes
    })
  }
  
  if (theme && !validThemes.includes(theme)) {
    return res.status(400).json({
      error: 'Invalid theme',
      valid_options: validThemes
    })
  }
  
  // Update preferences
  if (!req.session.preferences) {
    req.session.preferences = { textSize: 'medium', theme: 'light' }
  }
  
  if (textSize) req.session.preferences.textSize = textSize
  if (theme) req.session.preferences.theme = theme
  
  logger.debug('Session preferences updated', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    preferences: req.session.preferences
  })
  
  res.json({
    message: 'Preferences updated successfully',
    preferences: req.session.preferences,
    timestamp: new Date().toISOString()
  })
}))

/**
 * Add literature access to session history
 */
router.post('/literature-access', asyncHandler(async (req: Request, res: Response) => {
  const { resourceType, category } = req.body
  
  if (!resourceType) {
    return res.status(400).json({
      error: 'Resource type is required',
      examples: ['big_book', 'twelve_and_twelve', 'daily_reflections', 'pamphlet']
    })
  }
  
  // Initialize literature history if not exists
  if (!req.session.literatureHistory) {
    req.session.literatureHistory = []
  }
  
  // Add access record (no specific content for privacy)
  const accessRecord = `${resourceType}:${category || 'general'}:${Date.now()}`
  req.session.literatureHistory.push(accessRecord)
  
  // Keep only last 50 access records
  if (req.session.literatureHistory.length > 50) {
    req.session.literatureHistory = req.session.literatureHistory.slice(-50)
  }
  
  logger.info('Literature access recorded', {
    sessionId: req.sessionID.substring(0, 8) + '...',
    resourceType,
    category,
    anonymous: true
  })
  
  res.json({
    message: 'Literature access recorded',
    totalAccessed: req.session.literatureHistory.length,
    privacy: 'Specific content not stored',
    timestamp: new Date().toISOString()
  })
}))

/**
 * Get session statistics (anonymous)
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const sessionInfo = getSessionInfo(req)
  const sessionAgeHours = Math.floor(
    (new Date().getTime() - sessionInfo.created.getTime()) / (1000 * 60 * 60)
  )
  
  res.json({
    session: {
      ageHours: sessionAgeHours,
      literatureAccessed: req.session.literatureHistory?.length || 0,
      preferences: req.session.preferences || {},
      anonymous: true
    },
    system: {
      compliance: 'AA Traditions 1-12',
      privacy: 'No personal data collected',
      retention: 'Session only (24 hours max)'
    },
    timestamp: new Date().toISOString()
  })
}))

/**
 * Destroy session (logout)
 */
router.delete('/current', asyncHandler(async (req: Request, res: Response) => {
  const sessionId = req.sessionID
  
  await destroySession(req)
  
  logger.info('Anonymous session destroyed by user', {
    sessionId: sessionId.substring(0, 8) + '...'
  })
  
  res.json({
    message: 'Session destroyed successfully',
    anonymous: true,
    timestamp: new Date().toISOString()
  })
}))

/**
 * Session keepalive (extend session)
 */
router.post('/keepalive', asyncHandler(async (req: Request, res: Response) => {
  // Update last accessed time
  req.session.lastAccessed = new Date()
  
  res.json({
    message: 'Session extended',
    expiresIn: '24 hours',
    timestamp: new Date().toISOString()
  })
}))

export default router