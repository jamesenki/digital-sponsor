/**
 * Centralized logging utilities
 * Provides structured logging with request tracing and security considerations
 */

import { ErrorUtils } from '../errors/error-classes';

import { RequestContext } from './request-id';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  requestId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStructuredLogging: boolean;
  maskSensitiveData: boolean;
  includeStackTrace: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  enableConsole: true,
  enableStructuredLogging: true,
  maskSensitiveData: true,
  includeStackTrace: false,
};

/**
 * Sensitive field patterns to mask in logs
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /auth/i,
  /credential/i,
  /private/i,
  /ssn/i,
  /social/i,
];

/**
 * Digital Sponsor Logger
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context);
  }

  /**
   * Log error message
   */
  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ): void {
    const errorInfo = error ? this.formatError(error) : undefined;
    this.log('error', message, context, errorInfo);
  }

  /**
   * Log with specific level
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: { name: string; message: string; stack?: string; code?: string }
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      requestId: RequestContext.getRequestId(),
      context: this.config.maskSensitiveData
        ? this.maskSensitiveFields(context)
        : context,
      error,
    };

    this.writeLog(entry);
  }

  /**
   * Check if message should be logged based on current level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    return levels[level] >= levels[this.config.level];
  }

  /**
   * Format error for logging
   */
  private formatError(error: Error | unknown): {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  } {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined,
        code: (error as any).code,
      };
    }

    return {
      name: 'Unknown',
      message: ErrorUtils.getMessage(error),
      stack: undefined,
      code: undefined,
    };
  }

  /**
   * Mask sensitive fields in objects
   */
  private maskSensitiveFields(
    obj: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    if (!obj || !this.config.maskSensitiveData) {
      return obj;
    }

    const masked = { ...obj };

    for (const [key, value] of Object.entries(masked)) {
      if (this.isSensitiveField(key)) {
        masked[key] = '[MASKED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        masked[key] = this.maskSensitiveFields(
          value as Record<string, unknown>
        );
      }
    }

    return masked;
  }

  /**
   * Check if field name indicates sensitive data
   */
  private isSensitiveField(fieldName: string): boolean {
    return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
  }

  /**
   * Write log entry to configured outputs
   */
  private writeLog(entry: LogEntry): void {
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    if (this.config.enableStructuredLogging) {
      this.writeStructuredLog(entry);
    }
  }

  /**
   * Write to console
   */
  private writeToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const requestId = entry.requestId ? ` [${entry.requestId}]` : '';
    const level = entry.level.toUpperCase().padEnd(5);

    let logMessage = `${timestamp} ${level}${requestId} ${entry.message}`;

    if (entry.context) {
      logMessage += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      logMessage += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        logMessage += `\n  Stack: ${entry.error.stack}`;
      }
    }

    // Use appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  /**
   * Write structured log (JSON format)
   */
  private writeStructuredLog(entry: LogEntry): void {
    // In production, this would write to Application Insights or other log aggregation service
    // For now, we'll just output structured JSON
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize global logger
 */
export function initializeLogger(config: Partial<LoggerConfig> = {}): void {
  globalLogger = new Logger(config);
}

/**
 * Get global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    globalLogger = new Logger();
  }
  return globalLogger;
}

/**
 * Convenience logging functions using global logger
 */
export const log = {
  debug: (message: string, context?: Record<string, unknown>) =>
    getLogger().debug(message, context),

  info: (message: string, context?: Record<string, unknown>) =>
    getLogger().info(message, context),

  warn: (message: string, context?: Record<string, unknown>) =>
    getLogger().warn(message, context),

  error: (
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>
  ) => getLogger().error(message, error, context),
};

/**
 * Logger middleware for Express
 */
export function createLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent');
    const ip = req.ip || req.connection.remoteAddress;

    // Log request
    log.info('Incoming request', {
      method,
      url,
      userAgent: userAgent?.substring(0, 100), // Truncate long user agents
      ip: ip?.replace(/:\d+$/, ''), // Remove port from IP
      requestId: req.requestId,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding: any) {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;

      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      const logger = getLogger();
      logger.log(logLevel, 'Request completed', {
        method,
        url,
        statusCode,
        duration: `${duration}ms`,
        requestId: req.requestId,
      });

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}

/**
 * AA Traditions compliance logger
 */
export const aaLogger = {
  /**
   * Log potential AA Tradition violation
   */
  traditionViolation: (
    tradition: number,
    description: string,
    context?: Record<string, unknown>
  ) => {
    log.warn(`Potential AA Tradition ${tradition} violation`, {
      tradition,
      description,
      ...context,
    });
  },

  /**
   * Log anonymity concern
   */
  anonymityConcern: (
    description: string,
    context?: Record<string, unknown>
  ) => {
    log.warn('Anonymity concern detected', {
      description,
      tradition: 11, // Tradition 11 deals with anonymity
      ...context,
    });
  },

  /**
   * Log endorsement concern
   */
  endorsementConcern: (
    description: string,
    context?: Record<string, unknown>
  ) => {
    log.warn('Potential endorsement detected', {
      description,
      tradition: 6, // Tradition 6 deals with endorsement
      ...context,
    });
  },
};

/**
 * Security event logger
 */
export const securityLogger = {
  /**
   * Log authentication failure
   */
  authFailure: (reason: string, context?: Record<string, unknown>) => {
    log.warn('Authentication failure', {
      reason,
      eventType: 'auth_failure',
      ...context,
    });
  },

  /**
   * Log authorization failure
   */
  authzFailure: (
    resource: string,
    action: string,
    context?: Record<string, unknown>
  ) => {
    log.warn('Authorization failure', {
      resource,
      action,
      eventType: 'authz_failure',
      ...context,
    });
  },

  /**
   * Log suspicious activity
   */
  suspiciousActivity: (
    description: string,
    context?: Record<string, unknown>
  ) => {
    log.error('Suspicious activity detected', {
      description,
      eventType: 'suspicious_activity',
      ...context,
    });
  },

  /**
   * Log data access
   */
  dataAccess: (
    resource: string,
    operation: string,
    context?: Record<string, unknown>
  ) => {
    log.info('Data access', {
      resource,
      operation,
      eventType: 'data_access',
      ...context,
    });
  },
};
