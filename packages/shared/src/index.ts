// Digital Sponsor Shared Package
// Exports types, utilities, and constants for the entire application

// Core modules
export * from './types';
export * from './utils';
export * from './constants';

// Database and search (explicit exports to avoid conflicts)
export type {
  LiteratureDocument,
  UserSessionDocument,
  StepWorkDocument,
  CrisisEventDocument,
  AnalyticsDocument,
  MigrationDocument,
  BaseDocument,
} from './types/database';
export { COSMOS_DB_CONFIG } from './types/database';
export {
  DatabaseClient,
  LiteratureRepository,
  SessionRepository,
  DatabaseError,
  createDatabaseClient,
  createLiteratureRepository,
  createSessionRepository,
} from './utils/database';
export {
  MigrationManager,
  createMigrationContext,
  INITIAL_MIGRATIONS,
} from './utils/migrations';

// Security and configuration
export * from './services/secure-config-manager';
export * from './utils/encryption';

// Validation and error handling
export * from './validation/schemas';
export * from './errors/error-classes';

// Utilities
export * from './utils/request-id';
export * from './utils/logger';
export * from './utils/msal-config';
