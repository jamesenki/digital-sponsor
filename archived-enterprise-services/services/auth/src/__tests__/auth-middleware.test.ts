/**
 * Auth Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireAnonymousMode,
  requireCrisisConsent,
  requestIdMiddleware,
} from '../middleware/auth-middleware';
import { jwtService } from '../services/jwt-service';
import { sessionManager } from '../services/session-manager';
import {
  AuthenticationError,
  AuthorizationError,
} from '@digital-sponsor/shared';

// Mock dependencies
jest.mock('../services/jwt-service');
jest.mock('../services/session-manager');
jest.mock('../services/logger');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  const mockAccessToken = 'mock-access-token';

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
    crisisContactConsent: true,
  };

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token and set user context', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockReq.headers!.authorization = `Bearer ${mockAccessToken}`;

      mockJwtService.extractTokenFromHeader.mockReturnValue(mockAccessToken);
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: false,
      });
      mockSessionManager.validateSession.mockResolvedValue(mockSessionData);

      const middleware = authenticateToken();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        userId: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: false,
      });
      expect(mockReq.session).toEqual(mockSessionData);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should reject missing authorization header', async () => {
      const middleware = authenticateToken();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHENTICATION_FAILED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;

      mockReq.headers!.authorization = `Bearer invalid-token`;
      mockJwtService.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJwtService.verifyAccessToken.mockRejectedValue(
        new AuthenticationError('Invalid token')
      );

      const middleware = authenticateToken();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired session', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockReq.headers!.authorization = `Bearer ${mockAccessToken}`;

      mockJwtService.extractTokenFromHeader.mockReturnValue(mockAccessToken);
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.validateSession.mockResolvedValue(null);

      const middleware = authenticateToken();
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject anonymous mode when not allowed', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockReq.headers!.authorization = `Bearer ${mockAccessToken}`;

      mockJwtService.extractTokenFromHeader.mockReturnValue(mockAccessToken);
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: true,
      });
      mockSessionManager.validateSession.mockResolvedValue({
        ...mockSessionData,
        anonymousMode: true,
      });

      const middleware = authenticateToken({ allowAnonymous: false });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHORIZATION_FAILED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow anonymous mode when explicitly allowed', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockReq.headers!.authorization = `Bearer ${mockAccessToken}`;

      mockJwtService.extractTokenFromHeader.mockReturnValue(mockAccessToken);
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: true,
      });
      mockSessionManager.validateSession.mockResolvedValue({
        ...mockSessionData,
        anonymousMode: true,
      });

      const middleware = authenticateToken({ allowAnonymous: true });
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toEqual({
        userId: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: true,
      });
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuthenticateToken', () => {
    it('should authenticate when token is present', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;
      const mockSessionManager = sessionManager as jest.Mocked<
        typeof sessionManager
      >;

      mockReq.headers!.authorization = `Bearer ${mockAccessToken}`;

      mockJwtService.extractTokenFromHeader.mockReturnValue(mockAccessToken);
      mockJwtService.verifyAccessToken.mockResolvedValue({
        sub: mockUserId,
        sessionId: mockSessionId,
      });
      mockSessionManager.validateSession.mockResolvedValue(mockSessionData);

      await optionalAuthenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeDefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when no token provided', async () => {
      await optionalAuthenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should continue without authentication when invalid token provided', async () => {
      const mockJwtService = jwtService as jest.Mocked<typeof jwtService>;

      mockReq.headers!.authorization = `Bearer invalid-token`;
      mockJwtService.extractTokenFromHeader.mockReturnValue('invalid-token');
      mockJwtService.verifyAccessToken.mockRejectedValue(
        new AuthenticationError('Invalid token')
      );

      await optionalAuthenticateToken(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockReq.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireAnonymousMode', () => {
    it('should allow access when user is in anonymous mode', () => {
      mockReq.user = {
        userId: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: true,
      };

      requireAnonymousMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user is not in anonymous mode', () => {
      mockReq.user = {
        userId: mockUserId,
        sessionId: mockSessionId,
        anonymousMode: false,
      };

      requireAnonymousMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'AUTHORIZATION_FAILED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      requireAnonymousMode(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireCrisisConsent', () => {
    it('should allow access when user has given crisis consent', () => {
      mockReq.session = {
        ...mockSessionData,
        crisisContactConsent: true,
      };

      requireCrisisConsent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should deny access when user has not given crisis consent', () => {
      mockReq.session = {
        ...mockSessionData,
        crisisContactConsent: false,
      };

      requireCrisisConsent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CRISIS_CONSENT_REQUIRED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when session is missing', () => {
      requireCrisisConsent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requestIdMiddleware', () => {
    it('should generate request ID when not provided', () => {
      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use provided request ID', () => {
      const providedRequestId = 'custom-request-id';
      mockReq.headers!['x-request-id'] = providedRequestId;

      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBe(providedRequestId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should use correlation ID when request ID not provided', () => {
      const correlationId = 'correlation-id';
      mockReq.headers!['x-correlation-id'] = correlationId;

      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBe(correlationId);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should prioritize request ID over correlation ID', () => {
      const requestId = 'request-id';
      const correlationId = 'correlation-id';
      mockReq.headers!['x-request-id'] = requestId;
      mockReq.headers!['x-correlation-id'] = correlationId;

      requestIdMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.requestId).toBe(requestId);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
