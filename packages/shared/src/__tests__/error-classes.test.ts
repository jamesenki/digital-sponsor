/**
 * Error Classes Tests
 */

import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  InternalServerError,
  CrisisSupportError,
  EncryptionError,
  ErrorFactory,
  ErrorUtils,
} from '../errors/error-classes';

describe('Error Classes', () => {
  describe('ValidationError', () => {
    it('should create validation error with field and value', () => {
      const error = new ValidationError(
        'Email is required',
        'email',
        undefined,
        'req-123'
      );

      expect(error.message).toBe('Email is required');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('email');
      expect(error.requestId).toBe('req-123');
      expect(error.shouldLog()).toBe(false);
      expect(error.getLogLevel()).toBe('warn');
    });

    it('should create from Joi error', () => {
      const joiError = {
        details: [
          {
            message: 'email must be a valid email',
            path: ['user', 'email'],
            context: { value: 'invalid-email' },
          },
        ],
      };

      const error = ValidationError.fromJoiError(joiError, 'req-456');

      expect(error.message).toBe('email must be a valid email');
      expect(error.field).toBe('user.email');
      expect(error.value).toBe('invalid-email');
      expect(error.requestId).toBe('req-456');
    });

    it('should convert to JSON', () => {
      const error = new ValidationError(
        'Test error',
        'field',
        'value',
        'req-789'
      );
      const json = error.toJSON();

      expect(json.error.code).toBe('VALIDATION_ERROR');
      expect(json.error.message).toBe('Test error');
      expect(json.error.requestId).toBe('req-789');
      expect(json.statusCode).toBe(400);
      expect(json.error.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('AuthenticationError', () => {
    it('should create invalid credentials error', () => {
      const error = AuthenticationError.invalidCredentials('req-123');

      expect(error.message).toBe('Invalid email or password');
      expect(error.code).toBe('AUTHENTICATION_ERROR');
      expect(error.statusCode).toBe(401);
      expect(error.reason).toBe('invalid_credentials');
    });

    it('should create token expired error', () => {
      const error = AuthenticationError.tokenExpired('req-456');

      expect(error.message).toBe('Authentication token has expired');
      expect(error.reason).toBe('token_expired');
    });

    it('should create token invalid error', () => {
      const error = AuthenticationError.tokenInvalid('req-789');

      expect(error.message).toBe('Invalid authentication token');
      expect(error.reason).toBe('token_invalid');
    });

    it('should create missing token error', () => {
      const error = AuthenticationError.missingToken('req-101');

      expect(error.message).toBe('Authentication token is required');
      expect(error.reason).toBe('missing_token');
    });
  });

  describe('AuthorizationError', () => {
    it('should create insufficient permissions error', () => {
      const error = AuthorizationError.insufficientPermissions(
        'admin.write',
        'user',
        'req-123'
      );

      expect(error.message).toBe(
        'Insufficient permissions to access this resource'
      );
      expect(error.requiredPermission).toBe('admin.write');
      expect(error.userRole).toBe('user');
      expect(error.statusCode).toBe(403);
    });

    it('should create AA tradition violation error', () => {
      const error = AuthorizationError.aaTraditionalViolation(6, 'req-456');

      expect(error.message).toBe('Action violates AA Tradition 6');
      expect(error.requiredPermission).toBe('tradition_6');
      expect(error.statusCode).toBe(403);
    });
  });

  describe('NotFoundError', () => {
    it('should create resource not found error', () => {
      const error = NotFoundError.resource('User', 'user-123', 'req-789');

      expect(error.message).toBe("User with ID 'user-123' not found");
      expect(error.resource).toBe('User');
      expect(error.resourceId).toBe('user-123');
      expect(error.statusCode).toBe(404);
    });

    it('should create generic resource not found error', () => {
      const error = NotFoundError.resource('Meeting', undefined, 'req-101');

      expect(error.message).toBe('Meeting not found');
      expect(error.resource).toBe('Meeting');
      expect(error.resourceId).toBeUndefined();
    });
  });

  describe('ConflictError', () => {
    it('should create duplicate resource error', () => {
      const error = ConflictError.duplicate(
        'User',
        'email@example.com',
        'req-123'
      );

      expect(error.message).toBe('User with email@example.com already exists');
      expect(error.conflictType).toBe('duplicate');
      expect(error.existingResource).toBe('User');
      expect(error.statusCode).toBe(409);
    });

    it('should create version mismatch error', () => {
      const error = ConflictError.versionMismatch(2, 1, 'req-456');

      expect(error.message).toBe('Version mismatch: expected 2, got 1');
      expect(error.conflictType).toBe('version_mismatch');
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit exceeded error', () => {
      const resetTime = new Date(Date.now() + 3600000); // 1 hour from now
      const error = RateLimitError.exceeded(100, resetTime, 'req-123');

      expect(error.message).toContain('Rate limit of 100 requests exceeded');
      expect(error.limit).toBe(100);
      expect(error.resetTime).toBe(resetTime);
      expect(error.retryAfter).toBeGreaterThan(0);
      expect(error.statusCode).toBe(429);
    });
  });

  describe('ExternalServiceError', () => {
    it('should create OpenAI error', () => {
      const originalError = new Error('OpenAI API timeout');
      const error = ExternalServiceError.openaiError(originalError, 'req-123');

      expect(error.message).toBe('OpenAI service is currently unavailable');
      expect(error.service).toBe('openai');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(502);
      expect(error.details).toBe('OpenAI API timeout');
    });

    it('should create Key Vault error', () => {
      const originalError = new Error('Key Vault access denied');
      const error = ExternalServiceError.keyVaultError(
        originalError,
        'req-456'
      );

      expect(error.message).toBe(
        'Azure Key Vault service is currently unavailable'
      );
      expect(error.service).toBe('key_vault');
      expect(error.originalError).toBe(originalError);
    });

    it('should create database error', () => {
      const originalError = new Error('Connection timeout');
      const error = ExternalServiceError.databaseError(
        originalError,
        'req-789'
      );

      expect(error.message).toBe('Database service is currently unavailable');
      expect(error.service).toBe('database');
    });

    it('should create Redis error', () => {
      const originalError = new Error('Redis connection failed');
      const error = ExternalServiceError.redisError(originalError, 'req-101');

      expect(error.message).toBe(
        'Redis cache service is currently unavailable'
      );
      expect(error.service).toBe('redis');
    });
  });

  describe('InternalServerError', () => {
    it('should create from error', () => {
      const originalError = new Error('Something went wrong');
      const error = InternalServerError.fromError(originalError, 'req-123');

      expect(error.message).toBe('An unexpected error occurred');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBe('Something went wrong');
      expect(error.shouldLog()).toBe(true);
      expect(error.getLogLevel()).toBe('error');
    });
  });

  describe('CrisisSupportError', () => {
    it('should create detection failed error', () => {
      const error = CrisisSupportError.detectionFailed('req-123');

      expect(error.message).toBe(
        'Crisis detection system is currently unavailable'
      );
      expect(error.crisisType).toBe('detection_failed');
      expect(error.emergencyContacts).toContain('988');
      expect(error.emergencyContacts).toContain('911');
      expect(error.shouldLog()).toBe(true);
      expect(error.getLogLevel()).toBe('error');
    });

    it('should create resource unavailable error', () => {
      const error = CrisisSupportError.resourceUnavailable('req-456');

      expect(error.message).toBe(
        'Crisis support resources are temporarily unavailable'
      );
      expect(error.crisisType).toBe('resource_unavailable');
      expect(error.emergencyContacts).toContain('988');
      expect(error.emergencyContacts).toContain('741741');
    });
  });

  describe('EncryptionError', () => {
    it('should create encryption failed error', () => {
      const error = EncryptionError.encryptionFailed(
        'Key derivation failed',
        'req-123'
      );

      expect(error.message).toBe('Failed to encrypt sensitive data');
      expect(error.operation).toBe('encrypt');
      expect(error.details).toBe('Key derivation failed');
      expect(error.shouldLog()).toBe(true);
      expect(error.getLogLevel()).toBe('error');
    });

    it('should create decryption failed error', () => {
      const error = EncryptionError.decryptionFailed(
        'Invalid password',
        'req-456'
      );

      expect(error.message).toBe('Failed to decrypt data');
      expect(error.operation).toBe('decrypt');
      expect(error.details).toBe('Invalid password');
    });

    it('should create key derivation failed error', () => {
      const error = EncryptionError.keyDerivationFailed(
        'Salt corrupted',
        'req-789'
      );

      expect(error.message).toBe('Failed to derive encryption key');
      expect(error.operation).toBe('key_derivation');
      expect(error.details).toBe('Salt corrupted');
    });
  });

  describe('ErrorFactory', () => {
    it('should create validation error', () => {
      const error = ErrorFactory.validation(
        'Invalid input',
        'email',
        'not-an-email',
        'req-123'
      );

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.field).toBe('email');
      expect(error.value).toBe('not-an-email');
    });

    it('should create authentication errors', () => {
      const invalidCreds = ErrorFactory.authentication(
        'invalid_credentials',
        'req-123'
      );
      expect(invalidCreds).toBeInstanceOf(AuthenticationError);
      expect(invalidCreds.reason).toBe('invalid_credentials');

      const tokenExpired = ErrorFactory.authentication(
        'token_expired',
        'req-456'
      );
      expect(tokenExpired.reason).toBe('token_expired');
    });

    it('should create external service error', () => {
      const originalError = new Error('Service down');
      const error = ErrorFactory.externalService(
        'payment-service',
        originalError,
        'req-123'
      );

      expect(error).toBeInstanceOf(ExternalServiceError);
      expect(error.service).toBe('payment-service');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('ErrorUtils', () => {
    it('should check if error is Digital Sponsor error', () => {
      const dsError = new ValidationError('Test');
      const regularError = new Error('Regular error');

      expect(ErrorUtils.isDigitalSponsorError(dsError)).toBe(true);
      expect(ErrorUtils.isDigitalSponsorError(regularError)).toBe(false);
    });

    it('should normalize errors', () => {
      const dsError = new ValidationError('Test');
      const regularError = new Error('Regular error');
      const stringError = 'String error';

      const normalized1 = ErrorUtils.normalize(dsError, 'req-123');
      expect(normalized1).toBe(dsError);

      const normalized2 = ErrorUtils.normalize(regularError, 'req-456');
      expect(normalized2).toBeInstanceOf(InternalServerError);
      expect(normalized2.message).toBe('Regular error');

      const normalized3 = ErrorUtils.normalize(stringError, 'req-789');
      expect(normalized3).toBeInstanceOf(InternalServerError);
      expect(normalized3.message).toBe('An unknown error occurred');
    });

    it('should extract error messages safely', () => {
      const error = new Error('Test error');
      const stringError = 'String error';
      const unknownError = { weird: 'object' };

      expect(ErrorUtils.getMessage(error)).toBe('Test error');
      expect(ErrorUtils.getMessage(stringError)).toBe('String error');
      expect(ErrorUtils.getMessage(unknownError)).toBe(
        'An unknown error occurred'
      );
    });

    it('should determine if error should be logged', () => {
      const clientError = new ValidationError('Test');
      const serverError = new InternalServerError('Test');
      const crisisError = new CrisisSupportError('Test', 'detection_failed');
      const unknownError = new Error('Unknown');

      expect(ErrorUtils.shouldLog(clientError)).toBe(false);
      expect(ErrorUtils.shouldLog(serverError)).toBe(true);
      expect(ErrorUtils.shouldLog(crisisError)).toBe(true);
      expect(ErrorUtils.shouldLog(unknownError)).toBe(true);
    });

    it('should determine appropriate log level', () => {
      const validationError = new ValidationError('Test');
      const authError = new AuthenticationError('Test', 'invalid_credentials');
      const serverError = new InternalServerError('Test');
      const unknownError = new Error('Unknown');

      expect(ErrorUtils.getLogLevel(validationError)).toBe('warn');
      expect(ErrorUtils.getLogLevel(authError)).toBe('warn');
      expect(ErrorUtils.getLogLevel(serverError)).toBe('error');
      expect(ErrorUtils.getLogLevel(unknownError)).toBe('error');
    });
  });
});
