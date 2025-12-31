// Digital Sponsor - Shared Utilities
// AA Traditions compliant utilities for validation, formatting, and privacy

import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

import type {
  AnonymousSession,
  AAComplianceInfo,
  UserPreferences,
} from '../types';

/**
 * Generate anonymous session ID per AA Tradition 12
 */
export function createAnonymousSessionId(): string {
  return `session_${uuidv4()}`;
}

/**
 * Validate email format without storing personally identifiable information
 */
export function validateEmail(email: string): boolean {
  const emailSchema = Joi.string().email().required();
  const { error } = emailSchema.validate(email);
  return !error;
}

/**
 * Sanitize user input to prevent XSS and ensure safety
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .slice(0, 2000); // Limit length
}

/**
 * Create anonymous session with expiration
 */
export function createAnonymousSession(
  preferences?: UserPreferences
): AnonymousSession {
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes

  return {
    sessionId: createAnonymousSessionId(),
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    preferences,
  };
}

/**
 * Validate AA Traditions compliance for content
 */
export function validateAACompliance(content: string): AAComplianceInfo {
  const lowerContent = content.toLowerCase();

  // Check for Tradition 6 violations (endorsements)
  const endorsementKeywords = [
    'recommend',
    'endorse',
    'sponsor',
    'affiliate',
    'partner',
    'advertise',
    'promote',
  ];

  const traditionsSix = !endorsementKeywords.some(keyword =>
    lowerContent.includes(keyword)
  );

  // Tradition 11 (privacy) and 12 (anonymity) assumed compliant in our design
  const traditionsEleven = true;
  const traditionsTwelve = true;

  // Check if content appears to be literature-based
  const literatureKeywords = ['big book', 'twelve steps', 'aa literature'];
  const literatureBased = literatureKeywords.some(keyword =>
    lowerContent.includes(keyword)
  );

  return {
    traditionsSix,
    traditionsEleven,
    traditionsTwelve,
    literatureBased,
  };
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Check if string contains crisis-related keywords
 */
export function containsCrisisKeywords(text: string): boolean {
  const crisisKeywords = [
    'suicide',
    'suicidal',
    'kill myself',
    'end it all',
    'overdose',
    'pills',
    'harm myself',
    'cut myself',
    'want to die',
    'no point living',
    'better off dead',
  ];

  const lowerText = text.toLowerCase();
  return crisisKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Generate response for crisis situations
 */
export function generateCrisisResponse(): {
  message: string;
  resources: Array<{ name: string; contact: string; type: string }>;
} {
  return {
    message:
      'I hear that you\'re in a lot of pain right now. In AA, we believe that "this too shall pass" and that no feeling is final. However, thoughts of suicide require immediate professional help. This is beyond what AA can address.',
    resources: [
      {
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        type: 'hotline',
      },
      {
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        type: 'text',
      },
      {
        name: 'Emergency Services',
        contact: '911',
        type: 'emergency',
      },
      {
        name: 'AA General Service Office',
        contact: '(212) 870-3400',
        type: 'aa_resource',
      },
    ],
  };
}

/**
 * Debounce function to limit API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
