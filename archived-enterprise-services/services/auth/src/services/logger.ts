/**
 * Logger Service
 * Provides structured logging with AA Traditions compliance
 */

import winston from 'winston';
import { config, derivedConfig } from '../config';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

winston.addColors(logColors);

/**
 * Create a logger instance with the specified context
 */
export function createLogger(context: string): winston.Logger {
  const formats = [];

  // Add timestamp
  formats.push(winston.format.timestamp());

  // Add context
  formats.push(winston.format.label({ label: context }));

  // Handle errors
  formats.push(winston.format.errors({ stack: true }));

  // AA Traditions compliance: mask sensitive data
  formats.push(
    winston.format(info => {
      if (derivedConfig.aaDefaults.piiLoggingEnabled === false) {
        info = maskSensitiveData(info);
      }
      return info;
    })()
  );

  // Format based on environment
  if (derivedConfig.isDevelopment) {
    formats.push(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, label, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length
          ? JSON.stringify(meta, null, 2)
          : '';
        return `${timestamp} [${label}] ${level}: ${message} ${metaStr}`;
      })
    );
  } else {
    // Production: structured JSON logging
    formats.push(winston.format.json());
  }

  // Create the logger
  const logger = winston.createLogger({
    level: config.LOG_LEVEL,
    levels: logLevels,
    format: winston.format.combine(...formats),
    defaultMeta: {
      service: 'digital-sponsor-auth',
      environment: config.NODE_ENV,
    },
    transports: [
      new winston.transports.Console({
        handleExceptions: true,
        handleRejections: true,
      }),
    ],
    exitOnError: false,
  });

  return logger;
}

/**
 * Mask sensitive data in log entries for AA Tradition 11 compliance
 */
function maskSensitiveData(info: any): any {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
    /ssn/i,
    /social/i,
    /email/i, // Email can be identifying
    /phone/i,
    /address/i,
  ];

  const maskValue = (obj: any): any => {
    if (typeof obj === 'string') {
      // Check if the entire string looks like sensitive data
      for (const pattern of sensitivePatterns) {
        if (pattern.test(obj)) {
          return '[MASKED]';
        }
      }

      // Check for email patterns
      if (obj.includes('@') && obj.includes('.')) {
        return '[MASKED_EMAIL]';
      }

      // Check for phone patterns
      if (/\d{3}-?\d{3}-?\d{4}/.test(obj)) {
        return '[MASKED_PHONE]';
      }

      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(maskValue);
    }

    if (obj && typeof obj === 'object') {
      const masked: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Check if key name indicates sensitive data
        const isSensitiveKey = sensitivePatterns.some(pattern =>
          pattern.test(key)
        );

        if (isSensitiveKey) {
          masked[key] = '[MASKED]';
        } else {
          masked[key] = maskValue(value);
        }
      }
      return masked;
    }

    return obj;
  };

  return maskValue(info);
}

/**
 * Create logger for specific authentication events
 */
export class AuthLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = createLogger('AuthEvents');
  }

  /**
   * Log successful login
   */
  loginSuccess(
    userId: string,
    sessionId: string,
    metadata?: Record<string, any>
  ): void {
    this.logger.info('User login successful', {
      userId: userId.substring(0, 8) + '...', // Partial ID for privacy
      sessionId: sessionId.substring(0, 8) + '...',
      event: 'login_success',
      ...metadata,
    });
  }

  /**
   * Log failed login attempt
   */
  loginFailure(reason: string, metadata?: Record<string, any>): void {
    this.logger.warn('Login attempt failed', {
      event: 'login_failure',
      reason,
      ...metadata,
    });
  }

  /**
   * Log logout
   */
  logout(
    userId: string,
    sessionId: string,
    reason: 'user_request' | 'expired' | 'invalid' = 'user_request'
  ): void {
    this.logger.info('User logout', {
      userId: userId.substring(0, 8) + '...',
      sessionId: sessionId.substring(0, 8) + '...',
      event: 'logout',
      reason,
    });
  }

  /**
   * Log token refresh
   */
  tokenRefresh(userId: string, sessionId: string, success: boolean): void {
    this.logger.info('Token refresh', {
      userId: userId.substring(0, 8) + '...',
      sessionId: sessionId.substring(0, 8) + '...',
      event: 'token_refresh',
      success,
    });
  }

  /**
   * Log session validation
   */
  sessionValidation(sessionId: string, valid: boolean, reason?: string): void {
    this.logger.debug('Session validation', {
      sessionId: sessionId.substring(0, 8) + '...',
      event: 'session_validation',
      valid,
      reason,
    });
  }

  /**
   * Log security event
   */
  securityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high',
    details: Record<string, any>
  ): void {
    this.logger.warn('Security event detected', {
      event: 'security_event',
      securityEvent: event,
      severity,
      ...details,
    });
  }

  /**
   * Log rate limit hit
   */
  rateLimitHit(identifier: string, limit: number, windowMs: number): void {
    this.logger.warn('Rate limit exceeded', {
      event: 'rate_limit_exceeded',
      identifier: identifier.substring(0, 8) + '...',
      limit,
      windowMs,
    });
  }

  /**
   * Log AA Tradition compliance event
   */
  aaTraditionalCompliance(
    tradition: number,
    event: string,
    details?: Record<string, any>
  ): void {
    this.logger.info('AA Tradition compliance check', {
      event: 'aa_tradition_compliance',
      tradition,
      complianceEvent: event,
      ...details,
    });
  }

  /**
   * Log anonymous mode usage
   */
  anonymousModeUsage(enabled: boolean, sessionId: string): void {
    this.logger.info('Anonymous mode usage', {
      event: 'anonymous_mode',
      enabled,
      sessionId: sessionId.substring(0, 8) + '...',
      tradition: 11, // AA Tradition 11 - Anonymity
    });
  }

  /**
   * Log crisis support access
   */
  crisisSupportAccess(sessionId: string, consentGiven: boolean): void {
    this.logger.info('Crisis support access', {
      event: 'crisis_support_access',
      sessionId: sessionId.substring(0, 8) + '...',
      consentGiven,
    });
  }
}

// Export singleton instance
export const authLogger = new AuthLogger();

// Export default logger instance for general use
export const defaultLogger = createLogger('AuthService');
