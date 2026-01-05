// Simple conversation manager stub for testing
import winston from 'winston';
import {
  ChatConversation,
  ChatMessage,
  ConversationContext,
  ConversationMetadata,
  CrisisFlag,
} from '../types/chat.js';

export interface ConversationManagerConfig {
  cosmosConnectionString?: string;
  cosmosEndpoint?: string;
  cosmosKey?: string;
  databaseName?: string;
  containerName?: string;
  maxContextMessages?: number;
  contextRetentionDays?: number;
  sessionTimeout?: number;
  enableCompression?: boolean;
}

export class ConversationManager {
  private config: ConversationManagerConfig;
  private logger: winston.Logger;
  private conversations = new Map<string, ChatConversation>();
  private messages = new Map<string, ChatMessage[]>();

  constructor(config: ConversationManagerConfig, logger?: winston.Logger) {
    this.config = config;
    this.logger =
      logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()],
      });
  }

  async getConversation(
    conversationId: string
  ): Promise<ChatConversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async createConversation(
    userId: string,
    sessionId?: string,
    context?: Partial<ConversationContext>
  ): Promise<ChatConversation> {
    const now = new Date().toISOString();
    const conversation: ChatConversation = {
      id: Date.now().toString(),
      userId,
      sessionId,
      messages: [],
      context: context || {},
      metadata: {
        totalMessages: 0,
        averageResponseTime: 0,
        crisisFlags: [],
        topicsDiscussed: [],
        literatureRecommended: [],
        stepsExplored: [],
        traditionsDiscussed: [],
      },
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);

    return conversation;
  }

  async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    sessionId?: string
  ): Promise<ChatConversation> {
    if (conversationId) {
      const existing = await this.getConversation(conversationId);
      if (existing) return existing;
    }

    return this.createConversation(userId, sessionId);
  }

  async getConversationHistory(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<ChatMessage[]> {
    const messages = this.messages.get(conversationId) || [];
    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return messages.slice(start, end);
  }

  async addMessage(message: ChatMessage): Promise<ChatConversation> {
    const conversationMessages =
      this.messages.get(message.conversationId) || [];
    conversationMessages.push(message);
    this.messages.set(message.conversationId, conversationMessages);

    // Update conversation metadata
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = new Date().toISOString();
      conversation.metadata.totalMessages = conversationMessages.length;
      conversation.messages = conversationMessages;
      this.conversations.set(conversation.id, conversation);
      return conversation;
    }

    throw new Error('Conversation not found');
  }

  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.context = { ...conversation.context, ...context };
      this.conversations.set(conversationId, conversation);
    }
  }

  async getActiveConversations(userId: string): Promise<ChatConversation[]> {
    return Array.from(this.conversations.values()).filter(
      conv => conv.userId === userId
    );
  }

  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, conversation);
    }
  }

  async deactivateConversation(conversationId: string): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.isActive = false;
      conversation.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, conversation);
    }
  }

  async addCrisisFlag(conversationId: string, flag: CrisisFlag): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.metadata.crisisFlags.push(flag);
      conversation.updatedAt = new Date().toISOString();
      this.conversations.set(conversationId, conversation);
    }
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    conversationCount?: number;
  }> {
    return {
      healthy: true,
      status: 'Conversation manager stub is healthy',
      conversationCount: this.conversations.size,
    };
  }

  async cleanupExpiredConversations(): Promise<number> {
    // Stub - would normally clean up old conversations
    return 0;
  }
}
