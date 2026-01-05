/**
 * Azure Function: Authentication Refresh
 * Handles token refresh using refresh tokens
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
import Joi from 'joi';

const logger = createLogger('AuthRefresh');

// Input validation schema
const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export async function authRefresh(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    logger.info('Processing token refresh request', { requestId });

    // Validate input
    const body = await request.json().catch(() => ({}));
    const { error, value } = refreshSchema.validate(body);

    if (error) {
      return {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.details,
            requestId,
          },
        }),
      };
    }

    const { refreshToken } = value;

    // Verify refresh token
    const refreshPayload = await jwtService.verifyRefreshToken(refreshToken);

    // Validate session
    const sessionData = await sessionManager.validateSessionWithRetentionPolicy(
      refreshPayload.sessionId
    );

    if (!sessionData) {
      logger.warn('Session not found or expired', {
        sessionId: refreshPayload.sessionId,
        requestId,
      });

      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Session expired or invalid',
            requestId,
          },
        }),
      };
    }

    // Create new token pair
    const tokenPair = await jwtService.createTokenPair(
      refreshPayload.sub,
      refreshPayload.sessionId,
      sessionData
    );

    logger.info('Token refresh successful', {
      userId: refreshPayload.sub,
      sessionId: refreshPayload.sessionId,
      requestId,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify(tokenPair),
    };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      logger.warn('Token refresh failed', { error: error.message, requestId });
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid refresh token',
            requestId,
          },
        }),
      };
    }

    logger.error('Refresh error', {
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
app.http('auth-refresh', {
  methods: ['POST'],
  route: 'auth/refresh',
  authLevel: 'anonymous',
  handler: authRefresh,
});
