/**
 * Authentication Service Configuration
 * Centralizes all configuration with environment variables and validation
 */

import dotenv from 'dotenv';
import Joi from 'joi';

// Load environment variables
dotenv.config();

// Configuration schema for validation
const configSchema = Joi.object({
  // Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),

  // Server
  PORT: Joi.number().default(3001),
  HOST: Joi.string().default('0.0.0.0'),

  // Azure AD B2C
  B2C_TENANT_NAME: Joi.string().required(),
  B2C_TENANT_DOMAIN: Joi.string().required(),
  B2C_CLIENT_ID: Joi.string().required(),
  B2C_CLIENT_SECRET: Joi.string().required(),
  B2C_POLICY_NAME: Joi.string().default('B2C_1_SignUpSignIn'),
  B2C_EDIT_PROFILE_POLICY: Joi.string().default('B2C_1_EditProfile'),
  B2C_PASSWORD_RESET_POLICY: Joi.string().default('B2C_1_PasswordReset'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  REFRESH_TOKEN_EXPIRES_IN: Joi.string().default('7d'),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  SESSION_PREFIX: Joi.string().default('auth:session:'),
  SESSION_TTL: Joi.number().default(3600),

  // Azure Key Vault
  KEY_VAULT_URL: Joi.string().optional(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // CORS
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // AA Traditions Compliance
  AA_ANONYMOUS_MODE_DEFAULT: Joi.boolean().default(true),
  AA_DATA_RETENTION_DEFAULT: Joi.string()
    .valid('session', '30days', '90days', 'never')
    .default('session'),
  AA_PII_LOGGING_ENABLED: Joi.boolean().default(false),
});

// Parse and validate configuration
const parseConfig = () => {
  // Convert string environment variables to appropriate types
  const envConfig = {
    ...process.env,
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    SESSION_TTL: process.env.SESSION_TTL
      ? Number(process.env.SESSION_TTL)
      : undefined,
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS
      ? Number(process.env.RATE_LIMIT_WINDOW_MS)
      : undefined,
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS
      ? Number(process.env.RATE_LIMIT_MAX_REQUESTS)
      : undefined,
    AA_ANONYMOUS_MODE_DEFAULT: process.env.AA_ANONYMOUS_MODE_DEFAULT === 'true',
    AA_PII_LOGGING_ENABLED: process.env.AA_PII_LOGGING_ENABLED === 'true',
  };

  const { error, value } = configSchema.validate(envConfig, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (error) {
    const missingFields = error.details
      .map(detail => detail.path.join('.'))
      .join(', ');
    throw new Error(
      `Configuration validation failed. Issues: ${error.details.map(d => d.message).join(', ')}`
    );
  }

  return value;
};

export const config = parseConfig();

// Derived configuration
export const derivedConfig = {
  isDevelopment: config.NODE_ENV === 'development',
  isProduction: config.NODE_ENV === 'production',
  isStaging: config.NODE_ENV === 'staging',

  // B2C URLs
  b2cAuthority: `https://${config.B2C_TENANT_DOMAIN}/${config.B2C_POLICY_NAME}`,
  b2cEditProfileAuthority: `https://${config.B2C_TENANT_DOMAIN}/${config.B2C_EDIT_PROFILE_POLICY}`,
  b2cPasswordResetAuthority: `https://${config.B2C_TENANT_DOMAIN}/${config.B2C_PASSWORD_RESET_POLICY}`,
  b2cJwksUri: `https://${config.B2C_TENANT_DOMAIN}/discovery/v2.0/keys?p=${config.B2C_POLICY_NAME}`,

  // Redis configuration
  redisConfig: {
    url: config.REDIS_URL,
    password: config.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
  },

  // CORS origins
  allowedOrigins: config.ALLOWED_ORIGINS.split(',').map((origin: string) =>
    origin.trim()
  ),

  // JWT configuration
  jwtConfig: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN,
    refreshExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'digital-sponsor-auth',
    audience: 'digital-sponsor-api',
  },

  // AA Traditions defaults
  aaDefaults: {
    anonymousMode: config.AA_ANONYMOUS_MODE_DEFAULT,
    dataRetention: config.AA_DATA_RETENTION_DEFAULT,
    piiLoggingEnabled: config.AA_PII_LOGGING_ENABLED,
  },
};

// Export types for TypeScript
export type Config = typeof config;
export type DerivedConfig = typeof derivedConfig;
