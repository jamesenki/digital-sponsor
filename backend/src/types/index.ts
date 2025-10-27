/**
 * TypeScript definitions for Digital Sponsor Backend
 * 
 * AA Traditions Compliant Types:
 * - No personal identifiable information
 * - Anonymous session types only
 * - Literature and recovery focused
 */

// Session Types
export interface AnonymousSession {
  id: string
  created: Date
  lastAccessed: Date
  temporary: boolean
  anonymous: true
  preferences?: SessionPreferences
  literatureHistory?: string[]
}

export interface SessionPreferences {
  textSize: 'small' | 'medium' | 'large'
  theme: 'light' | 'dark'
}

// Literature Types
export interface LiteratureSource {
  id: string
  title: string
  category: LiteratureCategory
  author: 'AA World Services' | 'Bill W.' | 'Dr. Bob' | 'AA Members'
  published: Date
  copyright: string
  approved: boolean
}

export type LiteratureCategory = 
  | 'big_book' 
  | 'twelve_and_twelve' 
  | 'daily_reflections' 
  | 'pamphlets' 
  | 'traditions'
  | 'concepts'

export interface LiteratureContent {
  id: string
  source: LiteratureSource
  section: string
  title: string
  text: string
  page?: number
  chapter?: number
  embeddings?: number[]
  metadata?: LiteratureMetadata
}

export interface LiteratureMetadata {
  topics: string[]
  steps?: number[]
  traditions?: number[]
  concepts?: number[]
  keywords: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  content_type: 'text' | 'story' | 'instruction' | 'reflection'
}

export interface SearchResult {
  id: string
  title: string
  excerpt: string
  source: string
  page?: number
  category: LiteratureCategory
  relevance_score: number
  highlighted_text?: string
}

// Chat Types
export interface ChatMessage {
  content: string
  timestamp: Date
  anonymous: true
  context?: ChatContext
}

export type ChatContext = 
  | 'general'
  | 'step_work' 
  | 'sponsorship' 
  | 'traditions' 
  | 'literature_study'
  | 'meeting_support'

export interface ChatResponse {
  message: string
  sources: string[]
  context: ChatContext
  confidence: number
  aa_compliant: true
  traditions_followed: number[]
}

// RAG System Types
export interface EmbeddingVector {
  id: string
  vector: number[]
  metadata: {
    source: string
    section: string
    page?: number
    category: LiteratureCategory
    content_preview: string
  }
}

export interface VectorSearchQuery {
  query_vector: number[]
  top_k: number
  filter?: {
    category?: LiteratureCategory
    source?: string
    page_range?: [number, number]
  }
}

export interface VectorSearchResult {
  id: string
  score: number
  metadata: EmbeddingVector['metadata']
  content: string
}

// Database Types
export interface DatabaseHealth {
  postgres: 'healthy' | 'degraded' | 'down'
  redis: 'healthy' | 'degraded' | 'down'
  chroma: 'healthy' | 'degraded' | 'down'
  overall: 'healthy' | 'degraded' | 'down'
}

// API Response Types
export interface APIResponse<T = any> {
  data?: T
  error?: string
  message?: string
  timestamp: string
  session?: {
    id: string
    anonymous: true
  }
  compliance?: {
    aa_traditions: true
    anonymity: true
    [key: string]: boolean
  }
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  service: string
  version: string
  uptime: number
  environment: string
  compliance: 'AA Traditions 1-12'
  anonymous: true
  components?: {
    api: ComponentHealth
    database: ComponentHealth
    redis: ComponentHealth
    chroma: ComponentHealth
  }
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy'
  responseTime: number
  error?: string
}

// Crisis Support Types
export interface CrisisResources {
  emergency: {
    suicide_lifeline: '988'
    crisis_text: 'Text HOME to 741741'
    emergency: '911'
  }
  aa_resources: {
    general_service_office: string
    aa_website: string
    meeting_guide: string
    local_hotline?: string
  }
  message: string
  availability: '24/7'
}

// Compliance Types
export interface AAComplianceCheck {
  tradition_1: boolean  // Unity
  tradition_2: boolean  // Higher Power
  tradition_3: boolean  // Membership
  tradition_4: boolean  // Autonomy
  tradition_5: boolean  // Primary Purpose
  tradition_6: boolean  // Non-endorsement
  tradition_7: boolean  // Self-supporting
  tradition_8: boolean  // Non-professional
  tradition_9: boolean  // Non-governing
  tradition_10: boolean // Non-controversy
  tradition_11: boolean // Attraction not promotion
  tradition_12: boolean // Anonymity
}

export interface PrivacyCompliance {
  no_personal_data: boolean
  anonymous_sessions: boolean
  no_tracking: boolean
  temporary_storage: boolean
  no_cross_session_correlation: boolean
  gdpr_compliant: boolean
}

// Error Types
export interface APIError {
  name: string
  message: string
  statusCode: number
  isOperational: boolean
  timestamp: string
  session_id?: string
  path?: string
  method?: string
}

// Validation Types
export interface ValidationRule {
  field: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  min_length?: number
  max_length?: number
  pattern?: RegExp
  enum_values?: string[]
  custom_validator?: (value: any) => boolean
}

// Logging Types
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
  service: 'digital-sponsor-api'
  session_id?: string
  anonymous: true
  compliance: 'AA-Traditions-12'
  metadata?: Record<string, any>
}

// Configuration Types
export interface DatabaseConfig {
  postgres: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl: boolean
    max_connections: number
  }
  redis: {
    host: string
    port: number
    database: number
    ttl: number
  }
  chroma: {
    host: string
    port: number
    collection_name: string
  }
}

export interface OpenAIConfig {
  api_key: string
  model: string
  max_tokens: number
  temperature: number
  system_prompt: string
}

// Service Types
export interface LiteratureIngestionJob {
  id: string
  source_file: string
  category: LiteratureCategory
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  chunks_processed: number
  embeddings_created: number
  started_at?: Date
  completed_at?: Date
  error?: string
}

export interface RAGQuery {
  question: string
  context?: ChatContext
  max_results: number
  confidence_threshold: number
  filter?: {
    categories?: LiteratureCategory[]
    exclude_sources?: string[]
  }
}

export interface RAGResponse {
  answer: string
  sources: Array<{
    title: string
    excerpt: string
    source: string
    page?: number
    confidence: number
  }>
  context: ChatContext
  confidence: number
  traditions_compliant: true
}