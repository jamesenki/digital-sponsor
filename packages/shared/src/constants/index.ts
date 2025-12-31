// Digital Sponsor - Application Constants
// AA Traditions compliant constants and configuration

export const APP_CONFIG = {
  NAME: 'Digital Sponsor',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI-powered AA literature companion',
} as const;

export const API_CONFIG = {
  VERSION: 'v1',
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },
} as const;

export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_CONTEXT_LENGTH: 10,
  RESPONSE_TIMEOUT_MS: 30000,
  TYPING_INDICATOR_DELAY_MS: 1000,
} as const;

export const CRISIS_CONFIG = {
  KEYWORDS: [
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
  ],
  RESPONSE_TIMEOUT_MS: 1000,
  CONFIDENCE_THRESHOLD: 0.7,
} as const;

export const STEP_WORK_CONFIG = {
  TOTAL_STEPS: 12,
  AUTO_SAVE_INTERVAL_MS: 30000, // 30 seconds
  ENCRYPTION_ALGORITHM: 'AES-256-GCM',
  MAX_VERSIONS_PER_STEP: 50,
} as const;

export const LITERATURE_SOURCES = {
  BIG_BOOK: 'big_book',
  TWELVE_AND_TWELVE: 'twelve_and_twelve',
  DAILY_REFLECTIONS: 'daily_reflections',
  PAMPHLETS: 'pamphlets',
} as const;

export const SESSION_CONFIG = {
  DURATION_MS: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  WARNING_BEFORE_EXPIRY_MS: 5 * 60 * 1000, // 5 minutes warning
} as const;

export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    lowercase: true,
    uppercase: true,
    numbers: true,
    symbols: true,
  },
  SESSION_TOKEN_LENGTH: 32,
  CSRF_TOKEN_LENGTH: 16,
} as const;

export const AA_TRADITIONS = {
  TRADITION_6: 'No endorsements of outside enterprises',
  TRADITION_7: 'Self-supporting through contributions',
  TRADITION_11: 'Privacy and attraction rather than promotion',
  TRADITION_12: 'Complete anonymity at the public level',
} as const;

export const EMERGENCY_RESOURCES = {
  SUICIDE_LIFELINE: {
    name: 'National Suicide Prevention Lifeline',
    contact: '988',
    type: 'hotline',
    available24h: true,
  },
  CRISIS_TEXT: {
    name: 'Crisis Text Line',
    contact: 'Text HOME to 741741',
    type: 'text',
    available24h: true,
  },
  EMERGENCY: {
    name: 'Emergency Services',
    contact: '911',
    type: 'emergency',
    available24h: true,
  },
  AA_GSO: {
    name: 'AA General Service Office',
    contact: '(212) 870-3400',
    type: 'aa_resource',
    available24h: false,
  },
} as const;

export const ACCESSIBILITY_CONFIG = {
  MIN_CONTRAST_RATIO: 4.5,
  MIN_TOUCH_TARGET_SIZE: 44, // pixels
  FONT_SIZES: {
    small: '14px',
    medium: '16px',
    large: '20px',
    xl: '24px',
  },
  ANIMATION_DURATION: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
} as const;

export const PWA_CONFIG = {
  CACHE_VERSION: 'v1',
  CACHE_STRATEGIES: {
    STATIC: 'cache-first',
    API: 'network-first',
    LITERATURE: 'cache-first',
  },
  OFFLINE_PAGES: ['/', '/chat', '/literature', '/step-work', '/crisis'],
} as const;

export const PERFORMANCE_CONFIG = {
  BUNDLE_SIZE_LIMIT_MB: 1,
  LIGHTHOUSE_THRESHOLDS: {
    performance: 90,
    accessibility: 100,
    bestPractices: 90,
    seo: 90,
  },
  LAZY_LOAD_THRESHOLD: '200px',
  IMAGE_OPTIMIZATION: {
    quality: 80,
    formats: ['webp', 'jpeg'],
  },
} as const;
