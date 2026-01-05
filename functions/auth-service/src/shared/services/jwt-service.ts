/**
 * JWT Service
 * Handles JWT token creation, validation, and refresh with B2C integration
 */

import jwt from 'jsonwebtoken';
const jwksClient = require('jwks-client');
import { config, derivedConfig } from '../config';
import { AuthenticationError, ValidationError } from '@digital-sponsor/shared';
import { createLogger } from './logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('JWTService');

export interface TokenPayload {
  sub: string; // User ID
  email?: string;
  given_name?: string;
  family_name?: string;
  iss: string; // Issuer
  aud: string; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
  jti: string; // JWT ID
  sessionId: string;

  // AA Traditions compliant claims
  anonymousMode?: boolean;
  preferredName?: string;
  sobrietyDate?: string;
  homeMeetingId?: string;
  crisisContactConsent?: boolean;
  dataRetentionChoice?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenId: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export class JWTService {
  private jwksClientInstance: any;

  constructor() {
    this.jwksClientInstance = jwksClient({
      jwksUri: derivedConfig.b2cJwksUri,
      requestHeaders: {},
      timeout: 30000,
    });
  }

  /**
   * Create an access token for authenticated user
   */
  async createAccessToken(
    userId: string,
    sessionId: string,
    userClaims: Partial<TokenPayload> = {}
  ): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = this.parseTimeExpression(
        derivedConfig.jwtConfig.expiresIn
      );

      const payload: TokenPayload = {
        sub: userId,
        iss: derivedConfig.jwtConfig.issuer,
        aud: derivedConfig.jwtConfig.audience,
        exp: now + expiresIn,
        iat: now,
        jti: uuidv4(),
        sessionId,

        // Include user claims from B2C
        ...userClaims,

        // AA Traditions compliance defaults
        anonymousMode:
          userClaims.anonymousMode ?? derivedConfig.aaDefaults.anonymousMode,
        dataRetentionChoice:
          userClaims.dataRetentionChoice ??
          derivedConfig.aaDefaults.dataRetention,
      };

      // AA Tradition 11: Remove identifying information in anonymous mode
      if (payload.anonymousMode) {
        payload.email = undefined;
        payload.family_name = undefined;
        payload.given_name =
          payload.preferredName || payload.given_name?.split(' ')[0];
      }

      const token = jwt.sign(payload, derivedConfig.jwtConfig.secret, {
        algorithm: 'HS256',
      });

      logger.debug('Access token created', {
        userId: userId.substring(0, 8) + '...',
        sessionId: sessionId.substring(0, 8) + '...',
        expiresIn,
        anonymousMode: payload.anonymousMode,
      });

      return token;
    } catch (error) {
      logger.error('Failed to create access token', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError(
        'Failed to create access token',
        'token_creation_failed'
      );
    }
  }

  /**
   * Create a refresh token
   */
  async createRefreshToken(userId: string, sessionId: string): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = this.parseTimeExpression(
        derivedConfig.jwtConfig.refreshExpiresIn
      );

      const payload: RefreshTokenPayload = {
        sub: userId,
        sessionId,
        tokenId: uuidv4(),
        iss: derivedConfig.jwtConfig.issuer,
        aud: derivedConfig.jwtConfig.audience,
        exp: now + expiresIn,
        iat: now,
      };

      const token = jwt.sign(payload, derivedConfig.jwtConfig.secret, {
        algorithm: 'HS256',
      });

      logger.debug('Refresh token created', {
        userId: userId.substring(0, 8) + '...',
        sessionId: sessionId.substring(0, 8) + '...',
        expiresIn,
      });

