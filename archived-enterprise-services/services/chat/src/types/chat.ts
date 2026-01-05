// Digital Sponsor - Chat Service Types
// Types for conversational AI with RAG integration

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: MessageMetadata;
  ragContext?: RAGContext;
}

export interface MessageMetadata {
  userId?: string;
  sessionId?: string;
  messageType?:
    | 'text'
    | 'help_request'
    | 'crisis'
    | 'step_guidance'
    | 'literature_query';
  confidence?: number;
  processingTime?: number;
  modelUsed?: string;
  tokensUsed?: number;
  ruleTriggered?: string[];
}

export interface RAGContext {
  literatureUsed: LiteratureReference[];
  searchQuery?: string;
  relevanceScore: number;
  totalSources: number;
  searchTime: number;
}

export interface LiteratureReference {
  id: string;
  title: string;
  type: string;
  chapter?: string;
  page?: number;
  stepNumber?: number;
  snippet: string;
  relevanceScore: number;
  source: {
    publication: string;
    edition?: string;
    year?: number;
  };
}

export interface ChatConversation {
  id: string;
  userId: string;
  sessionId?: string;
  title?: string;
  messages: ChatMessage[];
  context: ConversationContext;
  metadata: ConversationMetadata;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ConversationContext {
  currentStep?: number;
  currentTopic?: string;
  userGoals?: string[];
  challengeAreas?: string[];
  preferredLiterature?: string[];
  sessionType?: 'general' | 'step_work' | 'crisis_support' | 'meditation';
  emotionalState?: 'stable' | 'stressed' | 'crisis' | 'celebrating';
  lastActivity?: string;
}

export interface ConversationMetadata {
  totalMessages: number;
  averageResponseTime: number;
  satisfactionRating?: number;
  crisisFlags: CrisisFlag[];
  topicsDiscussed: string[];
  literatureRecommended: string[];
  stepsExplored: number[];
  traditionsDiscussed: number[];
}

export interface CrisisFlag {
  type: 'substance_use' | 'self_harm' | 'emergency' | 'severe_depression';
  confidence: number;
  timestamp: string;
  action_taken: string;
  resolved: boolean;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  userId: string;
  sessionId?: string;
  context?: Partial<ConversationContext>;
  options?: ChatOptions;
}

export interface ChatOptions {
  includeRAG?: boolean;
  maxRAGSources?: number;
  searchFilters?: {
    literatureTypes?: string[];
    steps?: number[];
    traditions?: number[];
    readingLevel?: string;
  };
  responseStyle?: 'supportive' | 'educational' | 'reflective' | 'directive';
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message: ChatMessage;
  conversation: ChatConversation;
  suggestions?: string[];
  resources?: ResourceRecommendation[];
  nextSteps?: ActionItem[];
}

export interface ResourceRecommendation {
  type: 'literature' | 'meeting' | 'contact' | 'emergency';
  title: string;
  description: string;
  action?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  url?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  type: 'read' | 'reflect' | 'practice' | 'share' | 'contact';
  estimatedTime?: string;
  difficulty?: 'easy' | 'moderate' | 'challenging';
  resources?: string[];
}

export interface StreamingChatRequest extends ChatRequest {
  stream: true;
}

export interface StreamingChatChunk {
  id: string;
  conversationId: string;
  chunk: string;
  finished: boolean;
  metadata?: {
    tokens_used?: number;
    finish_reason?: string;
  };
}

export interface ChatHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  openaiConnected: boolean;
  literatureServiceConnected: boolean;
  averageResponseTime: number;
  activeConversations: number;
  lastError?: string;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  title: string;
  lastMessage: string;
  lastActivity: string;
  messageCount: number;
  topicsDiscussed: string[];
  status: 'active' | 'paused' | 'completed';
}

export interface UserChatPreferences {
  userId: string;
  responseStyle: 'supportive' | 'educational' | 'reflective' | 'directive';
  includeRAG: boolean;
  maxRAGSources: number;
  preferredLiterature: string[];
  crisisContactInfo?: {
    emergencyContact?: string;
    therapistContact?: string;
    sponsorContact?: string;
  };
  privacySettings: {
    storeConversations: boolean;
    shareForImprovement: boolean;
    retentionDays: number;
  };
}

export interface ChatAnalytics {
  conversationId: string;
  userId: string;
  sessionId?: string;
  metrics: {
    totalMessages: number;
    averageResponseTime: number;
    ragUsageRate: number;
    userSatisfaction?: number;
    completionRate: number;
  };
  insights: {
    mainTopics: string[];
    literaturePreferences: string[];
    helpfulResponses: string[];
    improvementAreas: string[];
  };
  timestamp: string;
}

export interface ChatConfigurationOptions {
  openai: {
    model: string;
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  rag: {
    maxSources: number;
    relevanceThreshold: number;
    searchTimeout: number;
    includeMetadata: boolean;
  };
  conversation: {
    maxContextMessages: number;
    contextRetentionDays: number;
    autoSummarization: boolean;
  };
  safety: {
    crisisDetectionEnabled: boolean;
    contentFiltering: boolean;
    moderationLevel: 'strict' | 'moderate' | 'lenient';
  };
}
