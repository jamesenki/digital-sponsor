// Digital Sponsor - Main Chat Service
// Orchestrates OpenAI, RAG, and conversation management

import {
  ChatRequest,
  ChatResponse,
  ChatMessage,
  StreamingChatRequest,
  StreamingChatChunk,
  ChatHealthStatus,
  ResourceRecommendation,
  ActionItem,
} from '../types/chat.js';
import {
  OpenAIChatService,
  OpenAIChatServiceConfig,
} from './openai-chat-service.js';
import { RAGService, RAGServiceConfig } from './rag-service.js';
import {
  ConversationManager,
  ConversationManagerConfig,
} from './conversation-manager-stub.js';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

export interface ChatServiceConfig {
  openai: OpenAIChatServiceConfig;
  rag: RAGServiceConfig;
  conversation: ConversationManagerConfig;
  enableRAG?: boolean;
  enableCrisisDetection?: boolean;
  enableRecommendations?: boolean;
}

export class ChatService {
  private openaiService: OpenAIChatService;
  private ragService: RAGService;
  private conversationManager: ConversationManager;
  private config: ChatServiceConfig;
  private logger: winston.Logger;

  constructor(config: ChatServiceConfig, logger?: winston.Logger) {
    this.config = {
      enableRAG: true,
      enableCrisisDetection: true,
      enableRecommendations: true,
      ...config,
    };

    this.logger =
      logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
        transports: [new winston.transports.Console()],
      });

    // Initialize services
    this.openaiService = new OpenAIChatService(config.openai, this.logger);
    this.ragService = new RAGService(config.rag, this.logger);
    this.conversationManager = new ConversationManager(
      config.conversation,
      this.logger
    );
  }

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Get or create conversation
      const conversation =
        await this.conversationManager.getOrCreateConversation(
          request.conversationId,
          request.userId,
          request.sessionId
        );

      this.logger.info('Processing chat message', {
        conversationId: conversation.id,
        userId: request.userId,
        sessionId: request.sessionId,
        messageLength: request.message.length,
        enableRAG:
          this.config.enableRAG && (request.options?.includeRAG ?? true),
      });

      // Create user message
      const userMessage: ChatMessage = {
        id: uuidv4(),
        conversationId: conversation.id,
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString(),
        metadata: {
          userId: request.userId,
          sessionId: request.sessionId,
          messageType: 'text',
        },
      };

      // Add user message to conversation
      await this.conversationManager.addMessage(
        conversation.id,
        request.userId,
        userMessage
      );

      // Generate RAG context if enabled
      let ragContext = null;
      let contextString = '';

      if (this.config.enableRAG && (request.options?.includeRAG ?? true)) {
        ragContext = await this.ragService.generateRAGContext(
          request,
          conversation.context
        );
        if (ragContext) {
          contextString =
            await this.ragService.formatContextForPrompt(ragContext);
        }
      }

      // Generate AI response
      const assistantMessage = await this.openaiService.generateChatCompletion(
        request,
        conversation.messages,
        contextString
      );

      // Add RAG context to assistant message if available
      if (ragContext) {
        assistantMessage.ragContext = ragContext;
      }

      // Add assistant message to conversation
      const updatedConversation = await this.conversationManager.addMessage(
        conversation.id,
        request.userId,
        assistantMessage
      );

      // Handle crisis detection
      if (
        this.config.enableCrisisDetection &&
        assistantMessage.metadata?.ruleTriggered
      ) {
        await this.handleCrisisDetection(
          assistantMessage,
          updatedConversation.id,
          request.userId
        );
      }

      // Generate recommendations and next steps
      const suggestions = this.generateSuggestions(
        assistantMessage,
        conversation.context
      );
      const resources = this.config.enableRecommendations
        ? this.generateResourceRecommendations(
            assistantMessage,
            conversation.context
          )
        : [];
      const nextSteps = this.config.enableRecommendations
        ? this.generateNextSteps(assistantMessage, conversation.context)
        : [];

      const processingTime = Date.now() - startTime;

      this.logger.info('Chat message processed successfully', {
        conversationId: conversation.id,
        userId: request.userId,
        processingTime,
        ragUsed: !!ragContext,
        ragSources: ragContext?.totalSources || 0,
        crisisFlags: assistantMessage.metadata?.ruleTriggered?.length || 0,
      });

      const response: ChatResponse = {
        message: assistantMessage,
        conversation: updatedConversation,
        suggestions,
        resources,
        nextSteps,
      };

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Failed to process chat message', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        conversationId: request.conversationId,
        processingTime,
      });

      throw error;
    }
  }

  async processStreamingMessage(
    request: StreamingChatRequest,
    onChunk: (chunk: StreamingChatChunk) => void
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // Get or create conversation
      const conversation =
        await this.conversationManager.getOrCreateConversation(
          request.conversationId,
          request.userId,
          request.sessionId
        );

      // Create user message
      const userMessage: ChatMessage = {
        id: uuidv4(),
        conversationId: conversation.id,
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString(),
        metadata: {
          userId: request.userId,
          sessionId: request.sessionId,
          messageType: 'text',
        },
      };

      // Add user message to conversation
      await this.conversationManager.addMessage(
        conversation.id,
        request.userId,
        userMessage
      );

      // Generate RAG context if enabled
      let ragContext = null;
      let contextString = '';

      if (this.config.enableRAG && (request.options?.includeRAG ?? true)) {
        ragContext = await this.ragService.generateRAGContext(
          request,
          conversation.context
        );
        if (ragContext) {
          contextString =
            await this.ragService.formatContextForPrompt(ragContext);
        }
      }

      // Generate streaming AI response
      const assistantMessage =
        await this.openaiService.generateStreamingCompletion(
          request,
          conversation.messages,
          contextString,
          onChunk
        );

      // Add RAG context to assistant message if available
      if (ragContext) {
        assistantMessage.ragContext = ragContext;
      }

      // Add assistant message to conversation
      const updatedConversation = await this.conversationManager.addMessage(
        conversation.id,
        request.userId,
        assistantMessage
      );

      // Handle crisis detection
      if (
        this.config.enableCrisisDetection &&
        assistantMessage.metadata?.ruleTriggered
      ) {
        await this.handleCrisisDetection(
          assistantMessage,
          updatedConversation.id,
          request.userId
        );
      }

      // Generate recommendations and next steps
      const suggestions = this.generateSuggestions(
        assistantMessage,
        conversation.context
      );
      const resources = this.config.enableRecommendations
        ? this.generateResourceRecommendations(
            assistantMessage,
            conversation.context
          )
        : [];
      const nextSteps = this.config.enableRecommendations
        ? this.generateNextSteps(assistantMessage, conversation.context)
        : [];

      const response: ChatResponse = {
        message: assistantMessage,
        conversation: updatedConversation,
        suggestions,
        resources,
        nextSteps,
      };

      return response;
    } catch (error) {
      this.logger.error('Failed to process streaming chat message', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        conversationId: request.conversationId,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  async getConversationHistory(
    userId: string,
    limit?: number,
    offset?: number
  ) {
    return await this.conversationManager.getConversationHistory(
      userId,
      limit,
      offset
    );
  }

  async getConversation(conversationId: string, userId: string) {
    return await this.conversationManager.getConversation(
      conversationId,
      userId
    );
  }

  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string
  ) {
    return await this.conversationManager.updateConversationTitle(
      conversationId,
      userId,
      title
    );
  }

  async deactivateConversation(conversationId: string, userId: string) {
    return await this.conversationManager.deactivateConversation(
      conversationId,
      userId
    );
  }

  private async handleCrisisDetection(
    message: ChatMessage,
    conversationId: string,
    userId: string
  ): Promise<void> {
    if (!message.metadata?.ruleTriggered) return;

    const crisisTypes = message.metadata.ruleTriggered;

    for (const crisisType of crisisTypes) {
      const crisisFlag = {
        type: crisisType as
          | 'substance_use'
          | 'self_harm'
          | 'emergency'
          | 'severe_depression',
        confidence: 0.8, // This would come from the detection system
        timestamp: new Date().toISOString(),
        action_taken: this.getCrisisActionTaken(crisisType),
        resolved: false,
      };

      await this.conversationManager.addCrisisFlag(
        conversationId,
        userId,
        crisisFlag
      );
    }

    this.logger.warn('Crisis flags detected and added', {
      conversationId,
      userId,
      crisisTypes,
      messageId: message.id,
    });
  }

  private getCrisisActionTaken(crisisType: string): string {
    const actionMap: Record<string, string> = {
      substance_use: 'flagged_for_sponsor_contact',
      self_harm: 'emergency_resources_provided',
      emergency: 'emergency_contacts_suggested',
      severe_depression: 'professional_help_recommended',
    };

    return actionMap[crisisType] || 'flagged_for_review';
  }

  private generateSuggestions(message: ChatMessage, context: any): string[] {
    const suggestions: string[] = [];

    // Generate suggestions based on message content and context
    if (message.content.toLowerCase().includes('step')) {
      suggestions.push('Tell me more about step work');
      suggestions.push('What are the 12 steps?');
    }

    if (message.content.toLowerCase().includes('sponsor')) {
      suggestions.push('How do I find a sponsor?');
      suggestions.push('What makes a good sponsor?');
    }

    if (message.content.toLowerCase().includes('meeting')) {
      suggestions.push('How do I find meetings?');
      suggestions.push('What are different types of meetings?');
    }

    if (context?.currentStep) {
      suggestions.push(`Tell me more about Step ${context.currentStep}`);
    }

    // Add generic helpful suggestions if none specific
    if (suggestions.length === 0) {
      suggestions.push(
        'Tell me about the AA program',
        'How can I start working the steps?',
        'What literature should I read?'
      );
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private generateResourceRecommendations(
    message: ChatMessage,
    context: any
  ): ResourceRecommendation[] {
    const resources: ResourceRecommendation[] = [];

    // Crisis resources
    if (message.metadata?.ruleTriggered?.includes('self_harm')) {
      resources.push({
        type: 'emergency',
        title: '988 Suicide & Crisis Lifeline',
        description: '24/7 free and confidential support',
        action: 'Call 988',
        priority: 'urgent',
      });
    }

    if (message.metadata?.ruleTriggered?.includes('substance_use')) {
      resources.push({
        type: 'contact',
        title: 'Contact Your Sponsor',
        description: 'Reach out to your sponsor for immediate support',
        action: 'Call or text your sponsor',
        priority: 'high',
      });
    }

    // Literature recommendations based on RAG context
    if (
      message.ragContext?.literatureUsed &&
      message.ragContext.literatureUsed.length > 0
    ) {
      const firstRef = message.ragContext.literatureUsed[0];
      resources.push({
        type: 'literature',
        title: `Read: ${firstRef.title}`,
        description: `Explore more from ${firstRef.source.publication}`,
        priority: 'medium',
      });
    }

    // Meeting recommendations
    if (
      message.content.toLowerCase().includes('lonely') ||
      message.content.toLowerCase().includes('isolated')
    ) {
      resources.push({
        type: 'meeting',
        title: 'Find Local AA Meetings',
        description: 'Connect with your local AA community',
        action: 'Use the meeting finder',
        priority: 'medium',
        url: 'https://www.aa.org/meeting-finder',
      });
    }

    return resources;
  }

  private generateNextSteps(message: ChatMessage, context: any): ActionItem[] {
    const nextSteps: ActionItem[] = [];

    // Step-based recommendations
    if (context?.currentStep) {
      const step = context.currentStep;

      if (step === 1) {
        nextSteps.push({
          id: uuidv4(),
          title: 'Read Step 1 in the Big Book',
          description: 'Study the first step thoroughly',
          type: 'read',
          estimatedTime: '30 minutes',
          difficulty: 'easy',
          resources: ['Big Book - Chapter 1'],
        });
      } else if (step === 4) {
        nextSteps.push({
          id: uuidv4(),
          title: 'Work on Personal Inventory',
          description: 'Continue your moral inventory with your sponsor',
          type: 'practice',
          estimatedTime: '1-2 hours',
          difficulty: 'challenging',
          resources: ['Big Book - Chapter 4', 'Sponsor guidance'],
        });
      }
    }

    // Literature-based recommendations
    if (message.ragContext?.literatureUsed) {
      nextSteps.push({
        id: uuidv4(),
        title: 'Explore Related Literature',
        description: 'Read more about the topics discussed',
        type: 'read',
        estimatedTime: '20 minutes',
        difficulty: 'moderate',
      });
    }

    // Default recommendations
    if (nextSteps.length === 0) {
      nextSteps.push({
        id: uuidv4(),
        title: 'Daily Reflection',
        description: 'Take a few minutes to reflect on your recovery today',
        type: 'reflect',
        estimatedTime: '10 minutes',
        difficulty: 'easy',
      });
    }

    return nextSteps.slice(0, 3); // Limit to 3 action items
  }

  async healthCheck(): Promise<ChatHealthStatus> {
    try {
      const [openaiHealth, ragHealth, conversationHealth] = await Promise.all([
        this.openaiService.healthCheck(),
        this.ragService.healthCheck(),
        this.conversationManager.healthCheck(),
      ]);

      const allHealthy =
        openaiHealth.healthy && ragHealth.healthy && conversationHealth.healthy;
      const averageResponseTime =
        (openaiHealth.latency + ragHealth.latency) / 2;

      return {
        status: allHealthy ? 'healthy' : 'degraded',
        openaiConnected: openaiHealth.healthy,
        literatureServiceConnected: ragHealth.healthy,
        averageResponseTime,
        activeConversations: conversationHealth.conversationCount,
      };
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'unhealthy',
        openaiConnected: false,
        literatureServiceConnected: false,
        averageResponseTime: 0,
        activeConversations: 0,
        lastError: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
