/**
 * Authentication Routes
 * Handles login, logout, token refresh, and session management endpoints
 */

import { Router, Request, Response } from 'express';
import { jwtService } from '../services/jwt-service';
import { sessionManager } from '../services/session-manager';
import { authLogger } from '../services/logger';
import {
  refreshTokenMiddleware,
  aaComplianceMiddleware,
  requireAuth,
} from '../middleware/auth-middleware';
import { validate } from '@digital-sponsor/shared';
import {
  AuthenticationError,
  ValidationError,
  ErrorUtils,
} from '@digital-sponsor/shared';

const router = Router();

// Apply AA Traditions compliance to all auth routes
router.use(aaComplianceMiddleware);

/**
 * Exchange B2C token for internal JWT tokens
 * POST /auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = validate.authLogin(req.body);
    if (error) {
      throw ValidationError.fromJoiError(error, req.requestId);
    }

    const { b2cToken } = value;

    // Verify B2C token
    const b2cPayload = await jwtService.verifyB2CToken(b2cToken);

    // Extract user claims from B2C token
    const userClaims = jwtService.createAACompliantPayload(b2cPayload);

    // Create session
    const sessionData = await sessionManager.createSession({
      userId: b2cPayload.sub,
      userClaims: b2cPayload,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Create JWT tokens
    const tokenPair = await jwtService.createTokenPair(
      b2cPayload.sub,
      sessionData.sessionId,
      userClaims
    );

    // Log AA Traditions compliance
    authLogger.aaTraditionalCompliance(11, 'user_login', {
      anonymousMode: sessionData.anonymousMode,
      dataRetentionChoice: sessionData.dataRetentionChoice,
    });

    if (sessionData.crisisContactConsent) {
      authLogger.crisisSupportAccess(sessionData.sessionId, true);
    }

    res.status(200).json({
      success: true,
      data: {
        ...tokenPair,
        user: {
          id: sessionData.userId,
          email: sessionData.anonymousMode ? undefined : sessionData.email,
          displayName: sessionData.anonymousMode
            ? sessionData.preferredName || 'Anonymous'
            : sessionData.given_name,
          anonymousMode: sessionData.anonymousMode,
          crisisContactConsent: sessionData.crisisContactConsent,
          dataRetentionChoice: sessionData.dataRetentionChoice,
          sobrietyDate: sessionData.sobrietyDate,
          homeMeetingId: sessionData.homeMeetingId,
        },
        session: {
          sessionId: sessionData.sessionId,
          expiresAt: sessionData.expiresAt,
          createdAt: sessionData.createdAt,
        },
      },
    });
  } catch (error) {
    authLogger.loginFailure(
      error instanceof AuthenticationError ? error.reason : 'login_error',
      {
        error: ErrorUtils.getMessage(error),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      }
    );

    if (error instanceof ValidationError) {
      return res.status(400).json(error.toJSON());
    } else if (error instanceof AuthenticationError) {
      return res.status(401).json(error.toJSON());
    } else {
      const authError = new AuthenticationError('Login failed', 'login_failed');
      return res.status(500).json(authError.toJSON());
    }
  }
});

/**
 * Refresh access token
 * POST /auth/refresh
 */
router.post(
  '/refresh',
  refreshTokenMiddleware,
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.session) {
        throw new AuthenticationError(
          'Invalid session data',
          'invalid_session'
        );
      }

      // Create new token pair
      const tokenPair = await jwtService.createTokenPair(
        req.user.sub,
        req.session.sessionId,
        {
          email: req.session.email,
          given_name: req.session.given_name,
          family_name: req.session.family_name,
          anonymousMode: req.session.anonymousMode,
          preferredName: req.session.preferredName,
          sobrietyDate: req.session.sobrietyDate,
          homeMeetingId: req.session.homeMeetingId,
          crisisContactConsent: req.session.crisisContactConsent,
          dataRetentionChoice: req.session.dataRetentionChoice,
        }
      );

      // Update session with new refresh token ID
      await sessionManager.updateSession(req.session.sessionId, {
        refreshTokenId: req.session.refreshTokenId, // Keep same for now, could rotate
      });

      authLogger.tokenRefresh(req.user.sub, req.session.sessionId, true);

      res.status(200).json({
        success: true,
        data: tokenPair,
      });
    } catch (error) {
      if (req.session) {
        authLogger.tokenRefresh(
          req.user?.sub || '',
          req.session.sessionId,
          false
        );
      }

      const authError = new AuthenticationError(
        'Token refresh failed',
        'token_refresh_failed'
      );
      return res.status(401).json(authError.toJSON());
    }
  }
);

