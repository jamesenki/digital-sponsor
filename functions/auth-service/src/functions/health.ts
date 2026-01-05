/**
 * Azure Function: Health Checks
 * Provides health and readiness endpoints
 */

import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { redisClient } from '../shared/services/redis-client';
import { createLogger } from '../shared/services/logger';

const logger = createLogger('HealthCheck');

export async function health(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'digital-sponsor-auth-functions',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requestId,
      }),
    };
  } catch (error) {
    logger.error('Health check failed', { error, requestId });
    return {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        requestId,
      }),
    };
  }
}

export async function healthReady(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const requestId = context.invocationId;

  try {
    const checks = {
      redis: false,
      timestamp: new Date().toISOString(),
    };

    // Check Redis connection
    try {
      checks.redis = await redisClient.ping();
    } catch (error) {
      checks.redis = false;
      logger.error('Redis health check failed', { error, requestId });
    }

    const isReady = checks.redis;
    const status = isReady ? 'ready' : 'not_ready';

    return {
      status: isReady ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        checks,
        service: 'digital-sponsor-auth-functions',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        requestId,
      }),
    };
  } catch (error) {
    logger.error('Readiness check failed', { error, requestId });
    return {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: 'Readiness check failed',
        requestId,
      }),
    };
  }
}

// Register the functions
app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler: health,
});

app.http('health-ready', {
  methods: ['GET'],
  route: 'health/ready',
  authLevel: 'anonymous',
  handler: healthReady,
});
