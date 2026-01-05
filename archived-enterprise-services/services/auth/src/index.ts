/**
 * Authentication Service Entry Point
 * Starts the Express server and initializes all services
 */

import dotenv from 'dotenv';
import { config } from './config';
import { createLogger, defaultLogger } from './services/logger';
import { redisClient } from './services/redis-client';
import createApp from './app';

// Load environment variables
dotenv.config();

const logger = createLogger('Server');

/**
 * Initialize all services
 */
async function initializeServices(): Promise<void> {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Redis connection initialized');

    // TODO: Initialize Azure Key Vault client if needed
    // TODO: Initialize other services

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Close Redis connection
    await redisClient.disconnect();
    logger.info('Redis connection closed');

    // TODO: Close other connections

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Initialize services first
    await initializeServices();

    // Create Express app
    const app = createApp();

    // Start the HTTP server
    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info('Authentication service started', {
        port: config.PORT,
        host: config.HOST,
        environment: config.NODE_ENV,
        version: '1.0.0',
        aaTraditionalCompliant: true,
      });
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.PORT} is already in use`);
      } else {
        logger.error('Server error', { error: error.message });
      }
      process.exit(1);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        promise: String(promise),
      });
      process.exit(1);
    });

    logger.info('Server setup completed successfully');
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  startServer().catch(error => {
    defaultLogger.error('Application startup failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  });
}

export default startServer;
