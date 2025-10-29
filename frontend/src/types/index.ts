/**
 * Digital Sponsor Frontend Types
 * Core type definitions for AA literature companion app
 */

// User Session Types (Anonymous)
export interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  isAnonymous: true; // Always anonymous per AA Tradition 12
}

// Chat & RAG Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  citations?: Citation[];
  isTyping?: boolean;
}

export interface Citation {
  source: string; // "Alcoholics Anonymous (Big Book)", "Twelve Steps and Twelve Traditions"
  chapter?: string;
  page?: number;
  passage?: string;
  url?: string;
}

export interface RAGResponse {
  content: string;
  citations: Citation[];
  accuracy: number;
  processingTime: number;
}

// Literature Types
export interface LiteratureSource {
  id: string;
  title: string;
  type: 'big_book' | 'twelve_and_twelve' | 'daily_reflections' | 'pamphlet';
  chapters: Chapter[];
  metadata: {
    totalPages: number;
    edition?: string;
    lastUpdated: Date;
  };
}

export interface Chapter {
  id: string;
  title: string;
  number: number;
  content: string;
  pageStart: number;
  pageEnd: number;
  summary?: string;
}

// Step Work Types
export interface StepWorkProgress {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  isCompleted: boolean;
  completedAt?: Date;
  notes?: string; // Encrypted client-side
  progress: number; // 0-100
}

export interface StepWorkDocument {
  id: string;
  stepNumber: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean;
  privacy: 'local_only' | 'shareable';
  content: StepWorkContent;
}

export interface StepWorkContent {
  sections: StepWorkSection[];
  reflections?: string[];
  notes?: string;
  completedDate?: Date;
}

export interface StepWorkSection {
  id: string;
  title: string;
  type: 'text' | 'list' | 'table' | 'reflection';
  content: any;
  isComplete: boolean;
}

export interface ResentmentInventory {
  id: string;
  person: string;
  cause: string;
  affects: {
    selfEsteem: boolean;
    pride: boolean;
    personalRelations: boolean;
    sexRelations: boolean;
    security: boolean;
    ambitions: boolean;
    pocketbook: boolean;
    other: string;
  };
  myPart: string;
  characterDefect: string;
  notes?: string;
}

export interface FearInventory {
  id: string;
  fear: string;
  cause: string;
  affects: {
    selfEsteem: boolean;
    pride: boolean;
    personalRelations: boolean;
    sexRelations: boolean;
    security: boolean;
    ambitions: boolean;
    pocketbook: boolean;
    other: string;
  };
  notes?: string;
}

export interface AmendsItem {
  id: string;
  person: string;
  harm: string;
  willingness: 'willing' | 'not_ready' | 'impossible';
  method?: string;
  timing?: string;
  notes?: string;
  completed: boolean;
  completedDate?: Date;
}

// Crisis Support Types
export interface CrisisResource {
  id: string;
  name: string;
  description: string;
  phone?: string;
  text?: string;
  website?: string;
  available24x7: boolean;
  type: 'hotline' | 'chat' | 'text' | 'website';
}

// Meeting Types
export interface Meeting {
  id: string;
  name: string;
  day: string;
  time: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  type: 'open' | 'closed';
  format: string[]; // ['discussion', 'speaker', 'literature']
  isVirtual: boolean;
  virtualInfo?: {
    platform: string;
    meetingId: string;
    password?: string;
    url: string;
  };
  accessibility: string[];
}

// App State Types
export interface AppState {
  currentView: 'home' | 'chat' | 'literature' | 'step-work' | 'meetings' | 'crisis';
  isOnline: boolean;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

// Component Props Types
export interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  testId?: string;
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  userFriendlyMessage: string;
}

// Privacy & Compliance Types
export interface PrivacySettings {
  anonymousMode: true; // Always true per AA Traditions
  dataRetentionDays: number; // Default 7 days
  allowAnalytics: boolean;
  crashReporting: boolean;
}

// Accessibility Types
export interface A11ySettings {
  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
}