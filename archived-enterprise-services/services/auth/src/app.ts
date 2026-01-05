/**
 * Express Application Setup
 * Configures the authentication service Express app with middleware and routes
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, derivedConfig } from './config';
import { createLogger } from './services/logger';
import { requestIdMiddleware } from './middleware/auth-middleware';
import authRoutes from './routes/auth-routes';
import healthRoutes from './routes/health-routes';
import { ErrorUtils } from '@digital-sponsor/shared';

const logger = createLogger('App');

export function createApp(): express.Application {
  const app = express();

  // Trust proxy headers (for Azure Container Apps)
  app.set('trust proxy', 1);

  // Request ID middleware (must be first)
  app.use(requestIdMiddleware);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: derivedConfig.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-request-id',
        'x-correlation-id',
        'x-aa-traditions-compliant',
      ],
      exposedHeaders: [
        'x-request-id',
        'X-AA-Traditions-Compliant',
        'X-AA-Anonymity-Supported',
        'X-AA-No-Endorsement',
        'X-AA-No-Professional-Advice',
      ],
      maxAge: 86400, // 24 hours
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        timestamp: new Date(),
      },
      statusCode: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use Redis for distributed rate limiting in production
    store: derivedConfig.isProduction ? undefined : undefined, // TODO: Implement Redis store
    keyGenerator: req => {
      // Rate limit by IP and user ID (if available)
      const userKey = req.headers.authorization ? 'auth' : 'anon';
      return `${req.ip}:${userKey}`;
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        requestId: req.requestId,
      });

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date(),
          requestId: req.requestId,
        },
        statusCode: 429,
      });
    },
  });

  app.use(limiter);

  // Body parsing middleware
  app.use(
    express.json({
      limit: '1mb',
      type: ['application/json'],
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    })
  );

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();

    // Log incoming request
    logger.info('Incoming request', {
      method: req.method,
      url: req.path,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      ip: req.ip,
      requestId: req.requestId,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding: any) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      logger.log(logLevel, 'Request completed', {
        method: req.method,
        url: req.path,
        statusCode,
        duration: `${duration}ms`,
        requestId: req.requestId,
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  });

  // API routes
  app.use('/auth', authRoutes);
  app.use('/', healthRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      service: 'Digital Sponsor Authentication Service',
      version: '1.0.0',
      environment: config.NODE_ENV,
      aaTraditionalCompliant: true,
      endpoints: [
        'POST /auth/login',
        'POST /auth/refresh',
        'POST /auth/logout',
        'POST /auth/logout-all',
        'GET /auth/session',
        'GET /auth/sessions',
        'GET /auth/validate',
        'PATCH /auth/preferences',
        'GET /health',
        'GET /health/ready',
        'GET /health/live',
      ],
      documentation: {
        aaTraditionalCompliance: {
          tradition6: 'No endorsement of external enterprises',
          tradition8: 'No professional advice - literature-based guidance only',
          tradition11: 'Anonymity support with anonymous mode',
          tradition12: 'Personal recovery focus in all features',
        },
        features: [
          'Azure AD B2C integration',
          'JWT token management',
          'Session management with Redis',
          'Anonymous mode support',
          'Crisis contact consent tracking',
          'Data retention preferences',
          'Rate limiting and security',
        ],
      },
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint not found',
        path: req.path,
        timestamp: new Date(),
        requestId: req.requestId,
      },
      statusCode: 404,
    });
  });

  // Global error handler
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      logger.error('Unhandled error', {
        error: ErrorUtils.getMessage(error),
        stack: error.stack,
        url: req.path,
        method: req.method,
        requestId: req.requestId,
      });

      // Don't expose internal errors in production
      const message = derivedConfig.isDevelopment
        ? ErrorUtils.getMessage(error)
        : 'An internal error occurred';

      res.status(500).json({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message,
          timestamp: new Date(),
          requestId: req.requestId,
        },
        statusCode: 500,
      });
    }
  );

  return app;
}

export default createApp;
