// Digital Sponsor - Conversation Manager
// Handles conversation context, history, and state management

// Simple local types to avoid shared package ES module issues
interface UserSessionDocument {
  id: string;
  userId: string;
  sessionId: string;
  type: 'chat' | 'literature' | 'step_work';
  isActive: boolean;
  lastActivity: Date;
  metadata?: any;
}

// Simple in-memory database client stub
class DatabaseClient {
  private storage = new Map<string, any>();

  constructor(config: any) {
    // Stub constructor
  }

  async getById(id: string) {
    return this.storage.get(id) || null;
  }

  async query(querySpec: any) {
    return Array.from(this.storage.values());
  }

  async create(item: any) {
    const id = item.id || Date.now().toString();
    this.storage.set(id, { ...item, id });
    return { ...item, id };
  }

  async update(id: string, item: any) {
    this.storage.set(id, { ...item, id });
    return { ...item, id };
  }
}

// Define database client config locally since it's not exported from shared
interface DatabaseClientConfig {
  endpoint: string;
  key?: string;
  connectionString?: string;
  databaseName: string;
}
import {
  ChatConversation,
  ChatMessage,
  ConversationContext,
  ConversationMetadata,
  ConversationSummary,
  CrisisFlag,
} from '../types/chat.js';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

export interface ConversationManagerConfig {
  cosmosEndpoint?: string;
  cosmosConnectionString?: string;
  databaseName: string;
  containerName?: string;
  maxContextMessages?: number;
  contextRetentionDays?: number;
  autoSummarization?: boolean;
}

// Extended conversation document for Cosmos DB
interface ConversationDocument extends ChatConversation {
  docType: 'conversation';
  partitionKey: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export class ConversationManager {
  private dbClient: DatabaseClient;
  private config: ConversationManagerConfig;
  private logger: winston.Logger;

  constructor(config: ConversationManagerConfig, logger?: winston.Logger) {
    this.config = {
      containerName: 'Conversations',
      maxContextMessages: 50,
      contextRetentionDays: 30,
      autoSummarization: true,
      ...config,
    };

    // Build database client config
    const dbConfig: DatabaseClientConfig = {
      endpoint: config.cosmosEndpoint || '',
      connectionString: config.cosmosConnectionString,
      databaseName: config.databaseName,
    };

    // Validate that we have either endpoint or connection string
    if (!config.cosmosConnectionString && !config.cosmosEndpoint) {
      throw new Error(
        'Either cosmosConnectionString or cosmosEndpoint is required'
      );
    }

    this.dbClient = new DatabaseClient(dbConfig);

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
  }

  async getOrCreateConversation(
    conversationId: string | undefined,
    userId: string,
    sessionId?: string
  ): Promise<ChatConversation> {
    try {
      if (conversationId) {
        // Try to load existing conversation
        const existing = await this.getConversation(conversationId, userId);
        if (existing) {
          return existing;
        }
      }

      // Create new conversation
      const newConversation: ChatConversation = {
        id: conversationId || uuidv4(),
        userId,
        sessionId,
        title: this.generateConversationTitle(),
        messages: [],
        context: this.initializeConversationContext(),
        metadata: this.initializeConversationMetadata(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      };

      await this.saveConversation(newConversation);

      this.logger.info('New conversation created', {
        conversationId: newConversation.id,
        userId,
        sessionId,
      });

      return newConversation;
    } catch (error) {
      this.logger.error('Failed to get or create conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
        sessionId,
      });
      throw error;
    }
  }

  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ChatConversation | null> {
    try {
      const result = await this.dbClient.getById<ConversationDocument>(
        this.config.containerName!,
        conversationId,
        userId
      );

      if (!result || result.userId !== userId) {
        return null;
      }

      // Convert document to conversation (removing Cosmos DB specific fields)
      const conversation: ChatConversation = {
        id: result.id,
        userId: result.userId,
        sessionId: result.sessionId,
        title: result.title,
        messages: result.messages,
        context: result.context,
        metadata: result.metadata,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        isActive: result.isActive,
      };

      return conversation;
    } catch (error) {
      this.logger.error('Failed to get conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
      });
      return null;
    }
  }

