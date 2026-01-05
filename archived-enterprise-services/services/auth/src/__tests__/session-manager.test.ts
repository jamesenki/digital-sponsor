/**
 * Session Manager Tests
 */

import { sessionManager, SessionData } from '../services/session-manager';
import { redisClient } from '../services/redis-client';
import { AuthenticationError } from '@digital-sponsor/shared';

jest.mock('../services/redis-client');

describe('Session Manager', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  const mockUserClaims = {
    email: 'test@example.com',
    given_name: 'John',
    family_name: 'Doe',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.setSession.mockResolvedValue(undefined);

      const sessionData = await sessionManager.createSession({
        userId: mockUserId,
        userClaims: mockUserClaims,
      });

      expect(sessionData.sessionId).toBeDefined();
      expect(sessionData.userId).toBe(mockUserId);
      expect(sessionData.given_name).toBe('John');
      expect(sessionData.createdAt).toBeInstanceOf(Date);
      expect(sessionData.lastAccessedAt).toBeInstanceOf(Date);
      expect(sessionData.anonymousMode).toBe(true); // Default
      expect(sessionData.dataRetentionChoice).toBe('session'); // Default

      expect(mockRedisClient.setSession).toHaveBeenCalledWith(
        sessionData.sessionId,
        sessionData,
        expect.any(Number)
      );
    });

    it('should handle Redis errors during session creation', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.setSession.mockRejectedValue(new Error('Redis error'));

      await expect(
        sessionManager.createSession({
          userId: mockUserId,
          userClaims: mockUserClaims,
        })
      ).rejects.toThrow('Failed to create session: Redis error');
    });
  });

  describe('getSession', () => {
    it('should retrieve an existing session', async () => {
      const mockSessionData: SessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        anonymousMode: false,
        dataRetentionChoice: 'session',
        crisisContactConsent: true,
      };

      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockResolvedValue(mockSessionData);

      const retrievedSession = await sessionManager.getSession(mockSessionId);

      expect(retrievedSession).toEqual(mockSessionData);
      expect(mockRedisClient.getSession).toHaveBeenCalledWith(mockSessionId);
    });

    it('should return null for non-existent session', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockResolvedValue(null);

      const retrievedSession = await sessionManager.getSession('non-existent');

      expect(retrievedSession).toBeNull();
    });

    it('should handle Redis errors during session retrieval', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockRejectedValue(new Error('Redis error'));

      await expect(sessionManager.getSession(mockSessionId)).rejects.toThrow(
        'Failed to retrieve session: Redis error'
      );
    });
  });

  describe('validateSessionWithRetentionPolicy', () => {
    it('should validate and update last accessed time for valid session', async () => {
      const mockSessionData: SessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        email: 'test@example.com',
        given_name: 'John',
        createdAt: new Date(Date.now() - 60000), // 1 minute ago
        lastAccessedAt: new Date(Date.now() - 30000), // 30 seconds ago
        expiresAt: new Date(Date.now() + 3600000),
        anonymousMode: false,
        dataRetentionChoice: 'session',
        crisisContactConsent: true,
      };

      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockResolvedValue(mockSessionData);
      mockRedisClient.setSession.mockResolvedValue(undefined);

      const validatedSession =
        await sessionManager.validateSessionWithRetentionPolicy(mockSessionId);

      expect(validatedSession).toBeDefined();
      expect(validatedSession!.sessionId).toBe(mockSessionId);
      expect(validatedSession!.lastAccessedAt.getTime()).toBeGreaterThan(
        mockSessionData.lastAccessedAt.getTime()
      );

      expect(mockRedisClient.setSession).toHaveBeenCalled();
    });

    it('should return null for expired session (30 days retention)', async () => {
      const mockSessionData: SessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        email: 'test@example.com',
        createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000), // 31 days ago
        lastAccessedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 3600000),
        anonymousMode: false,
        dataRetentionChoice: '30days',
        crisisContactConsent: true,
      };

      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockResolvedValue(mockSessionData);
      mockRedisClient.deleteSession.mockResolvedValue(true);

      const validatedSession =
        await sessionManager.validateSessionWithRetentionPolicy(mockSessionId);

      expect(validatedSession).toBeNull();
      expect(mockRedisClient.deleteSession).toHaveBeenCalledWith(mockSessionId);
    });

    it('should not delete session with "never" retention policy', async () => {
      const mockSessionData: SessionData = {
        sessionId: mockSessionId,
        userId: mockUserId,
        email: 'test@example.com',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        lastAccessedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 3600000),
        anonymousMode: false,
        dataRetentionChoice: 'never',
        crisisContactConsent: true,
      };

      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getSession.mockResolvedValue(mockSessionData);
      mockRedisClient.setSession.mockResolvedValue(undefined);

      const validatedSession =
        await sessionManager.validateSessionWithRetentionPolicy(mockSessionId);

      expect(validatedSession).toBeDefined();
      expect(mockRedisClient.deleteSession).not.toHaveBeenCalled();
    });
  });

  describe('deleteSession', () => {
    it('should delete session successfully', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.deleteSession.mockResolvedValue(true);

      const result = await sessionManager.deleteSession(mockSessionId);

      expect(result).toBe(true);
      expect(mockRedisClient.deleteSession).toHaveBeenCalledWith(mockSessionId);
    });

    it('should handle Redis errors during session deletion', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.deleteSession.mockRejectedValue(new Error('Redis error'));

      await expect(sessionManager.deleteSession(mockSessionId)).rejects.toThrow(
        'Failed to delete session: Redis error'
      );
    });
  });

  describe('deleteAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.deleteUserSessions.mockResolvedValue(3);

      const deletedCount =
        await sessionManager.deleteAllUserSessions(mockUserId);

      expect(deletedCount).toBe(3);
      expect(mockRedisClient.deleteUserSessions).toHaveBeenCalledWith(
        mockUserId
      );
    });
  });

  describe('getUserSessions', () => {
    it('should get all sessions for a user', async () => {
      const mockSessions = ['session-1', 'session-2', 'session-3'];
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.getUserSessions.mockResolvedValue(mockSessions);

      const sessions = await sessionManager.getUserSessions(mockUserId);

      expect(sessions).toEqual(mockSessions);
      expect(mockRedisClient.getUserSessions).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('extendSession', () => {
    it('should extend session TTL successfully', async () => {
      const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
      mockRedisClient.extendSession.mockResolvedValue(true);

      const result = await sessionManager.extendSession(mockSessionId, 3600);

      expect(result).toBe(true);
      expect(mockRedisClient.extendSession).toHaveBeenCalledWith(
        mockSessionId,
        3600
      );
    });
  });
});
