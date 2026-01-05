/**
 * Azure Function: Authentication Logout
 * Handles session termination
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

const logger = createLogger('AuthLogout');

export async function authLogout(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    logger.info('Processing logout request', { requestId });

    // Extract and verify access token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Missing authorization header',
            requestId,
          },
        }),
      };
    }

    const token = jwtService.extractTokenFromHeader(authHeader);
    const payload = await jwtService.verifyAccessToken(token);

    // Delete session
    const deleted = await sessionManager.deleteSession(payload.sessionId);

    logger.info('Logout successful', {
      userId: payload.sub,
      sessionId: payload.sessionId,
      sessionDeleted: deleted,
      requestId,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        message: 'Logged out successfully',
        sessionId: payload.sessionId,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      logger.warn('Logout authentication failed', {
        error: error.message,
        requestId,
      });
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid or expired token',
            requestId,
          },
        }),
      };
    }

    logger.error('Logout error', {
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
app.http('auth-logout', {
  methods: ['POST'],
  route: 'auth/logout',
  authLevel: 'anonymous',
  handler: authLogout,
});
