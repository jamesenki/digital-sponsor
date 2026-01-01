/**
 * Request ID utilities for distributed tracing
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Request ID context for tracking across async operations
 */
export class RequestContext {
  private static context = new Map<string, string>();

  /**
   * Set request ID for current execution context
   */
  static setRequestId(requestId: string): void {
    const key = this.getContextKey();
    this.context.set(key, requestId);
  }

  /**
   * Get request ID for current execution context
   */
  static getRequestId(): string | undefined {
    const key = this.getContextKey();
    return this.context.get(key);
  }

  /**
   * Clear request ID for current execution context
   */
  static clearRequestId(): void {
    const key = this.getContextKey();
    this.context.delete(key);
  }

  /**
   * Execute function with request ID context
   */
  static async withRequestId<T>(
    requestId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const previousId = this.getRequestId();
    this.setRequestId(requestId);

    try {
      return await fn();
    } finally {
      if (previousId) {
        this.setRequestId(previousId);
      } else {
        this.clearRequestId();
      }
    }
  }

  /**
   * Get a context key (simplified version - in production you might use AsyncLocalStorage)
   */
  private static getContextKey(): string {
    // This is a simplified implementation
    // In production, you'd use Node.js AsyncLocalStorage or similar
    return 'current';
  }
}

/**
 * Request ID middleware helper
 */
export function createRequestIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] || generateRequestId();

    // Set request ID in context
    RequestContext.setRequestId(requestId);

    // Add to request object
    req.requestId = requestId;

    // Add to response headers
    res.setHeader('x-request-id', requestId);

    next();
  };
}
