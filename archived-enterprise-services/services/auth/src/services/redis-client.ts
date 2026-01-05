/**
 * Redis Client Service
 * Manages Redis connections and session storage for the authentication service
 */

import { createClient, RedisClientType } from 'redis';
import { config, derivedConfig } from '../config';
import { createLogger } from './logger';

const logger = createLogger('RedisClient');

export class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient(derivedConfig.redisConfig);

      this.client.on('error', error => {
        logger.error('Redis connection error', { error: error.message });
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected successfully');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        logger.info('Redis client ready');
        this.isConnected = true;
      });

      this.client.on('end', () => {
        logger.info('Redis connection ended');
        this.isConnected = false;
      });

      await this.client.connect();
      logger.info('Redis client initialized');
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        redisUrl: config.REDIS_URL.replace(/:[^:]*@/, ':***@'), // Mask password
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Redis client disconnected');
    }
  }

  /**
   * Check if Redis is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client?.isReady === true;
  }

  /**
   * Get Redis client instance
   */
  getClient(): RedisClientType {
    if (!this.client || !this.isClientConnected()) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  /**
   * Store session data
   */
  async setSession(
    sessionId: string,
    data: any,
    ttlSeconds?: number
  ): Promise<void> {
    const client = this.getClient();
    const key = `${config.SESSION_PREFIX}${sessionId}`;
    const ttl = ttlSeconds || config.SESSION_TTL;

    try {
      await client.setEx(key, ttl, JSON.stringify(data));
      logger.debug('Session stored successfully', {
        sessionId: sessionId.substring(0, 8) + '...', // Partial ID for privacy
        ttl,
      });
    } catch (error) {
      logger.error('Failed to store session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Retrieve session data
   */
  async getSession(sessionId: string): Promise<any | null> {
    const client = this.getClient();
    const key = `${config.SESSION_PREFIX}${sessionId}`;

    try {
      const data = await client.get(key);
      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error('Failed to retrieve session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const client = this.getClient();
    const key = `${config.SESSION_PREFIX}${sessionId}`;

    try {
      const result = await client.del(key);
      logger.debug('Session deleted', {
        sessionId: sessionId.substring(0, 8) + '...',
        deleted: result > 0,
      });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Extend session TTL
   */
  async extendSession(
    sessionId: string,
    ttlSeconds?: number
  ): Promise<boolean> {
    const client = this.getClient();
    const key = `${config.SESSION_PREFIX}${sessionId}`;
    const ttl = ttlSeconds || config.SESSION_TTL;

    try {
      const result = await client.expire(key, ttl);
      logger.debug('Session TTL extended', {
        sessionId: sessionId.substring(0, 8) + '...',
        ttl,
        extended: result,
      });
      return result;
    } catch (error) {
      logger.error('Failed to extend session TTL', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all sessions for a user (for logout from all devices)
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const client = this.getClient();
    const pattern = `${config.SESSION_PREFIX}*`;

    try {
      const keys = await client.keys(pattern);
      const userSessions: string[] = [];

      for (const key of keys) {
        try {
          const sessionData = await client.get(key);
          if (sessionData) {
            const data = JSON.parse(sessionData);
            if (data.userId === userId) {
              userSessions.push(key.replace(config.SESSION_PREFIX, ''));
            }
          }
        } catch (parseError) {
          // Skip invalid session data
          logger.warn('Invalid session data found', { key });
        }
      }

      return userSessions;
    } catch (error) {
      logger.error('Failed to get user sessions', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<number> {
    const sessionIds = await this.getUserSessions(userId);
    let deletedCount = 0;

    for (const sessionId of sessionIds) {
      try {
        const deleted = await this.deleteSession(sessionId);
        if (deleted) deletedCount++;
      } catch (error) {
        logger.warn('Failed to delete user session', {
          sessionId: sessionId.substring(0, 8) + '...',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Deleted user sessions', {
      userId: userId.substring(0, 8) + '...',
      deletedCount,
      totalFound: sessionIds.length,
    });

    return deletedCount;
  }

  /**
   * Store rate limit data
   */
  async setRateLimit(
    key: string,
    count: number,
    windowMs: number
  ): Promise<void> {
    const client = this.getClient();
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      await client.setEx(`rate_limit:${key}`, ttlSeconds, count.toString());
    } catch (error) {
      logger.error('Failed to set rate limit', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get rate limit data
   */
  async getRateLimit(key: string): Promise<number | null> {
    const client = this.getClient();

    try {
      const data = await client.get(`rate_limit:${key}`);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      logger.error('Failed to get rate limit', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Increment rate limit counter
   */
  async incrementRateLimit(key: string, windowMs: number): Promise<number> {
    const client = this.getClient();
    const rateLimitKey = `rate_limit:${key}`;
    const ttlSeconds = Math.ceil(windowMs / 1000);

    try {
      const current = await client.incr(rateLimitKey);

      if (current === 1) {
        // First request in the window, set expiration
        await client.expire(rateLimitKey, ttlSeconds);
      }

      return current;
    } catch (error) {
      logger.error('Failed to increment rate limit', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isClientConnected()) {
        return false;
      }

      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

// Export singleton instance
export const redisClient = new RedisClient();
