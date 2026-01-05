/**
 * Health Check Routes
 * Provides health and readiness endpoints for the authentication service
 */

import { Router, Request, Response } from 'express';
import { redisClient } from '../services/redis-client';
import { createLogger } from '../services/logger';
import { config } from '../config';

const router = Router();
const logger = createLogger('HealthRoutes');

/**
 * Basic health check
 * GET /health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'digital-sponsor-auth',
      version: '1.0.0',
      environment: config.NODE_ENV,
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * Detailed readiness check
 * GET /health/ready
 */
router.get('/health/ready', async (req: Request, res: Response) => {
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
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const isReady = checks.redis;
    const status = isReady ? 'ready' : 'not_ready';

    res.status(isReady ? 200 : 503).json({
      status,
      checks,
      service: 'digital-sponsor-auth',
      version: '1.0.0',
      environment: config.NODE_ENV,
    });
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
    });
  }
});

/**
 * Liveness check
 * GET /health/live
 */
router.get('/health/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    service: 'digital-sponsor-auth',
  });
});

export default router;
