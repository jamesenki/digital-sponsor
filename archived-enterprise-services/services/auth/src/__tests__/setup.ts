/**
 * Test Setup
 * Configures the test environment for the authentication service
 */

import { redisClient } from '../services/redis-client';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for testing
process.env.B2C_TENANT_NAME = 'test-tenant';
process.env.B2C_TENANT_DOMAIN = 'test-tenant.onmicrosoft.com';
process.env.B2C_CLIENT_ID = 'test-client-id';
process.env.B2C_CLIENT_SECRET = 'test-client-secret';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Mock Redis for tests
jest.mock('../services/redis-client', () => {
  const mockRedisData = new Map<string, string>();

  return {
    redisClient: {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isClientConnected: jest.fn().mockReturnValue(true),
      getClient: jest.fn(),
      setSession: jest
        .fn()
        .mockImplementation((sessionId: string, data: any, ttl: number) => {
          mockRedisData.set(`auth:session:${sessionId}`, JSON.stringify(data));
          return Promise.resolve();
        }),
      getSession: jest.fn().mockImplementation((sessionId: string) => {
        const data = mockRedisData.get(`auth:session:${sessionId}`);
        return Promise.resolve(data ? JSON.parse(data) : null);
      }),
      deleteSession: jest.fn().mockImplementation((sessionId: string) => {
        const existed = mockRedisData.has(`auth:session:${sessionId}`);
        mockRedisData.delete(`auth:session:${sessionId}`);
        return Promise.resolve(existed);
      }),
      deleteUserSessions: jest.fn().mockResolvedValue(1),
      extendSession: jest.fn().mockResolvedValue(true),
      getUserSessions: jest.fn().mockResolvedValue(['session-1']),
      setRateLimit: jest.fn().mockResolvedValue(undefined),
      getRateLimit: jest.fn().mockResolvedValue(null),
      incrementRateLimit: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue(true),
    },
  };
});

// Mock winston logger
jest.mock('../services/logger', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  })),
  defaultLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  },
}));

// Mock Azure JWKS client
jest.mock('jwks-client', () => {
  return jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: () => 'mock-public-key',
    }),
  }));
});

// Mock UUID generation for deterministic tests
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
}));

// Setup test database state
beforeEach(() => {
  // Clear mock data
  jest.clearAllMocks();

  // Reset Redis mock data
  const mockRedisData = new Map<string, string>();
});

afterEach(() => {
  jest.resetAllMocks();
});

afterAll(async () => {
  // Clean up any real connections if they exist
  try {
    await redisClient.disconnect();
  } catch {
    // Ignore cleanup errors
  }
});
