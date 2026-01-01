/**
 * Custom Error Classes
 * Standardized error handling for Digital Sponsor application
 */

/**
 * Base Digital Sponsor Error
 */
export abstract class DigitalSponsorError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly details?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    details?: string,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.details = details;
    this.requestId = requestId;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture stack trace if available
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        requestId: this.requestId,
      },
      statusCode: this.statusCode,
    };
  }

  /**
   * Check if error should be logged
   */
  shouldLog(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Get log level for this error
   */
  getLogLevel(): 'error' | 'warn' | 'info' {
    if (this.statusCode >= 500) {
      return 'error';
    }
    if (this.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends DigitalSponsorError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    requestId?: string
  ) {
    super(message, 'VALIDATION_ERROR', 400, undefined, requestId);
    this.field = field;
    this.value = value;
  }

  static fromJoiError(joiError: any, requestId?: string): ValidationError {
    const firstError = joiError.details?.[0];
    const field = firstError?.path?.join('.');
    const value = firstError?.context?.value;
    const message = firstError?.message || 'Validation failed';

    return new ValidationError(message, field, value, requestId);
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends DigitalSponsorError {
  public readonly reason:
    | 'invalid_credentials'
    | 'token_expired'
    | 'token_invalid'
    | 'missing_token';

  constructor(
    message: string,
    reason:
      | 'invalid_credentials'
      | 'token_expired'
      | 'token_invalid'
      | 'missing_token',
    requestId?: string
  ) {
    super(message, 'AUTHENTICATION_ERROR', 401, undefined, requestId);
    this.reason = reason;
  }

  static invalidCredentials(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      'Invalid email or password',
      'invalid_credentials',
      requestId
    );
  }

  static tokenExpired(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      'Authentication token has expired',
      'token_expired',
      requestId
    );
  }

  static tokenInvalid(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      'Invalid authentication token',
      'token_invalid',
      requestId
    );
  }

  static missingToken(requestId?: string): AuthenticationError {
    return new AuthenticationError(
      'Authentication token is required',
      'missing_token',
      requestId
    );
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends DigitalSponsorError {
  public readonly requiredPermission?: string;
  public readonly userRole?: string;

  constructor(
    message: string,
    requiredPermission?: string,
    userRole?: string,
    requestId?: string
  ) {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, requestId);
    this.requiredPermission = requiredPermission;
    this.userRole = userRole;
  }

  static insufficientPermissions(
    requiredPermission: string,
    userRole?: string,
    requestId?: string
  ): AuthorizationError {
    return new AuthorizationError(
      'Insufficient permissions to access this resource',
      requiredPermission,
      userRole,
      requestId
    );
  }

  static aaTraditionalViolation(
    tradition: number,
    requestId?: string
  ): AuthorizationError {
    return new AuthorizationError(
      `Action violates AA Tradition ${tradition}`,
      `tradition_${tradition}`,
      undefined,
      requestId
    );
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends DigitalSponsorError {
  public readonly resource: string;
  public readonly resourceId?: string;

  constructor(
    message: string,
    resource: string,
    resourceId?: string,
    requestId?: string
  ) {
    super(message, 'NOT_FOUND_ERROR', 404, undefined, requestId);
    this.resource = resource;
    this.resourceId = resourceId;
  }

  static resource(
    resource: string,
    resourceId?: string,
    requestId?: string
  ): NotFoundError {
    const message = resourceId
      ? `${resource} with ID '${resourceId}' not found`
      : `${resource} not found`;

    return new NotFoundError(message, resource, resourceId, requestId);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends DigitalSponsorError {
  public readonly conflictType:
    | 'duplicate'
    | 'version_mismatch'
    | 'state_conflict';
  public readonly existingResource?: string;

  constructor(
    message: string,
    conflictType: 'duplicate' | 'version_mismatch' | 'state_conflict',
    existingResource?: string,
    requestId?: string
  ) {
    super(message, 'CONFLICT_ERROR', 409, undefined, requestId);
    this.conflictType = conflictType;
    this.existingResource = existingResource;
  }

  static duplicate(
    resource: string,
    identifier: string,
    requestId?: string
  ): ConflictError {
    return new ConflictError(
      `${resource} with ${identifier} already exists`,
      'duplicate',
      resource,
      requestId
    );
  }

  static versionMismatch(
    expected: number,
    actual: number,
    requestId?: string
  ): ConflictError {
    return new ConflictError(
      `Version mismatch: expected ${expected}, got ${actual}`,
      'version_mismatch',
      undefined,
      requestId
    );
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends DigitalSponsorError {
  public readonly limit: number;
  public readonly resetTime: Date;
  public readonly retryAfter: number;

  constructor(
    message: string,
    limit: number,
    resetTime: Date,
    retryAfter: number,
    requestId?: string
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, undefined, requestId);
    this.limit = limit;
    this.resetTime = resetTime;
    this.retryAfter = retryAfter;
  }

  static exceeded(
    limit: number,
    resetTime: Date,
    requestId?: string
  ): RateLimitError {
    const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    return new RateLimitError(
      `Rate limit of ${limit} requests exceeded. Try again in ${retryAfter} seconds.`,
      limit,
      resetTime,
      retryAfter,
      requestId
    );
  }
}

/**
 * External Service Error (502)
 */
export class ExternalServiceError extends DigitalSponsorError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    service: string,
    originalError?: Error,
    requestId?: string
  ) {
    super(
      message,
      'EXTERNAL_SERVICE_ERROR',
      502,
      originalError?.message,
      requestId
    );
    this.service = service;
    this.originalError = originalError;
  }

  static openaiError(error: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      'OpenAI service is currently unavailable',
      'openai',
      error,
      requestId
    );
  }

  static keyVaultError(error: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      'Azure Key Vault service is currently unavailable',
      'key_vault',
      error,
      requestId
    );
  }

  static databaseError(error: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      'Database service is currently unavailable',
      'database',
      error,
      requestId
    );
  }

  static redisError(error: Error, requestId?: string): ExternalServiceError {
    return new ExternalServiceError(
      'Redis cache service is currently unavailable',
      'redis',
      error,
      requestId
    );
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalServerError extends DigitalSponsorError {
  public readonly originalError?: Error;

  constructor(
    message: string = 'An unexpected error occurred',
    originalError?: Error,
    requestId?: string
  ) {
    super(
      message,
      'INTERNAL_SERVER_ERROR',
      500,
      originalError?.message,
      requestId
    );
    this.originalError = originalError;
  }

  static fromError(error: Error, requestId?: string): InternalServerError {
    return new InternalServerError(
      'An unexpected error occurred',
      error,
      requestId
    );
  }
}

/**
 * Crisis Support Error (500) - Special handling for crisis situations
 */
export class CrisisSupportError extends DigitalSponsorError {
  public readonly crisisType:
    | 'detection_failed'
    | 'resource_unavailable'
    | 'emergency_routing';
  public readonly emergencyContacts: string[];

  constructor(
    message: string,
    crisisType:
      | 'detection_failed'
      | 'resource_unavailable'
      | 'emergency_routing',
    emergencyContacts: string[] = ['988', '911'],
    requestId?: string
  ) {
    super(message, 'CRISIS_SUPPORT_ERROR', 500, undefined, requestId);
    this.crisisType = crisisType;
    this.emergencyContacts = emergencyContacts;
  }

  static detectionFailed(requestId?: string): CrisisSupportError {
    return new CrisisSupportError(
      'Crisis detection system is currently unavailable',
      'detection_failed',
      ['988', '911'],
      requestId
    );
  }

  static resourceUnavailable(requestId?: string): CrisisSupportError {
    return new CrisisSupportError(
      'Crisis support resources are temporarily unavailable',
      'resource_unavailable',
      ['988', '741741', '911'],
      requestId
    );
  }

  shouldLog(): boolean {
    return true; // Always log crisis-related errors
  }

  getLogLevel(): 'error' | 'warn' | 'info' {
    return 'error'; // Always log as error for crisis situations
  }
}

/**
 * Encryption Error (500)
 */
export class EncryptionError extends DigitalSponsorError {
  public readonly operation:
    | 'encrypt'
    | 'decrypt'
    | 'key_derivation'
    | 'key_rotation';

  constructor(
    message: string,
    operation: 'encrypt' | 'decrypt' | 'key_derivation' | 'key_rotation',
    details?: string,
    requestId?: string
  ) {
    super(message, 'ENCRYPTION_ERROR', 500, details, requestId);
    this.operation = operation;
  }

  static encryptionFailed(
    details?: string,
    requestId?: string
  ): EncryptionError {
    return new EncryptionError(
      'Failed to encrypt sensitive data',
      'encrypt',
      details,
      requestId
    );
  }

  static decryptionFailed(
    details?: string,
    requestId?: string
  ): EncryptionError {
    return new EncryptionError(
      'Failed to decrypt data',
      'decrypt',
      details,
      requestId
    );
  }

  static keyDerivationFailed(
    details?: string,
    requestId?: string
  ): EncryptionError {
    return new EncryptionError(
      'Failed to derive encryption key',
      'key_derivation',
      details,
      requestId
    );
  }

  shouldLog(): boolean {
    return true; // Always log encryption errors for security monitoring
  }
}

/**
 * Error Factory for creating specific error types
 */
export class ErrorFactory {
  static validation(
    message: string,
    field?: string,
    value?: unknown,
    requestId?: string
  ): ValidationError {
    return new ValidationError(message, field, value, requestId);
  }

  static authentication(
    reason:
      | 'invalid_credentials'
      | 'token_expired'
      | 'token_invalid'
      | 'missing_token',
    requestId?: string
  ): AuthenticationError {
    switch (reason) {
      case 'invalid_credentials':
        return AuthenticationError.invalidCredentials(requestId);
      case 'token_expired':
        return AuthenticationError.tokenExpired(requestId);
      case 'token_invalid':
        return AuthenticationError.tokenInvalid(requestId);
      case 'missing_token':
        return AuthenticationError.missingToken(requestId);
    }
  }

  static authorization(
    requiredPermission: string,
    userRole?: string,
    requestId?: string
  ): AuthorizationError {
    return AuthorizationError.insufficientPermissions(
      requiredPermission,
      userRole,
      requestId
    );
  }

  static notFound(
    resource: string,
    resourceId?: string,
    requestId?: string
  ): NotFoundError {
    return NotFoundError.resource(resource, resourceId, requestId);
  }

  static conflict(
    type: 'duplicate' | 'version_mismatch' | 'state_conflict',
    message: string,
    requestId?: string
  ): ConflictError {
    return new ConflictError(message, type, undefined, requestId);
  }

  static rateLimit(
    limit: number,
    resetTime: Date,
    requestId?: string
  ): RateLimitError {
    return RateLimitError.exceeded(limit, resetTime, requestId);
  }

  static externalService(
    service: string,
    error: Error,
    requestId?: string
  ): ExternalServiceError {
    return new ExternalServiceError(
      `${service} service error`,
      service,
      error,
      requestId
    );
  }

  static internal(error?: Error, requestId?: string): InternalServerError {
    return error
      ? InternalServerError.fromError(error, requestId)
      : new InternalServerError(
          'An unexpected error occurred',
          undefined,
          requestId
        );
  }

  static crisis(
    type: 'detection_failed' | 'resource_unavailable' | 'emergency_routing',
    requestId?: string
  ): CrisisSupportError {
    switch (type) {
      case 'detection_failed':
        return CrisisSupportError.detectionFailed(requestId);
      case 'resource_unavailable':
        return CrisisSupportError.resourceUnavailable(requestId);
      default:
        return new CrisisSupportError(
          'Crisis support system error',
          type,
          ['988', '911'],
          requestId
        );
    }
  }

  static encryption(
    operation: 'encrypt' | 'decrypt' | 'key_derivation' | 'key_rotation',
    details?: string,
    requestId?: string
  ): EncryptionError {
    return new EncryptionError(
      `Encryption ${operation} failed`,
      operation,
      details,
      requestId
    );
  }
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
  /**
   * Check if error is a Digital Sponsor error
   */
  isDigitalSponsorError(error: unknown): error is DigitalSponsorError {
    return error instanceof DigitalSponsorError;
  },

  /**
   * Convert any error to a Digital Sponsor error
   */
  normalize(error: unknown, requestId?: string): DigitalSponsorError {
    if (error instanceof DigitalSponsorError) {
      return error;
    }

    if (error instanceof Error) {
      return new InternalServerError(error.message, error, requestId);
    }

    return new InternalServerError(
      'An unknown error occurred',
      undefined,
      requestId
    );
  },

  /**
   * Extract error message safely
   */
  getMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'An unknown error occurred';
  },

  /**
   * Check if error should be logged
   */
  shouldLog(error: unknown): boolean {
    if (error instanceof DigitalSponsorError) {
      return error.shouldLog();
    }

    return true; // Log unknown errors
  },

  /**
   * Get appropriate log level for error
   */
  getLogLevel(error: unknown): 'error' | 'warn' | 'info' {
    if (error instanceof DigitalSponsorError) {
      return error.getLogLevel();
    }

    return 'error'; // Default to error level for unknown errors
  },
};