/**
 * Logout from current session
 * POST /auth/logout
 */
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.session) {
      return res
        .status(200)
        .json({ success: true, message: 'Already logged out' });
    }

    // Delete session
    await sessionManager.deleteSession(req.session.sessionId);

    authLogger.logout(req.user.sub, req.session.sessionId, 'user_request');

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    const authError = new AuthenticationError('Logout failed', 'logout_failed');
    return res.status(500).json(authError.toJSON());
  }
});

/**
 * Logout from all sessions (all devices)
 * POST /auth/logout-all
 */
router.post('/logout-all', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res
        .status(200)
        .json({ success: true, message: 'Already logged out' });
    }

    // Delete all user sessions
    const deletedCount = await sessionManager.deleteAllUserSessions(
      req.user.sub
    );

    authLogger.logout(req.user.sub, 'all_sessions', 'user_request');

    res.status(200).json({
      success: true,
      message: `Logged out from ${deletedCount} devices`,
      data: {
        sessionsDeleted: deletedCount,
      },
    });
  } catch (error) {
    const authError = new AuthenticationError(
      'Logout from all devices failed',
      'logout_all_failed'
    );
    return res.status(500).json(authError.toJSON());
  }
});

/**
 * Get current session information
 * GET /auth/session
 */
router.get('/session', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.session) {
      throw new AuthenticationError('Session not found', 'invalid_session');
    }

    // Get fresh session data
    const sessionData = await sessionManager.getSession(req.session.sessionId);
    if (!sessionData) {
      throw new AuthenticationError('Session expired', 'session_expired');
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: sessionData.userId,
          email: sessionData.anonymousMode ? undefined : sessionData.email,
          displayName: sessionData.anonymousMode
            ? sessionData.preferredName || 'Anonymous'
            : sessionData.given_name,
          anonymousMode: sessionData.anonymousMode,
          crisisContactConsent: sessionData.crisisContactConsent,
          dataRetentionChoice: sessionData.dataRetentionChoice,
          sobrietyDate: sessionData.sobrietyDate,
          homeMeetingId: sessionData.homeMeetingId,
        },
        session: {
          sessionId: sessionData.sessionId,
          createdAt: sessionData.createdAt,
          lastAccessedAt: sessionData.lastAccessedAt,
          expiresAt: sessionData.expiresAt,
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return res.status(401).json(error.toJSON());
    } else {
      const authError = new AuthenticationError(
        'Session retrieval failed',
        'session_retrieval_failed'
      );
      return res.status(500).json(authError.toJSON());
    }
  }
});

/**
 * Get all active sessions for current user
 * GET /auth/sessions
 */
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not found', 'invalid_user');
    }

    const sessions = await sessionManager.getUserSessions(req.user.sub);

    const sanitizedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastAccessedAt: session.lastAccessedAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      isCurrent: session.sessionId === req.session?.sessionId,
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions: sanitizedSessions,
        totalCount: sanitizedSessions.length,
      },
    });
  } catch (error) {
    const authError = new AuthenticationError(
      'Sessions retrieval failed',
      'sessions_retrieval_failed'
    );
    return res.status(500).json(authError.toJSON());
  }
});

/**
 * Validate current token (health check)
 * GET /auth/validate
 */
router.get('/validate', requireAuth, async (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      valid: true,
      userId: req.user?.sub,
      sessionId: req.session?.sessionId,
      anonymousMode: req.session?.anonymousMode,
      expiresAt: req.session?.expiresAt,
    },
  });
});

/**
 * Update session preferences (AA Traditions compliance)
 * PATCH /auth/preferences
 */
router.patch(
  '/preferences',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      if (!req.user || !req.session) {
        throw new AuthenticationError('Session not found', 'invalid_session');
      }

      // Validate request body
      const { error, value } = validate.sessionPreferences(req.body);
      if (error) {
        throw ValidationError.fromJoiError(error, req.requestId);
      }

      const updates: any = {};

      // Allow updating specific AA-compliant preferences
      if (value.anonymousMode !== undefined) {
        updates.anonymousMode = value.anonymousMode;
      }

      if (value.preferredName !== undefined) {
        updates.preferredName = value.preferredName;
      }

      if (value.dataRetentionChoice !== undefined) {
        updates.dataRetentionChoice = value.dataRetentionChoice;
      }

      const updated = await sessionManager.updateSession(
        req.session.sessionId,
        updates
      );

      if (!updated) {
        throw new AuthenticationError(
          'Session update failed',
          'session_update_failed'
        );
      }

      authLogger.aaTraditionalCompliance(11, 'preferences_updated', {
        sessionId: req.session.sessionId.substring(0, 8) + '...',
        updates: Object.keys(updates),
      });

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully',
        data: updates,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json(error.toJSON());
      } else if (error instanceof AuthenticationError) {
        return res.status(401).json(error.toJSON());
      } else {
        const authError = new AuthenticationError(
          'Preferences update failed',
          'preferences_update_failed'
        );
        return res.status(500).json(authError.toJSON());
      }
    }
  }
);

export default router;
