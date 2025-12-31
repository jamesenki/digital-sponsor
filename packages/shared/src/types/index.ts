// Digital Sponsor - Core Type Definitions
// AA Traditions compliant - anonymous, private, educational only

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnonymousSession {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xl';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  timestamp: string;
  type: 'user' | 'assistant';
  sources?: LiteratureSource[];
}

export interface LiteratureSource {
  title: string;
  page?: number;
  section?: string;
  citation: string;
  relevanceScore: number;
}

export interface ChatResponse {
  message: string;
  type: 'literature_based' | 'crisis_referral' | 'out_of_scope' | 'error';
  confidence: number;
  sources: LiteratureSource[];
  compliance: AAComplianceInfo;
}

export interface AAComplianceInfo {
  traditionsSix: boolean; // No endorsements
  traditionsEleven: boolean; // Privacy protection
  traditionsTwelve: boolean; // Anonymity maintained
  literatureBased: boolean; // Response from approved sources
}

export interface CrisisEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  triggerWords: string[];
  confidence: number;
  resourcesProvided: EmergencyResource[];
}

export interface EmergencyResource {
  name: string;
  type: 'hotline' | 'text' | 'website' | 'local_service';
  contact: string;
  description: string;
  available24h: boolean;
}

export interface StepWorkEntry {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  content: string; // Client-side encrypted
  version: number;
  timestamp: string;
  aiResponse?: string;
}

export interface StepWorkProgress {
  stepNumber: number;
  completionPercentage: number;
  lastUpdated: string;
  versionCount: number;
}

export interface LiteratureContent {
  id: string;
  title: string;
  content: string;
  source: 'big_book' | 'twelve_and_twelve' | 'daily_reflections' | 'pamphlet';
  page?: number;
  chapter?: string;
  section?: string;
  embedding?: number[];
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  compliance: AAComplianceInfo;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    [serviceName: string]: ServiceHealth;
  };
}

export interface ServiceHealth {
  healthy: boolean;
  responseTime: number;
  message: string;
}
