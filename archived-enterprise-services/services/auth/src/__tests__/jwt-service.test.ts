/**
 * JWT Service Tests
 */

import { jwtService, TokenPayload } from '../services/jwt-service';
import { AuthenticationError } from '@digital-sponsor/shared';

describe('JWT Service', () => {
  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';

  describe('createAccessToken', () => {
    it('should create a valid access token', async () => {
      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should create token with AA-compliant claims', async () => {
      const userClaims = {
        email: 'test@example.com',
        given_name: 'John',
        anonymousMode: true,
        preferredName: 'J',
        crisisContactConsent: true,
      };

      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId,
        userClaims
      );
      const decoded = await jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.anonymousMode).toBe(true);
      expect(decoded.preferredName).toBe('J');
      expect(decoded.crisisContactConsent).toBe(true);
      // In anonymous mode, email should be removed
      expect(decoded.email).toBeUndefined();
      expect(decoded.family_name).toBeUndefined();
    });

    it('should preserve identifying info when not in anonymous mode', async () => {
      const userClaims = {
        email: 'test@example.com',
        given_name: 'John',
        family_name: 'Doe',
        anonymousMode: false,
      };

      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId,
        userClaims
      );
      const decoded = await jwtService.verifyAccessToken(token);

      expect(decoded.email).toBe('test@example.com');
      expect(decoded.given_name).toBe('John');
      expect(decoded.family_name).toBe('Doe');
      expect(decoded.anonymousMode).toBe(false);
    });
  });

  describe('createRefreshToken', () => {
    it('should create a valid refresh token', async () => {
      const token = await jwtService.createRefreshToken(
        mockUserId,
        mockSessionId
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should create refresh token with correct payload', async () => {
      const token = await jwtService.createRefreshToken(
        mockUserId,
        mockSessionId
      );
      const decoded = await jwtService.verifyRefreshToken(token);

      expect(decoded.sub).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.tokenId).toBeDefined();
    });
  });

  describe('createTokenPair', () => {
    it('should create both access and refresh tokens', async () => {
      const tokenPair = await jwtService.createTokenPair(
        mockUserId,
        mockSessionId
      );

      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.expiresIn).toBeDefined();
      expect(tokenPair.tokenType).toBe('Bearer');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', async () => {
      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId
      );
      const decoded = await jwtService.verifyAccessToken(token);

      expect(decoded.sub).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
    });

    it('should reject an invalid token', async () => {
      await expect(
        jwtService.verifyAccessToken('invalid-token')
      ).rejects.toThrow(AuthenticationError);
    });

    it('should reject a token with invalid payload', async () => {
      // Create a token without required fields
      const jwt = require('jsonwebtoken');
      const { jwtConfig } = require('../config').derivedConfig;

      const invalidToken = jwt.sign(
        { sub: mockUserId }, // Missing sessionId
        jwtConfig.secret
      );

      await expect(jwtService.verifyAccessToken(invalidToken)).rejects.toThrow(
        AuthenticationError
      );
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', async () => {
      const token = await jwtService.createRefreshToken(
        mockUserId,
        mockSessionId
      );
      const decoded = await jwtService.verifyRefreshToken(token);

      expect(decoded.sub).toBe(mockUserId);
      expect(decoded.sessionId).toBe(mockSessionId);
      expect(decoded.tokenId).toBeDefined();
    });

    it('should reject an invalid refresh token', async () => {
      await expect(
        jwtService.verifyRefreshToken('invalid-token')
      ).rejects.toThrow(AuthenticationError);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const authHeader = `Bearer ${token}`;

      const extracted = jwtService.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should reject missing authorization header', () => {
      expect(() => jwtService.extractTokenFromHeader(undefined)).toThrow(
        AuthenticationError
      );
    });

    it('should reject invalid authorization header format', () => {
      expect(() => jwtService.extractTokenFromHeader('Invalid format')).toThrow(
        AuthenticationError
      );
    });

    it('should reject non-Bearer tokens', () => {
      expect(() => jwtService.extractTokenFromHeader('Basic token123')).toThrow(
        AuthenticationError
      );
    });
  });

  describe('getTokenExpiration', () => {
    it('should get expiration from valid token', async () => {
      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId
      );
      const expiration = jwtService.getTokenExpiration(token);

      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = jwtService.getTokenExpiration('invalid-token');
      expect(expiration).toBeNull();
    });
  });

  describe('isTokenNearExpiration', () => {
    it('should return false for newly created token', async () => {
      const token = await jwtService.createAccessToken(
        mockUserId,
        mockSessionId
      );
      const isNear = jwtService.isTokenNearExpiration(token);

      expect(isNear).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isNear = jwtService.isTokenNearExpiration('invalid-token');
      expect(isNear).toBe(true);
    });
  });

  describe('createAACompliantPayload', () => {
    it('should create compliant payload with defaults', () => {
      const userClaims = {
        email: 'test@example.com',
        given_name: 'John',
      };

      const payload = jwtService.createAACompliantPayload(userClaims);

      expect(payload.email).toBe('test@example.com');
      expect(payload.given_name).toBe('John');
      expect(payload.anonymousMode).toBe(true); // Default
      expect(payload.dataRetentionChoice).toBe('session'); // Default
    });

    it('should preserve user preferences', () => {
      const userClaims = {
        email: 'test@example.com',
        anonymousMode: false,
        preferredName: 'Johnny',
        dataRetentionChoice: '30days',
        crisisContactConsent: true,
      };

      const payload = jwtService.createAACompliantPayload(userClaims);

      expect(payload.anonymousMode).toBe(false);
      expect(payload.preferredName).toBe('Johnny');
      expect(payload.dataRetentionChoice).toBe('30days');
      expect(payload.crisisContactConsent).toBe(true);
    });
  });
});
