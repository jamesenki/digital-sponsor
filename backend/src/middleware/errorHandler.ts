import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

/**
 * Error Handler Middleware for Digital Sponsor API
 * 
 * AA Traditions Compliant:
 * - No personal data in error responses
 * - Anonymous error logging
 * - Crisis support always accessible even during errors
 */

interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default to 500 server error
  let statusCode = error.statusCode || 500
  let message = error.message || 'Internal server error'
  
  // Log error (without personal data)
  logger.error('API Error', {
    message: error.message,
    stack: error.stack,
    statusCode,
    method: req.method,
    path: req.path,
    sessionId: req.sessionID ? req.sessionID.substring(0, 8) + '...' : 'anonymous',
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400
    message = 'Invalid request data'
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401
    message = 'Unauthorized access'
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403
    message = 'Forbidden'
  } else if (error.name === 'NotFoundError') {
    statusCode = 404
    message = 'Resource not found'
  } else if (error.name === 'RateLimitError') {
    statusCode = 429
    message = 'Too many requests'
  }
  
  // Production vs development error responses
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  const errorResponse = {
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      // Include stack trace only in development
      ...(isDevelopment && { stack: error.stack })
    },
    
    // Always include crisis support information
    crisis_support: {
      message: 'If you are in crisis, help is available immediately',
      resources: {
        suicide_lifeline: '988',
        crisis_text: 'Text HOME to 741741',
        emergency: '911'
      }
    },
    
    // AA Traditions compliance notice
    privacy: {
      notice: 'No personal information is logged or tracked',
      compliance: 'AA Traditions 11 & 12',
      anonymous: true
    }
  }
  
  // Set appropriate headers
  res.status(statusCode)
  res.set({
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  })
  
  res.json(errorResponse)
}

/**
 * Async error handler wrapper
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Not found: ${req.originalUrl}`) as AppError
  error.statusCode = 404
  next(error)
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  statusCode = 400
  isOperational = true
  
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  isOperational = true
  
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  isOperational = true
  
  constructor(message: string = 'Forbidden') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  isOperational = true
  
  constructor(message: string = 'Not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class RateLimitError extends Error {
  statusCode = 429
  isOperational = true
  
  constructor(message: string = 'Too many requests') {
    super(message)
    this.name = 'RateLimitError'
  }
}