  async addMessage(
    conversationId: string,
    userId: string,
    message: ChatMessage
  ): Promise<ChatConversation> {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found for user ${userId}`
        );
      }

      // Add message to conversation
      conversation.messages.push(message);

      // Update conversation metadata
      this.updateConversationMetadata(conversation, message);

      // Update conversation context based on message
      this.updateConversationContextFromMessage(conversation, message);

      // Trim old messages if necessary
      if (conversation.messages.length > this.config.maxContextMessages!) {
        const messagesToKeep = this.config.maxContextMessages!;
        conversation.messages = conversation.messages.slice(-messagesToKeep);
      }

      conversation.updatedAt = new Date().toISOString();

      await this.saveConversation(conversation);

      this.logger.debug('Message added to conversation', {
        conversationId,
        userId,
        messageId: message.id,
        messageRole: message.role,
        totalMessages: conversation.messages.length,
      });

      return conversation;
    } catch (error) {
      this.logger.error('Failed to add message to conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
        messageId: message.id,
      });
      throw error;
    }
  }

  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found for user ${userId}`
        );
      }

      conversation.title = title;
      conversation.updatedAt = new Date().toISOString();

      await this.saveConversation(conversation);

      this.logger.debug('Conversation title updated', {
        conversationId,
        userId,
        newTitle: title,
      });
    } catch (error) {
      this.logger.error('Failed to update conversation title', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
        title,
      });
      throw error;
    }
  }

  async getConversationHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ConversationSummary[]> {
    try {
      const query = `
        SELECT 
          c.id,
          c.userId,
          c.title,
          c.updatedAt,
          c.isActive,
          ARRAY_LENGTH(c.messages) as messageCount,
          c.context.currentTopic,
          c.metadata.topicsDiscussed
        FROM c 
        WHERE c.userId = @param0 
          AND c.isActive = true
        ORDER BY c.updatedAt DESC
        OFFSET @param1 LIMIT @param2
      `;

      const result = await this.dbClient.query<any>(
        this.config.containerName!,
        query,
        [userId, offset, limit]
      );

      const summaries: ConversationSummary[] = result.items.map(
        (item: any) => ({
          id: item.id,
          userId: item.userId,
          title: item.title || 'Untitled Conversation',
          lastMessage: this.getLastMessagePreview(item.messages),
          lastActivity: item.updatedAt,
          messageCount: item.messageCount || 0,
          topicsDiscussed: item.metadata?.topicsDiscussed || [],
          status: item.isActive ? 'active' : 'completed',
        })
      );

      return summaries;
    } catch (error) {
      this.logger.error('Failed to get conversation history', {
        error: error instanceof Error ? error.message : String(error),
        userId,
        limit,
        offset,
      });
      return [];
    }
  }

  async updateConversationContext(
    conversationId: string,
    userId: string,
    contextUpdate: Partial<ConversationContext>
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found for user ${userId}`
        );
      }

      // Merge context updates
      conversation.context = {
        ...conversation.context,
        ...contextUpdate,
      };

      conversation.updatedAt = new Date().toISOString();

      await this.saveConversation(conversation);

      this.logger.debug('Conversation context updated', {
        conversationId,
        userId,
        contextUpdate,
      });
    } catch (error) {
      this.logger.error('Failed to update conversation context', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
        contextUpdate,
      });
      throw error;
    }
  }

  async addCrisisFlag(
    conversationId: string,
    userId: string,
    crisisFlag: CrisisFlag
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found for user ${userId}`
        );
      }

      conversation.metadata.crisisFlags.push(crisisFlag);
      conversation.updatedAt = new Date().toISOString();

      await this.saveConversation(conversation);

      this.logger.warn('Crisis flag added to conversation', {
        conversationId,
        userId,
        crisisType: crisisFlag.type,
        confidence: crisisFlag.confidence,
      });
    } catch (error) {
      this.logger.error('Failed to add crisis flag', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
        crisisFlag,
      });
      throw error;
    }
  }

  async deactivateConversation(
    conversationId: string,
    userId: string
  ): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId, userId);

      if (!conversation) {
        throw new Error(
          `Conversation ${conversationId} not found for user ${userId}`
        );
      }

      conversation.isActive = false;
      conversation.updatedAt = new Date().toISOString();

      await this.saveConversation(conversation);

      this.logger.info('Conversation deactivated', {
        conversationId,
        userId,
      });
    } catch (error) {
      this.logger.error('Failed to deactivate conversation', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
        userId,
      });
      throw error;
    }
  }

  private async saveConversation(
    conversation: ChatConversation
  ): Promise<void> {
    const conversationDoc: ConversationDocument = {
      ...conversation,
      docType: 'conversation',
      partitionKey: conversation.userId,
      version: 1, // This would be managed by the database layer
    };

    // Use update if conversation exists, otherwise create
    try {
      await this.dbClient.update<ConversationDocument>(
        this.config.containerName!,
        conversation.id,
        conversation.userId,
        conversationDoc
      );
    } catch (error) {
      // If update fails, try to create (conversation might not exist)
      await this.dbClient.create<ConversationDocument>(
        this.config.containerName!,
        conversationDoc
      );
    }
  }

  private generateConversationTitle(): string {
    const titles = [
      'Recovery Journey Chat',
      'Step Work Discussion',
      'Daily Reflection',
      'Support Conversation',
      'Literature Study',
      'Spiritual Discussion',
      'Recovery Support',
    ];

    const timestamp = new Date().toLocaleDateString();
    const randomTitle = titles[Math.floor(Math.random() * titles.length)];

    return `${randomTitle} - ${timestamp}`;
  }

  private initializeConversationContext(): ConversationContext {
    return {
      sessionType: 'general',
      emotionalState: 'stable',
      preferredLiterature: ['big_book'],
      userGoals: [],
      challengeAreas: [],
    };
  }

  private initializeConversationMetadata(): ConversationMetadata {
    return {
      totalMessages: 0,
      averageResponseTime: 0,
      crisisFlags: [],
      topicsDiscussed: [],
      literatureRecommended: [],
      stepsExplored: [],
      traditionsDiscussed: [],
    };
  }

  private updateConversationMetadata(
    conversation: ChatConversation,
    message: ChatMessage
  ): void {
    conversation.metadata.totalMessages = conversation.messages.length;

    // Update average response time
    if (message.metadata?.processingTime) {
      const currentAvg = conversation.metadata.averageResponseTime;
      const totalMessages = conversation.metadata.totalMessages;

      conversation.metadata.averageResponseTime =
        (currentAvg * (totalMessages - 1) + message.metadata.processingTime) /
        totalMessages;
    }

    // Add topics discussed
    if (message.metadata?.messageType) {
      const topic = this.extractTopicFromMessageType(
        message.metadata.messageType
      );
      if (topic && !conversation.metadata.topicsDiscussed.includes(topic)) {
        conversation.metadata.topicsDiscussed.push(topic);
      }
    }
  }

  private updateConversationContextFromMessage(
    conversation: ChatConversation,
    message: ChatMessage
  ): void {
    // Update last activity
    conversation.context.lastActivity = message.timestamp;

    // Extract step references from message
    if (message.content) {
      const stepMatch = message.content.match(/step\s+(\d+)/gi);
      if (stepMatch) {
        const stepNumber = parseInt(stepMatch[0].replace(/\D/g, ''));
        if (stepNumber >= 1 && stepNumber <= 12) {
          conversation.context.currentStep = stepNumber;
          if (!conversation.metadata.stepsExplored.includes(stepNumber)) {
            conversation.metadata.stepsExplored.push(stepNumber);
          }
        }
      }

      // Extract tradition references
      const traditionMatch = message.content.match(/tradition\s+(\d+)/gi);
      if (traditionMatch) {
        const traditionNumber = parseInt(traditionMatch[0].replace(/\D/g, ''));
        if (traditionNumber >= 1 && traditionNumber <= 12) {
          if (
            !conversation.metadata.traditionsDiscussed.includes(traditionNumber)
          ) {
            conversation.metadata.traditionsDiscussed.push(traditionNumber);
          }
        }
      }
    }

    // Update emotional state based on message content and metadata
    if (
      message.metadata?.ruleTriggered &&
      message.metadata.ruleTriggered.length > 0
    ) {
      if (
        message.metadata.ruleTriggered.includes('crisis') ||
        message.metadata.ruleTriggered.includes('emergency')
      ) {
        conversation.context.emotionalState = 'crisis';
      } else if (
        message.metadata.ruleTriggered.includes('self_harm') ||
        message.metadata.ruleTriggered.includes('severe_depression')
      ) {
        conversation.context.emotionalState = 'stressed';
      }
    }
  }

  private extractTopicFromMessageType(messageType: string): string | null {
    const topicMap: Record<string, string> = {
      step_guidance: 'Step Work',
      literature_query: 'Literature Study',
      crisis: 'Crisis Support',
      help_request: 'General Support',
    };

    return topicMap[messageType] || null;
  }

  private getLastMessagePreview(messages?: any[]): string {
    if (!messages || messages.length === 0) {
      return 'No messages yet';
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content) {
      return 'No messages yet';
    }

    return lastMessage.content.length > 100
      ? lastMessage.content.substring(0, 97) + '...'
      : lastMessage.content;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    conversationCount: number;
  }> {
    try {
      const query = 'SELECT VALUE COUNT(1) FROM c WHERE c.isActive = true';
      const result = await this.dbClient.query(
        this.config.containerName!,
        query,
        []
      );

      return {
        healthy: true,
        conversationCount:
          result.items && result.items.length > 0
            ? (result.items[0] as number)
            : 0,
      };
    } catch (error) {
      this.logger.error('Conversation manager health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        healthy: false,
        conversationCount: 0,
      };
    }
  }
}
