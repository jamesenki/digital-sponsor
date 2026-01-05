/**
 * Joi Validation Schemas
 * Centralized validation for all Digital Sponsor data types
 */

import Joi from 'joi';

// Base validation patterns
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Chat Message Validation
 */
export const chatMessageSchema = Joi.object({
  id: Joi.string().pattern(uuidPattern).required(),
  userId: Joi.string().pattern(uuidPattern).optional(),
  message: Joi.string().min(1).max(4000).required(),
  timestamp: Joi.date().required(),
  type: Joi.string().valid('user', 'assistant').required(),
  sessionId: Joi.string().pattern(uuidPattern).required(),
  metadata: Joi.object().optional(),
});

/**
 * Chat Response Validation
 */
export const chatResponseSchema = Joi.object({
  message: Joi.string().min(1).max(4000).required(),
  type: Joi.string()
    .valid('literature_based', 'crisis_referral', 'out_of_scope', 'error')
    .required(),
  confidence: Joi.number().min(0).max(1).required(),
  sources: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().required(),
        content: Joi.string().required(),
        page: Joi.number().optional(),
        relevanceScore: Joi.number().min(0).max(1).required(),
        source: Joi.string().required(),
      })
    )
    .required(),
  compliance: Joi.object({
    isCompliant: Joi.boolean().required(),
    traditions: Joi.array().items(Joi.number().min(1).max(12)).required(),
    flags: Joi.array().items(Joi.string()).optional(),
    reviewRequired: Joi.boolean().required(),
  }).required(),
});

/**
 * Step Work Entry Validation
 */
export const stepWorkEntrySchema = Joi.object({
  id: Joi.string().pattern(uuidPattern).required(),
  userId: Joi.string().pattern(uuidPattern).required(),
  step: Joi.number().integer().min(1).max(12).required(),
  title: Joi.string().min(1).max(200).required(),
  content: Joi.string().min(1).max(50000).required(),
  isPrivate: Joi.boolean().required(),
  tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required(),
  version: Joi.number().integer().min(1).required(),
  encryptionInfo: Joi.object({
    isEncrypted: Joi.boolean().required(),
    algorithm: Joi.string().optional(),
    keyId: Joi.string().optional(),
  }).optional(),
});

/**
 * User Session Validation
 */
export const userSessionSchema = Joi.object({
  id: Joi.string().pattern(uuidPattern).required(),
  userId: Joi.string().pattern(uuidPattern).optional(),
  isAnonymous: Joi.boolean().required(),
  startTime: Joi.date().required(),
  lastActivity: Joi.date().required(),
  ipAddress: Joi.string().ip().optional(),
  userAgent: Joi.string().max(500).optional(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    fontSize: Joi.string().valid('small', 'medium', 'large').default('medium'),
    highContrast: Joi.boolean().default(false),
    reducedMotion: Joi.boolean().default(false),
    screenReader: Joi.boolean().default(false),
  }).optional(),
  metadata: Joi.object().optional(),
});

/**
 * Literature Search Validation
 */
export const literatureSearchSchema = Joi.object({
  query: Joi.string().min(3).max(500).required(),
  filters: Joi.object({
    source: Joi.array()
      .items(
        Joi.string().valid(
          'big_book',
          'twelve_and_twelve',
          'daily_reflections',
          'living_sober',
          'came_to_believe'
        )
      )
      .optional(),
    step: Joi.array().items(Joi.number().integer().min(1).max(12)).optional(),
    tradition: Joi.array()
      .items(Joi.number().integer().min(1).max(12))
      .optional(),
    concept: Joi.array()
      .items(Joi.number().integer().min(1).max(12))
      .optional(),
  }).optional(),
  limit: Joi.number().integer().min(1).max(50).default(20),
  offset: Joi.number().integer().min(0).default(0),
  includeContent: Joi.boolean().default(true),
});

/**
 * Crisis Support Request Validation
 */
export const crisisSupportRequestSchema = Joi.object({
  sessionId: Joi.string().pattern(uuidPattern).required(),
  type: Joi.string()
    .valid(
      'suicidal_thoughts',
      'substance_use',
      'mental_health_crisis',
      'domestic_violence',
      'general_emergency'
    )
    .required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
  location: Joi.object({
    country: Joi.string().length(2).optional(),
    state: Joi.string().max(50).optional(),
    city: Joi.string().max(100).optional(),
    zipCode: Joi.string().max(20).optional(),
  }).optional(),
  contactPreference: Joi.string()
    .valid('hotline', 'text', 'chat', 'emergency_services')
    .required(),
  timestamp: Joi.date().required(),
});

/**
 * Meeting Information Validation
 */
export const meetingSchema = Joi.object({
  id: Joi.string().pattern(uuidPattern).required(),
  name: Joi.string().min(1).max(200).required(),
  type: Joi.string()
    .valid(
      'open',
      'closed',
      'beginners',
      'womens',
      'mens',
      'young_people',
      'spanish',
      'online'
    )
    .required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).required(), // 0 = Sunday
  time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required(),
  duration: Joi.number().integer().min(30).max(180).default(60), // minutes
  location: Joi.object({
    name: Joi.string().max(200).required(),
    address: Joi.string().max(500).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(50).required(),
    zipCode: Joi.string().max(20).required(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).optional(),
  }).required(),
  contact: Joi.object({
    phone: Joi.string().max(20).optional(),
    email: Joi.string().pattern(emailPattern).optional(),
    website: Joi.string().uri().optional(),
  }).optional(),
  accessibility: Joi.object({
    wheelchairAccessible: Joi.boolean().default(false),
    assistiveListening: Joi.boolean().default(false),
    signLanguage: Joi.boolean().default(false),
  }).optional(),
  isActive: Joi.boolean().default(true),
});

