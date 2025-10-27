import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

/**
 * AA Traditions Compliance Middleware
 * 
 * Enforces the 12 Traditions of Alcoholics Anonymous:
 * - Tradition 11: No public relations, maintain anonymity
 * - Tradition 12: Anonymity is the spiritual foundation
 * - Tradition 6: No endorsements or outside issues
 * - Tradition 7: Self-supporting (no commercial interests)
 */

export interface AAComplianceRequest extends Request {
  aaCompliance?: {
    anonymous: boolean
    traditionsCompliant: boolean
    sessionType: 'anonymous' | 'temporary'
  }
}

export const aaComplianceMiddleware = (
  req: AAComplianceRequest,
  res: Response,
  next: NextFunction
) => {
  // Set AA compliance headers
  res.set({
    'X-AA-Traditions': 'Compliant',
    'X-Privacy-Mode': 'Anonymous',
    'X-Data-Collection': 'None',
    'X-User-Tracking': 'Disabled'
  })
  
  // Attach compliance metadata to request
  req.aaCompliance = {
    anonymous: true,
    traditionsCompliant: true,
    sessionType: 'anonymous'
  }
  
  // Block any requests that might violate traditions
  const violatesAnonymity = checkAnonymityViolation(req)
  const violatesNonEndorsement = checkEndorsementViolation(req)
  const violatesPrivacy = checkPrivacyViolation(req)
  
  if (violatesAnonymity || violatesNonEndorsement || violatesPrivacy) {
    logger.warn('AA Traditions violation blocked', {
      sessionId: req.sessionID?.substring(0, 8) + '...',
      violation: {
        anonymity: violatesAnonymity,
        endorsement: violatesNonEndorsement,
        privacy: violatesPrivacy
      },
      path: req.path,
      method: req.method
    })
    
    return res.status(403).json({
      error: 'Request violates AA Traditions',
      traditions: {
        anonymity: 'Personal information not permitted',
        endorsement: 'No endorsements or outside issues',
        privacy: 'Anonymous sessions only'
      },
      guidance: 'Digital Sponsor maintains strict adherence to AA Traditions',
      crisis_support: '988 - Suicide & Crisis Lifeline'
    })
  }
  
  next()
}

/**
 * Check if request violates Tradition 12 (Anonymity)
 */
function checkAnonymityViolation(req: Request): boolean {
  const body = req.body || {}
  const query = req.query || {}
  
  // Block personal identifiers
  const personalFields = [
    'name', 'fullName', 'firstName', 'lastName',
    'email', 'phone', 'address', 'location',
    'ssn', 'userId', 'username', 'realName'
  ]
  
  const hasPersonalInfo = personalFields.some(field => 
    body[field] || query[field]
  )
  
  // Block attempts to share personal stories with identifiers
  if (body.story && (body.name || body.location)) {
    return true
  }
  
  return hasPersonalInfo
}

/**
 * Check if request violates Tradition 6 (Non-endorsement)
 */
function checkEndorsementViolation(req: Request): boolean {
  const body = req.body || {}
  const query = req.query || {}
  
  // Block endorsements of outside enterprises
  const endorsementKeywords = [
    'endorses', 'recommends', 'sponsors', 'partners',
    'affiliate', 'advertise', 'promote', 'sell'
  ]
  
  const content = JSON.stringify({ ...body, ...query }).toLowerCase()
  
  return endorsementKeywords.some(keyword => 
    content.includes(keyword)
  )
}

/**
 * Check if request violates privacy principles
 */
function checkPrivacyViolation(req: Request): boolean {
  const body = req.body || {}
  
  // Block attempts to track users across sessions
  if (body.trackingId || body.persistentId || body.deviceId) {
    return true
  }
  
  // Block attempts to correlate sessions
  if (body.previousSession || body.linkedSession) {
    return true
  }
  
  return false
}

/**
 * Sanitize response data for AA compliance
 */
export const sanitizeResponse = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data
  }
  
  const sanitized = { ...data }
  
  // Remove personal identifiers
  delete sanitized.name
  delete sanitized.email
  delete sanitized.phone
  delete sanitized.address
  delete sanitized.location
  delete sanitized.userId
  delete sanitized.username
  
  // Sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeResponse(sanitized[key])
    }
  })
  
  return sanitized
}

/**
 * Filter literature content for AA compliance
 */
export const filterLiteratureContent = (content: string): string => {
  // This would implement content filtering to ensure
  // only AA-approved literature is served
  
  // Block non-AA content
  const nonAAKeywords = [
    'narcotics anonymous', 'cocaine anonymous', 'marijuana anonymous',
    'overeaters anonymous', 'gamblers anonymous', 'sex addicts anonymous'
  ]
  
  const lowerContent = content.toLowerCase()
  const hasNonAAContent = nonAAKeywords.some(keyword => 
    lowerContent.includes(keyword)
  )
  
  if (hasNonAAContent) {
    return 'Content not available - AA literature only per Tradition 6'
  }
  
  return content
}

/**
 * Middleware to add traditions reminder to responses
 */
export const addTraditionsReminder = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json
  
  res.json = function(data: any) {
    const enhancedData = {
      ...data,
      aa_traditions: {
        anonymity: 'Your privacy is protected',
        service: 'No fees or charges',
        compliance: 'AA Traditions 1-12',
        notice: 'Digital Sponsor is not affiliated with AA World Services'
      }
    }
    
    return originalJson.call(this, enhancedData)
  }
  
  next()
}