/**
 * Azure Function: Authentication Login
 * Handles B2C token exchange and session creation
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
import { ValidationError, AuthenticationError } from '@digital-sponsor/shared';
import Joi from 'joi';

const logger = createLogger('AuthLogin');

// Input validation schema
const loginSchema = Joi.object({
  b2cToken: Joi.string().required(),
  deviceInfo: Joi.object({
    userAgent: Joi.string().optional(),
    ipAddress: Joi.string().optional(),
  }).optional(),
});

export async function authLogin(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    logger.info('Processing login request', { requestId });

    // Validate input
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const { error, value } = loginSchema.validate(body);

    if (error) {
      logger.warn('Invalid login request', { error: error.details, requestId });
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

    const { b2cToken, deviceInfo = {} } = value;

    // Verify B2C token
    const b2cPayload = await jwtService.verifyB2CToken(b2cToken);

    // Create session with AA compliance
    const sessionData = await sessionManager.createSession({
      userId: b2cPayload.sub,
      userClaims: b2cPayload,
      ipAddress:
        deviceInfo.ipAddress ||
        request.headers.get('x-forwarded-for') ||
        'unknown',
      userAgent:
        deviceInfo.userAgent || request.headers.get('user-agent') || 'unknown',
    });

    // Create token pair
    const tokenPair = await jwtService.createTokenPair(
      b2cPayload.sub,
      sessionData.sessionId,
      sessionData
    );

    // Prepare user profile (AA Traditions compliant)
    const userProfile = {
      userId: b2cPayload.sub,
      anonymousMode: sessionData.anonymousMode,
      email: sessionData.anonymousMode ? undefined : sessionData.email,
      given_name: sessionData.anonymousMode
        ? undefined
        : sessionData.given_name,
      preferredName: sessionData.preferredName,
      dataRetentionChoice: sessionData.dataRetentionChoice,
      crisisContactConsent: sessionData.crisisContactConsent,
    };

    logger.info('Login successful', {
      userId: b2cPayload.sub,
      sessionId: sessionData.sessionId,
      anonymousMode: sessionData.anonymousMode,
      requestId,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-AA-Traditions-Compliant': 'true',
        'X-Request-ID': requestId,
      },
      body: JSON.stringify({
        ...tokenPair,
        sessionId: sessionData.sessionId,
        userProfile,
      }),
    };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError) {
      logger.warn('Authentication failed', { error: error.message, requestId });
      return {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid credentials',
            requestId,
          },
        }),
      };
    }

    logger.error('Login error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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
app.http('auth-login', {
  methods: ['POST'],
  route: 'auth/login',
  authLevel: 'anonymous',
  handler: authLogin,
});
