/**
 * Jest test setup file
 * Configures global test environment and mocks
 */

/* eslint-disable no-undef */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REACT_APP_B2C_CLIENT_ID = 'test-client-id';

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Suppress debug logs in tests
  debug: jest.fn(),
  // Keep error and warn for debugging failing tests
  log: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Mock localStorage for MSAL tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock Date for consistent testing
const originalDate = Date;

// Helper to set a fixed date for testing
export const setFixedDate = (dateString: string) => {
  const fixedDate = new Date(dateString);
  global.Date = jest
    .fn()
    .mockImplementation((date?: string | number | Date) => {
      return date ? new originalDate(date) : fixedDate;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
  global.Date.now = jest.fn(() => fixedDate.getTime());
};

// Helper to restore original Date
export const restoreDate = () => {
  global.Date = originalDate;
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  restoreDate();
});
