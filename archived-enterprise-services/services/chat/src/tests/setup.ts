// Test setup for Digital Sponsor Chat Service

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables if not provided
if (!process.env.AZURE_OPENAI_ENDPOINT) {
  process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
}

if (!process.env.AZURE_OPENAI_API_KEY) {
  process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
}

if (!process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
  process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'test-deployment';
}

if (!process.env.LITERATURE_SERVICE_URL) {
  process.env.LITERATURE_SERVICE_URL = 'http://localhost:3002';
}

if (!process.env.COSMOS_CONNECTION_STRING) {
  process.env.COSMOS_CONNECTION_STRING =
    'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=test-key==;';
}

if (!process.env.COSMOS_DATABASE_NAME) {
  process.env.COSMOS_DATABASE_NAME = 'DigitalSponsorTest';
}

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Cleanup after all tests
afterAll(() => {
  // Any global cleanup
});
