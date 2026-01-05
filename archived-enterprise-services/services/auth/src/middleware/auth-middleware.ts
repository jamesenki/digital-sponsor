/**
 * Authentication Middleware
 * Provides JWT token validation and session management for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import { jwtService, TokenPayload } from '../services/jwt-service';
import { sessionManager, SessionData } from '../services/session-manager';
import { authLogger } from '../services/logger';
import { AuthenticationError, ErrorUtils } from '@digital-sponsor/shared';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      session?: SessionData;
      requestId?: string;
    }
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean; // If false, allows anonymous access
  allowAnonymous?: boolean; // If true, anonymous mode users can access
  requiredScopes?: string[]; // Required API scopes
  crisisConsentRequired?: boolean; // Requires crisis contact consent
}

/**
 * Main authentication middleware
 */
export function authenticateToken(options: AuthMiddlewareOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      // Handle optional authentication
      if (!options.required && !authHeader) {
        return next();
      }

      // Extract and verify token
      if (!authHeader) {
        throw new AuthenticationError(
          'Authorization header is required',
          'missing_token'
        );
      }

      const token = jwtService.extractTokenFromHeader(authHeader);
      const decoded = await jwtService.verifyAccessToken(token);

      // Get session data
      const sessionData = await sessionManager.getSession(decoded.sessionId);
      if (!sessionData) {
        authLogger.sessionValidation(
          decoded.sessionId,
          false,
          'session_not_found'
        );
        throw new AuthenticationError(
          'Session not found or expired',
          'invalid_session'
        );
      }

      // Apply data retention policy
      const validatedSession =
        await sessionManager.validateSessionWithRetentionPolicy(
          decoded.sessionId
        );
      if (!validatedSession) {
        throw new AuthenticationError(
          'Session expired due to retention policy',
          'session_expired'
        );
      }

      // Update session last accessed time
      await sessionManager.touchSession(decoded.sessionId);

      // Check anonymous mode restrictions
      if (validatedSession.anonymousMode && !options.allowAnonymous) {
        authLogger.aaTraditionalCompliance(11, 'anonymous_access_denied', {
          sessionId: decoded.sessionId.substring(0, 8) + '...',
          endpoint: req.path,
        });
        throw new AuthenticationError(
          'Anonymous access not allowed for this endpoint',
          'anonymous_access_denied'
        );
      }

      // Check crisis consent requirement
      if (
        options.crisisConsentRequired &&
        !validatedSession.crisisContactConsent
      ) {
        authLogger.crisisSupportAccess(decoded.sessionId, false);
        throw new AuthenticationError(
          'Crisis contact consent is required',
          'crisis_consent_required'
        );
      }

      // Check required scopes (if implemented in the future)
      if (options.requiredScopes && options.requiredScopes.length > 0) {
        // Scope checking would be implemented here
        // For now, we'll log the requirement
        authLogger.securityEvent('scope_check_requested', 'low', {
          requiredScopes: options.requiredScopes,
          sessionId: decoded.sessionId.substring(0, 8) + '...',
        });
      }

      // Attach user and session data to request
      req.user = decoded;
      req.session = validatedSession;

      authLogger.sessionValidation(
        decoded.sessionId,
        true,
        'middleware_validation'
      );

      next();
    } catch (error) {
      // Log authentication failure
      authLogger.loginFailure(
        error instanceof AuthenticationError
          ? error.reason
          : 'middleware_error',
        {
          endpoint: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ipAddress: req.ip,
          error: ErrorUtils.getMessage(error),
        }
      );

      if (error instanceof AuthenticationError) {
        return res.status(401).json(error.toJSON());
      } else {
        const authError = new AuthenticationError(
          'Authentication failed',
          'authentication_failed'
        );
        return res.status(401).json(authError.toJSON());
      }
    }
  };
}

/**
 * Middleware for routes that require authentication
 */
export const requireAuth = authenticateToken({ required: true });

/**
 * Middleware for routes that support optional authentication
 */
export const optionalAuth = authenticateToken({ required: false });

/**
 * Middleware for anonymous-friendly routes (AA Tradition 11 compliance)
 */
export const anonymousAuth = authenticateToken({
  required: true,
  allowAnonymous: true,
});

/**
 * Middleware for crisis support routes
 */
export const crisisAuth = authenticateToken({
  required: true,
  allowAnonymous: true,
  crisisConsentRequired: true,
});

/**
 * Middleware for admin routes (future use)
 */
export const adminAuth = authenticateToken({
  required: true,
  allowAnonymous: false,
  requiredScopes: ['admin'],
});

/**
 * Request ID middleware for distributed tracing
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId =
    (req.headers['x-request-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}

/**
 * Refresh token middleware
 */
export async function refreshTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AuthenticationError(
        'Refresh token is required',
        'missing_token'
      );
    }

    const decoded = await jwtService.verifyRefreshToken(refreshToken);

    // Get session to validate it still exists
    const sessionData = await sessionManager.getSession(decoded.sessionId);
    if (!sessionData) {
      authLogger.sessionValidation(
        decoded.sessionId,
        false,
        'session_not_found_refresh'
      );
      throw new AuthenticationError(
        'Session not found or expired',
        'invalid_session'
      );
    }

    // Check if refresh token ID matches session
    if (sessionData.refreshTokenId !== decoded.tokenId) {
      authLogger.securityEvent('refresh_token_mismatch', 'high', {
        sessionId: decoded.sessionId.substring(0, 8) + '...',
        providedTokenId: decoded.tokenId,
      });
      throw new AuthenticationError('Invalid refresh token', 'token_invalid');
    }

    req.session = sessionData;
    req.user = {
      sub: sessionData.userId,
      sessionId: sessionData.sessionId,
      email: sessionData.email,
      given_name: sessionData.given_name,
      family_name: sessionData.family_name,
      anonymousMode: sessionData.anonymousMode,
      preferredName: sessionData.preferredName,
      sobrietyDate: sessionData.sobrietyDate,
      homeMeetingId: sessionData.homeMeetingId,
      crisisContactConsent: sessionData.crisisContactConsent,
      dataRetentionChoice: sessionData.dataRetentionChoice,
    } as TokenPayload;

    next();
  } catch (error) {
    authLogger.loginFailure('refresh_token_failed', {
      error: ErrorUtils.getMessage(error),
    });

    if (error instanceof AuthenticationError) {
      return res.status(401).json(error.toJSON());
    } else {
      const authError = new AuthenticationError(
        'Token refresh failed',
        'token_refresh_failed'
      );
      return res.status(401).json(authError.toJSON());
    }
  }
}

/**
 * AA Traditions compliance middleware
 */
export function aaComplianceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Add AA Traditions compliance headers
  res.setHeader('X-AA-Traditions-Compliant', 'true');
  res.setHeader('X-AA-Anonymity-Supported', 'true');
  res.setHeader('X-AA-No-Endorsement', 'true');
  res.setHeader('X-AA-No-Professional-Advice', 'true');

  // Log compliance check
  if (req.session) {
    authLogger.aaTraditionalCompliance(11, 'compliance_check', {
      endpoint: req.path,
      anonymousMode: req.session.anonymousMode,
      sessionId: req.session.sessionId.substring(0, 8) + '...',
    });
  }

  next();
}

/**
 * Session validation middleware (lighter version of auth)
 */
export function validateSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  return authenticateToken({ required: true, allowAnonymous: true })(
    req,
    res,
    next
  );
}

/**
 * Create custom auth middleware with specific options
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return authenticateToken(options);
}