      return token;
    } catch (error) {
      logger.error('Failed to create refresh token', {
        userId: userId.substring(0, 8) + '...',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError(
        'Failed to create refresh token',
        'token_creation_failed'
      );
    }
  }

  /**
   * Create both access and refresh tokens
   */
  async createTokenPair(
    userId: string,
    sessionId: string,
    userClaims?: Partial<TokenPayload>
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.createAccessToken(userId, sessionId, userClaims),
      this.createRefreshToken(userId, sessionId),
    ]);

    const expiresIn = this.parseTimeExpression(
      derivedConfig.jwtConfig.expiresIn
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const decoded = jwt.verify(token, derivedConfig.jwtConfig.secret, {
        issuer: derivedConfig.jwtConfig.issuer,
        audience: derivedConfig.jwtConfig.audience,
        algorithms: ['HS256'],
      }) as TokenPayload;

      // Validate required fields
      if (!decoded.sub || !decoded.sessionId) {
        throw new ValidationError(
          'Invalid token payload: missing required fields'
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError(
          'Access token has expired',
          'token_expired'
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid access token', 'token_invalid');
      } else {
        logger.error('Access token verification failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new AuthenticationError(
          'Token verification failed',
          'token_invalid'
        );
      }
    }
  }

  /**
   * Verify and decode a refresh token
   */
  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, derivedConfig.jwtConfig.secret, {
        issuer: derivedConfig.jwtConfig.issuer,
        audience: derivedConfig.jwtConfig.audience,
        algorithms: ['HS256'],
      }) as RefreshTokenPayload;

      // Validate required fields
      if (!decoded.sub || !decoded.sessionId || !decoded.tokenId) {
        throw new ValidationError(
          'Invalid refresh token payload: missing required fields'
        );
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError(
          'Refresh token has expired',
          'token_expired'
        );
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid refresh token', 'token_invalid');
      } else {
        logger.error('Refresh token verification failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new AuthenticationError(
          'Refresh token verification failed',
          'token_invalid'
        );
      }
    }
  }

  /**
   * Verify B2C token from Azure AD B2C
   */
  async verifyB2CToken(token: string): Promise<any> {
    try {
      // Decode the token header to get the key ID
      const decodedHeader = jwt.decode(token, { complete: true });
      if (
        !decodedHeader ||
        typeof decodedHeader === 'string' ||
        !decodedHeader.header.kid
      ) {
        throw new AuthenticationError('Invalid token format', 'token_invalid');
      }

      // Get the signing key from JWKS
      const key = await this.getSigningKey(decodedHeader.header.kid);

      // Verify the token
      const decoded = jwt.verify(token, key, {
        algorithms: ['RS256'],
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('B2C token has expired', 'token_expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid B2C token', 'token_invalid');
      } else {
        logger.error('B2C token verification failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw new AuthenticationError(
          'B2C token verification failed',
          'token_invalid'
        );
      }
    }
  }

  /**
   * Get signing key from JWKS endpoint
   */
  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClientInstance.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      logger.error('Failed to get signing key', {
        kid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new AuthenticationError(
        'Failed to get token signing key',
        'token_invalid'
      );
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AuthenticationError(
        'Authorization header is required',
        'missing_token'
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError(
        'Invalid authorization header format',
        'token_invalid'
      );
    }

    return parts[1];
  }

  /**
   * Parse time expression (e.g., '1h', '30m', '7d') to seconds
   */
  private parseTimeExpression(expression: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = expression.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid time expression: ${expression}`);
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * units[unit];
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is close to expiration (within 5 minutes)
   */
  isTokenNearExpiration(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) return true;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * Create AA-compliant token payload
   */
  createAACompliantPayload(userClaims: any): Partial<TokenPayload> {
    const payload: Partial<TokenPayload> = {
      email: userClaims.email,
      given_name: userClaims.given_name,
      family_name: userClaims.family_name,

      // AA Traditions compliant claims
      anonymousMode:
        userClaims.anonymousMode ?? derivedConfig.aaDefaults.anonymousMode,
      preferredName: userClaims.preferredName,
      sobrietyDate: userClaims.sobrietyDate,
      homeMeetingId: userClaims.homeMeetingId,
      crisisContactConsent: userClaims.crisisContactConsent,
      dataRetentionChoice:
        userClaims.dataRetentionChoice ??
        derivedConfig.aaDefaults.dataRetention,
    };

    return payload;
  }
}

// Export singleton instance
export const jwtService = new JWTService();
