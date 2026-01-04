// Digital Sponsor - Database Schema Types
// Cosmos DB optimized schemas with proper partitioning and indexing

export interface BaseDocument {
  id: string;
  partitionKey: string;
  docType: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  _etag?: string;
}

// Literature Collection Schema
export interface LiteratureDocument extends BaseDocument {
  docType: 'literature';
  partitionKey: string; // Maps to 'type' field for partitioning
  type: 'big_book' | 'twelve_and_twelve' | 'daily_reflections' | 'pamphlet' | 'living_sober';
  title: string;
  content: string;
  
  // Metadata for organization
  source: {
    publication: string;
    edition?: string;
    year?: number;
    isbn?: string;
  };
  
  // Hierarchical structure
  structure: {
    book?: string;
    chapter?: string;
    section?: string;
    page?: number;
    pageRange?: string;
    step?: number; // For step-related content
  };
  
  // Search and AI features
  searchMetadata: {
    keywords: string[];
    topics: string[];
    step_references?: number[];
    tradition_references?: number[];
  };
  
  // Vector embeddings for semantic search
  embeddings?: {
    text_embedding: number[];
    embedding_model: string;
    embedding_version: string;
  };
  
  // Content classification
  classification: {
    content_type: 'text' | 'prayer' | 'meditation' | 'story' | 'instruction';
    reading_level: 'basic' | 'intermediate' | 'advanced';
    sensitivity_level: 'general' | 'personal_story' | 'crisis_related';
  };
  
  // AA Traditions compliance
  compliance: {
    traditions_compliant: boolean;
    anonymity_preserved: boolean;
    no_endorsements: boolean;
    educational_only: boolean;
  };
}

// User Sessions Schema (Anonymous)
export interface UserSessionDocument extends BaseDocument {
  docType: 'user_session';
  partitionKey: string; // Anonymous userId for partitioning
  userId: string; // Anonymous UUID - no PII
  sessionId: string;
  
  // Session lifecycle
  expiresAt: string;
  lastAccessedAt: string;
  isActive: boolean;
  
  // Anonymous preferences (no personal data)
  preferences: {
    accessibility: {
      theme: 'light' | 'dark' | 'system' | 'high_contrast';
      fontSize: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
      reducedMotion: boolean;
      screenReader: boolean;
      focusIndicators: boolean;
    };
    
    interface: {
      language: string; // ISO code
      timezone?: string; // For time-sensitive features only
      notifications: boolean;
    };
    
    content: {
      preferredLiterature: string[];
      bookmarks: string[]; // Literature IDs only
      reading_progress: Record<string, number>; // Literature ID -> progress %
    };
  };
  
  // Usage analytics (anonymous)
  analytics: {
    sessionCount: number;
    totalTimeSpent: number; // milliseconds
    featuresUsed: string[];
    lastFeature: string;
  };
}

// Step Work Schema (Encrypted)
export interface StepWorkDocument extends BaseDocument {
  docType: 'step_work';
  partitionKey: string; // Anonymous userId for partitioning
  userId: string; // Anonymous UUID - no PII
  
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  
  // All personal content encrypted client-side
  encryptedData: {
    content: string; // Client-side encrypted step work
    encryptionMethod: 'AES-GCM-256';
    keyDerivation: 'PBKDF2';
    salt: string;
    iv: string;
  };
  
  // Non-encrypted metadata for progress tracking
  metadata: {
    wordCount: number;
    progressPercentage: number;
    versionNumber: number;
    isComplete: boolean;
    lastModified: string;
  };
  
  // AI feedback (if enabled, also encrypted)
  aiFeedback?: {
    encryptedFeedback: string;
    feedbackVersion: string;
    literatureSources: string[]; // Literature IDs only
    confidence: number;
  };
  
  // Step-specific metadata
  stepMetadata: {
    template_version: string;
    prompts_completed: string[];
    estimated_completion_time: number;
  };
}

// Crisis Support Schema
export interface CrisisEventDocument extends BaseDocument {
  docType: 'crisis_event';
  partitionKey: string; // Region or 'global' for partitioning
  
  // No user identification - completely anonymous
  sessionId: string; // One-time session hash
  timestamp: string;
  
  // Crisis detection
  detection: {
    triggerWords: string[];
    confidence: number;
    model_version: string;
    sentiment_score: number;
  };
  
