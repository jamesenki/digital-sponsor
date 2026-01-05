/**
 * Azure Function: Authentication Validation
 * Validates tokens and sessions for other services
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { jwtService } from '../shared/services/jwt-service';
import { sessionManager } from '../shared/services/session-manager';
import { createLogger } from '../shared/services/logger';
import { AuthenticationError } from '@digital-sponsor/shared';

const logger = createLogger('AuthValidate');

export async function authValidate(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    logger.info('Processing token validation request', { requestId });

    // Extract and verify access token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: false,
          reason: 'Missing authorization header',
          requestId,
        }),
      };
    }

    const token = jwtService.extractTokenFromHeader(authHeader);
    const payload = await jwtService.verifyAccessToken(token);

    // Validate session
    const sessionData = await sessionManager.validateSessionWithRetentionPolicy(
      payload.sessionId
    );

    if (!sessionData) {
      logger.warn('Session not found or expired', {
        sessionId: payload.sessionId,
        requestId,
      });

      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: false,
          reason: 'Session expired or invalid',
          requestId,
        }),
      };
    }

    // Return validation success with user context
    const userContext = {
      userId: payload.sub,
      sessionId: payload.sessionId,
      anonymousMode: sessionData.anonymousMode,
      preferredName: sessionData.preferredName,
      dataRetentionChoice: sessionData.dataRetentionChoice,
      crisisContactConsent: sessionData.crisisContactConsent,
    };

    logger.info('Token validation successful', {
      userId: payload.sub,
      sessionId: payload.sessionId,
      requestId,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
        'X-AA-Traditions-Compliant': 'true',
      },
      body: JSON.stringify({
        valid: true,
        user: userContext,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
        isNearExpiration: jwtService.isTokenNearExpiration(token),
        requestId,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      logger.info('Token validation failed', {
        error: error.message,
        requestId,
      });
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valid: false,
          reason: 'Invalid or expired token',
          requestId,
        }),
      };
    }

    logger.error('Validation error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    });

    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal error occurred',
          requestId,
        },
      }),
    };
  }
}

// Register the function
app.http('auth-validate', {
  methods: ['GET'],
  route: 'auth/validate',
  authLevel: 'anonymous',
  handler: authValidate,
});
