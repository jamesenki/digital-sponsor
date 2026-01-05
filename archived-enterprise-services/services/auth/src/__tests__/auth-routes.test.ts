/**
 * Auth Routes Tests
 */

import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth-routes';
import { jwtService } from '../services/jwt-service';
import { sessionManager } from '../services/session-manager';
import { AuthenticationError, ValidationError } from '@digital-sponsor/shared';

// Mock dependencies
jest.mock('../services/jwt-service');
jest.mock('../services/session-manager');
jest.mock('../services/logger');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  const mockB2CToken = 'mock-b2c-token';
  const mockAccessToken = 'mock-access-token';
  const mockRefreshToken = 'mock-refresh-token';

  const mockSessionData = {
    sessionId: mockSessionId,
    userId: mockUserId,
    userClaims: {
      email: 'test@example.com',
      given_name: 'John',
    },
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    anonymousMode: false,
    dataRetentionChoice: 'session' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid B2C token', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyB2CToken.mockResolvedValue({
        sub: mockUserId,
        email: 'test@example.com',
        given_name: 'John',
      });
      mockSessionManager.createSession.mockResolvedValue(mockSessionData);
      mockJwtService.createTokenPair.mockResolvedValue({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      const response = await request(app)
        .post('/auth/login')
        .send({ b2cToken: mockB2CToken })
        .expect(200);

      expect(response.body).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer',
        sessionId: mockSessionId,
        userProfile: {
          userId: mockUserId,
          anonymousMode: false,
          email: 'test@example.com',
          given_name: 'John',
        },
      });

      expect(mockJwtService.verifyB2CToken).toHaveBeenCalledWith(mockB2CToken);
      expect(mockSessionManager.createSession).toHaveBeenCalled();
      expect(mockJwtService.createTokenPair).toHaveBeenCalled();
    });

    it('should reject invalid B2C token', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      mockJwtService.verifyB2CToken.mockRejectedValue(
        new AuthenticationError('Invalid token')
      );

      const response = await request(app)
        .post('/auth/login')
        .send({ b2cToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyRefreshToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        tokenId: 'token-id',
      });
      mockSessionManager.validateSession.mockResolvedValue(mockSessionData);
      mockJwtService.createTokenPair.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: mockRefreshToken })
        .expect(200);

      expect(response.body.accessToken).toBe('new-access-token');
      expect(response.body.refreshToken).toBe('new-refresh-token');
    });

    it('should reject invalid refresh token', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      mockJwtService.verifyRefreshToken.mockRejectedValue(
        new AuthenticationError('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should reject refresh token for invalid session', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyRefreshToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        tokenId: 'token-id',
      });
      mockSessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: mockRefreshToken })
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.deleteSession.mockResolvedValue(true);

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
      expect(mockSessionManager.deleteSession).toHaveBeenCalledWith(
        mockSessionId
      );
    });

    it('should require authentication', async () => {
      const response = await request(app).post('/auth/logout').expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('POST /auth/logout-all', () => {
    it('should logout all sessions successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.deleteAllUserSessions.mockResolvedValue(3);

      const response = await request(app)
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.message).toBe(
        'All sessions logged out successfully'
      );
      expect(response.body.sessionsRemoved).toBe(3);
      expect(mockSessionManager.deleteAllUserSessions).toHaveBeenCalledWith(
        mockUserId
      );
    });
  });

  describe('GET /auth/session', () => {
    it('should get current session successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.getSession.mockResolvedValue(mockSessionData);

      const response = await request(app)
        .get('/auth/session')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.sessionId).toBe(mockSessionId);
      expect(response.body.userId).toBe(mockUserId);
      expect(response.body.anonymousMode).toBe(false);
    });
  });

  describe('GET /auth/sessions', () => {
    it('should get all user sessions successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.getUserSessions.mockResolvedValue([
        'session-1',
        'session-2',
      ]);

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.sessions).toEqual(['session-1', 'session-2']);
    });
  });

  describe('GET /auth/validate', () => {
    it('should validate token successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: false,
      });
      mockSessionManager.validateSession.mockResolvedValue(mockSessionData);

      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.userId).toBe(mockUserId);
      expect(response.body.sessionId).toBe(mockSessionId);
    });

    it('should return invalid for expired session', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.validateSession.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/validate')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .expect(200);

      expect(response.body.valid).toBe(false);
    });
  });

  describe('PATCH /auth/preferences', () => {
    it('should update user preferences successfully', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });

      const updatedSession = {
        ...mockSessionData,
        anonymousMode: true,
        preferredName: 'J',
      };
      mockSessionManager.updateSession.mockResolvedValue(updatedSession);

      const response = await request(app)
        .patch('/auth/preferences')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({
          anonymousMode: true,
          preferredName: 'J',
        })
        .expect(200);

      expect(response.body.anonymousMode).toBe(true);
      expect(response.body.preferredName).toBe('J');
      expect(mockSessionManager.updateSession).toHaveBeenCalledWith(
        mockSessionId,
        expect.objectContaining({
          anonymousMode: true,
          preferredName: 'J',
        })
      );
    });

    it('should validate preference updates', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });

      const response = await request(app)
        .patch('/auth/preferences')
        .set('Authorization', `Bearer ${mockAccessToken}`)
        .send({
          dataRetentionChoice: 'invalid-choice',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