  // Response provided
  response: {
    resources_provided: EmergencyResource[];
    response_type: 'immediate' | 'escalated' | 'referral';
    follow_up_enabled: boolean;
  };
  
  // Geographic context (anonymous)
  context: {
    region: string; // General region for local resources
    timezone: string;
    language: string;
  };
  
  // Outcome tracking (anonymous)
  outcome?: {
    user_acknowledged: boolean;
    resource_accessed: string[];
    session_continued: boolean;
  };
}

// Analytics Schema (Aggregate Data Only)
export interface AnalyticsDocument extends BaseDocument {
  docType: 'analytics';
  partitionKey: string; // Date (YYYY-MM-DD) for partitioning
  date: string; // YYYY-MM-DD
  
  // Aggregate metrics - no individual tracking
  metrics: {
    total_sessions: number;
    unique_sessions: number; // Estimated via HyperLogLog
    average_session_duration: number;
    total_literature_views: number;
    total_step_work_entries: number;
    crisis_events_detected: number;
  };
  
  // Feature usage (aggregate)
  features: {
    chat_usage: number;
    literature_search: number;
    step_work_access: number;
    crisis_support_accessed: number;
  };
  
  // Content popularity (aggregate)
  content: {
    popular_literature: Record<string, number>; // Literature ID -> view count
    step_work_completion_rates: Record<string, number>; // Step -> completion %
  };
  
  // System health
  performance: {
    average_response_time: number;
    error_rate: number;
    availability: number;
  };
}

// Migration Schema
export interface MigrationDocument extends BaseDocument {
  docType: 'migration';
  partitionKey: 'migrations'; // Single partition for all migrations
  
  migrationId: string;
  name: string;
  description: string;
  
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  
  execution: {
    startedAt?: string;
    completedAt?: string;
    executionTime?: number; // milliseconds
    recordsProcessed?: number;
    recordsFailed?: number;
  };
  
  rollback?: {
    rollbackScript: string;
    canRollback: boolean;
    rollbackAt?: string;
  };
  
  error?: {
    errorMessage: string;
    errorStack: string;
    failedAt: string;
  };
}

// Emergency Resource Schema
export interface EmergencyResource {
  id: string;
  name: string;
  type: 'hotline' | 'text' | 'chat' | 'website' | 'local_service' | 'app';
  contact: string;
  description: string;
  
  availability: {
    available24h: boolean;
    schedule?: string;
    timezone?: string;
  };
  
  geographic: {
    region: string;
    country: string;
    language: string;
  };
  
  crisis_types: ('suicidal' | 'substance_abuse' | 'mental_health' | 'domestic_violence' | 'general')[];
  
  verification: {
    verified: boolean;
    lastChecked: string;
    verificationSource: string;
  };
}

// Database Configuration
export interface DatabaseConfig {
  containers: {
    [containerName: string]: {
      partitionKeyPath: string;
      indexingPolicy: any;
      uniqueKeys?: string[];
      defaultTTL?: number;
    };
  };
}

// Export database configuration
export const COSMOS_DB_CONFIG: DatabaseConfig = {
  containers: {
    Literature: {
      partitionKeyPath: '/type',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/*' },
          { path: '/searchMetadata/keywords/*' },
          { path: '/searchMetadata/topics/*' },
          { path: '/structure/step/?' },
          { path: '/classification/content_type/?' }
        ],
        excludedPaths: [
          { path: '/embeddings/*' },
          { path: '/"_etag"/?' }
        ]
      }
    },
    
    UserSessions: {
      partitionKeyPath: '/userId',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/preferences/*' },
          { path: '/"_etag"/?' }
        ]
      },
      defaultTTL: 86400 // 24 hours
    },
    
    StepWork: {
      partitionKeyPath: '/userId',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/stepNumber/?' },
          { path: '/metadata/*' }
        ],
        excludedPaths: [
          { path: '/encryptedData/*' },
          { path: '/aiFeedback/*' },
          { path: '/"_etag"/?' }
        ]
      }
    },
    
    CrisisSupport: {
      partitionKeyPath: '/partitionKey',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    },
    
    Analytics: {
      partitionKeyPath: '/date',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true,
        includedPaths: [
          { path: '/*' }
        ],
        excludedPaths: [
          { path: '/"_etag"/?' }
        ]
      }
    },
    
    Migrations: {
      partitionKeyPath: '/partitionKey',
      indexingPolicy: {
        indexingMode: 'consistent',
        automatic: true
      }
    }
  }
};