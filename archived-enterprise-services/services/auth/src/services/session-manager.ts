/**
 * Session Manager
 * Manages user sessions with Redis storage and AA Traditions compliance
 */

import { v4 as uuidv4 } from 'uuid';
import { redisClient } from './redis-client';
import { config, derivedConfig } from '../config';
import { createLogger, authLogger } from './logger';
import { AuthenticationError, ValidationError } from '@digital-sponsor/shared';

const logger = createLogger('SessionManager');

export interface SessionData {
  sessionId: string;
  userId: string;
  email?: string;
  given_name?: string;
  family_name?: string;

  // AA Traditions compliant fields
  anonymousMode: boolean;
  preferredName?: string;
  sobrietyDate?: string;
  homeMeetingId?: string;
  crisisContactConsent: boolean;
  dataRetentionChoice: string;

  // Session metadata
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;

  // B2C token information
  b2cTokenId?: string;
  refreshTokenId?: string;
}

export interface CreateSessionOptions {
  userId: string;
  userClaims: any;
  ipAddress?: string;
  userAgent?: string;
  ttlSeconds?: number;
}

export class SessionManager {
  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<SessionData> {
    try {
      const sessionId = uuidv4();
      const now = new Date();
      const ttl = options.ttlSeconds || config.SESSION_TTL;
      const expiresAt = new Date(now.getTime() + ttl * 1000);

      // Apply AA Traditions defaults and user preferences
      const sessionData: SessionData = {
        sessionId,
        userId: options.userId,
        email: options.userClaims.email,
        given_name: options.userClaims.given_name,
        family_name: options.userClaims.family_name,

        // AA Traditions compliance
        anonymousMode:
          options.userClaims.anonymousMode ??
          derivedConfig.aaDefaults.anonymousMode,
        preferredName: options.userClaims.preferredName,
        sobrietyDate: options.userClaims.sobrietyDate,
        homeMeetingId: options.userClaims.homeMeetingId,
        crisisContactConsent: options.userClaims.crisisContactConsent ?? false,
        dataRetentionChoice:
          options.userClaims.dataRetentionChoice ??
          derivedConfig.aaDefaults.dataRetention,

        // Session metadata
        createdAt: now,
        lastAccessedAt: now,
        expiresAt,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,

        // Token IDs for tracking
        b2cTokenId: options.userClaims.jti,
        refreshTokenId: uuidv4(),
      };

      // AA Tradition 11: Sanitize data in anonymous mode
      if (sessionData.anonymousMode) {
        sessionData.email = undefined;
        sessionData.family_name = undefined;
        sessionData.given_name =
          sessionData.preferredName || sessionData.given_name?.split(' ')[0];
      }

      // Store session in Redis
      await redisClient.setSession(sessionId, sessionData, ttl);

      // Log session creation
      authLogger.loginSuccess(options.userId, sessionId, {
        anonymousMode: sessionData.anonymousMode,
        dataRetentionChoice: sessionData.dataRetentionChoice,
        crisisContactConsent: sessionData.crisisContactConsent,
      });

      // Log AA Tradition compliance
      authLogger.anonymousModeUsage(sessionData.anonymousMode, sessionId);

      logger.info('Session created successfully', {
        sessionId: sessionId.substring(0, 8) + '...',
        userId: options.userId.substring(0, 8) + '...',
        anonymousMode: sessionData.anonymousMode,
        ttl,
      });

      return sessionData;
    } catch (error) {
      logger.error('Failed to create session', {
        userId: options.userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError(
        'Session creation failed',
        'session_creation_failed'
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionData = await redisClient.getSession(sessionId);

      if (!sessionData) {
        authLogger.sessionValidation(sessionId, false, 'session_not_found');
        return null;
      }

      // Convert date strings back to Date objects
      sessionData.createdAt = new Date(sessionData.createdAt);
      sessionData.lastAccessedAt = new Date(sessionData.lastAccessedAt);
      sessionData.expiresAt = new Date(sessionData.expiresAt);

      // Check if session is expired
      if (sessionData.expiresAt < new Date()) {
        authLogger.sessionValidation(sessionId, false, 'session_expired');
        await this.deleteSession(sessionId);
        return null;
      }

      authLogger.sessionValidation(sessionId, true);
      return sessionData;
    } catch (error) {
      logger.error('Failed to get session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Update session last accessed time
   */
  async touchSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return false;
      }

      sessionData.lastAccessedAt = new Date();

      // Calculate remaining TTL
      const remainingTtl = Math.max(
        0,
        Math.floor((sessionData.expiresAt.getTime() - Date.now()) / 1000)
      );

      if (remainingTtl <= 0) {
        await this.deleteSession(sessionId);
        return false;
      }

      await redisClient.setSession(sessionId, sessionData, remainingTtl);
      return true;
    } catch (error) {
      logger.error('Failed to touch session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(
    sessionId: string,
    additionalSeconds?: number
  ): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return false;
      }

      const extension = additionalSeconds || config.SESSION_TTL;
      sessionData.expiresAt = new Date(Date.now() + extension * 1000);
      sessionData.lastAccessedAt = new Date();

      await redisClient.setSession(sessionId, sessionData, extension);

      logger.debug('Session extended', {
        sessionId: sessionId.substring(0, 8) + '...',
        extension,
      });

      return true;
    } catch (error) {
      logger.error('Failed to extend session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await redisClient.getSession(sessionId);
      const deleted = await redisClient.deleteSession(sessionId);

      if (deleted && sessionData) {
        authLogger.logout(sessionData.userId, sessionId);
      }

      logger.debug('Session deleted', {
        sessionId: sessionId.substring(0, 8) + '...',
        deleted,
      });

      return deleted;
    } catch (error) {
      logger.error('Failed to delete session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete all sessions for a user (logout from all devices)
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    try {
      const deletedCount = await redisClient.deleteUserSessions(userId);

      authLogger.logout(userId, 'all_sessions', 'user_request');

      logger.info('All user sessions deleted', {
        userId: userId.substring(0, 8) + '...',
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete all user sessions', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessionIds = await redisClient.getUserSessions(userId);
      const sessions: SessionData[] = [];

      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId);
        if (sessionData) {
          sessions.push(sessionData);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get user sessions', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Update session data
   */
  async updateSession(
    sessionId: string,
    updates: Partial<SessionData>
  ): Promise<boolean> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) {
        return false;
      }

      // Merge updates
      const updatedData = { ...sessionData, ...updates };
      updatedData.lastAccessedAt = new Date();

      // Calculate remaining TTL
      const remainingTtl = Math.max(
        0,
        Math.floor((updatedData.expiresAt.getTime() - Date.now()) / 1000)
      );

      if (remainingTtl <= 0) {
        await this.deleteSession(sessionId);
        return false;
      }

      await redisClient.setSession(sessionId, updatedData, remainingTtl);
      return true;
    } catch (error) {
      logger.error('Failed to update session', {
        sessionId: sessionId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Validate session and handle data retention policies
   */
  async validateSessionWithRetentionPolicy(
    sessionId: string
  ): Promise<SessionData | null> {
    const sessionData = await this.getSession(sessionId);
    if (!sessionData) {
      return null;
    }

    // Apply data retention policy
    const now = new Date();
    let shouldDeleteSession = false;

    switch (sessionData.dataRetentionChoice) {
      case 'session':
        // Session-only data - already handled by Redis TTL
        break;

      case '30days':
        if (
          now.getTime() - sessionData.createdAt.getTime() >
          30 * 24 * 60 * 60 * 1000
        ) {
          shouldDeleteSession = true;
        }
        break;

      case '90days':
        if (
          now.getTime() - sessionData.createdAt.getTime() >
          90 * 24 * 60 * 60 * 1000
        ) {
          shouldDeleteSession = true;
        }
        break;

      case 'never':
        // Data kept indefinitely (subject to Redis memory limits)
        break;

      default:
        // Unknown retention policy - default to session
        break;
    }

    if (shouldDeleteSession) {
      authLogger.logout(sessionData.userId, sessionId, 'expired');
      await this.deleteSession(sessionId);
      return null;
    }

    return sessionData;
  }

  /**
   * Clean up expired sessions (can be called periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    // This would typically be implemented as a background job
    // For now, we rely on Redis TTL for automatic cleanup
    logger.info('Session cleanup completed (handled by Redis TTL)');
    return 0;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    anonymousModeSessions: number;
    retentionPolicyBreakdown: Record<string, number>;
  }> {
    // This is a simplified implementation
    // In production, you might want to maintain counters in Redis
    const stats = {
      totalActiveSessions: 0,
      anonymousModeSessions: 0,
      retentionPolicyBreakdown: {
        session: 0,
        '30days': 0,
        '90days': 0,
        never: 0,
      },
    };

    logger.info('Session statistics requested', stats);
    return stats;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