/**
 * User Preferences Validation
 */
export const userPreferencesSchema = Joi.object({
  accessibility: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').default('system'),
    fontSize: Joi.string().valid('small', 'medium', 'large').default('medium'),
    highContrast: Joi.boolean().default(false),
    reducedMotion: Joi.boolean().default(false),
    screenReader: Joi.boolean().default(false),
    keyboardNavigation: Joi.boolean().default(false),
  }).required(),
  privacy: Joi.object({
    anonymousMode: Joi.boolean().default(true),
    dataRetention: Joi.string()
      .valid('session', '30days', '90days', 'never')
      .default('session'),
    shareProgress: Joi.boolean().default(false),
    allowAnalytics: Joi.boolean().default(false),
  }).required(),
  notifications: Joi.object({
    meetingReminders: Joi.boolean().default(false),
    dailyReflection: Joi.boolean().default(false),
    stepWorkPrompts: Joi.boolean().default(false),
    crisisAlerts: Joi.boolean().default(true),
  }).optional(),
  stepWork: Joi.object({
    autoSave: Joi.boolean().default(true),
    encryptionEnabled: Joi.boolean().default(true),
    backupEnabled: Joi.boolean().default(false),
    reminderFrequency: Joi.string()
      .valid('none', 'daily', 'weekly')
      .default('none'),
  }).optional(),
});

/**
 * AA Compliance Information Validation
 */
export const aaComplianceSchema = Joi.object({
  isCompliant: Joi.boolean().required(),
  traditions: Joi.array()
    .items(Joi.number().integer().min(1).max(12))
    .required(),
  flags: Joi.array()
    .items(
      Joi.string().valid(
        'endorsement_risk',
        'outside_issue',
        'anonymity_breach',
        'tradition_violation',
        'professional_advice'
      )
    )
    .optional(),
  reviewRequired: Joi.boolean().required(),
  notes: Joi.string().max(1000).optional(),
});

/**
 * Encrypted Data Validation
 */
export const encryptedDataSchema = Joi.object({
  data: Joi.string().base64().required(),
  iv: Joi.string().base64().required(),
  salt: Joi.string().base64().required(),
  algorithm: Joi.string().valid('AES-GCM-PBKDF2').required(),
});

/**
 * API Error Response Validation
 */
export const apiErrorResponseSchema = Joi.object({
  error: Joi.object({
    code: Joi.string().required(),
    message: Joi.string().required(),
    details: Joi.string().optional(),
    timestamp: Joi.date().required(),
    requestId: Joi.string().pattern(uuidPattern).required(),
  }).required(),
  statusCode: Joi.number().integer().min(400).max(599).required(),
});

/**
 * Health Check Response Validation
 */
export const healthCheckSchema = Joi.object({
  status: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
  timestamp: Joi.date().required(),
  version: Joi.string().required(),
  services: Joi.object({
    database: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    redis: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    keyVault: Joi.string().valid('healthy', 'degraded', 'unhealthy').required(),
    openai: Joi.string().valid('healthy', 'degraded', 'unhealthy').optional(),
  }).required(),
  metrics: Joi.object({
    uptime: Joi.number().positive().required(),
    memoryUsage: Joi.number().min(0).max(100).required(),
    cpuUsage: Joi.number().min(0).max(100).required(),
    requestCount: Joi.number().integer().min(0).required(),
    errorRate: Joi.number().min(0).max(100).required(),
  }).optional(),
});

/**
 * Validation utility functions
 */
export const validate = {
  chatMessage: (data: unknown) => chatMessageSchema.validate(data),
  chatResponse: (data: unknown) => chatResponseSchema.validate(data),
  stepWorkEntry: (data: unknown) => stepWorkEntrySchema.validate(data),
  userSession: (data: unknown) => userSessionSchema.validate(data),
  literatureSearch: (data: unknown) => literatureSearchSchema.validate(data),
  crisisSupportRequest: (data: unknown) =>
    crisisSupportRequestSchema.validate(data),
  meeting: (data: unknown) => meetingSchema.validate(data),
  userPreferences: (data: unknown) => userPreferencesSchema.validate(data),
  aaCompliance: (data: unknown) => aaComplianceSchema.validate(data),
  encryptedData: (data: unknown) => encryptedDataSchema.validate(data),
  apiErrorResponse: (data: unknown) => apiErrorResponseSchema.validate(data),
  healthCheck: (data: unknown) => healthCheckSchema.validate(data),
};

/**
 * Authentication Request Validation
 */
export const authLoginSchema = Joi.object({
  b2cToken: Joi.string().required(),
});

/**
 * Session Preferences Validation
 */
export const sessionPreferencesSchema = Joi.object({
  anonymousMode: Joi.boolean().optional(),
  preferredName: Joi.string().max(50).optional(),
  dataRetentionChoice: Joi.string()
    .valid('session', '30days', '90days', 'never')
    .optional(),
});

/**
 * Validation utility functions (additional)
 */
export const validateAuth = {
  authLogin: (data: unknown) => authLoginSchema.validate(data),
  sessionPreferences: (data: unknown) =>
    sessionPreferencesSchema.validate(data),
};

// Extend existing validate object
Object.assign(validate, validateAuth);

/**
 * Validation middleware helper
 */
export function createValidationMiddleware(schema: Joi.ObjectSchema) {
  return (data: unknown) => {
    const result = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (result.error) {
      throw new Error(
        `Validation failed: ${result.error.details.map(d => d.message).join(', ')}`
      );
    }

    return result.value;
  };
}
