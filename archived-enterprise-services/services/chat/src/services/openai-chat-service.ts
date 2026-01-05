// Digital Sponsor - Azure OpenAI Chat Service
// Handles chat completion with Azure OpenAI and content moderation

import OpenAI from 'openai';
import {
  ChatMessage,
  ChatRequest,
  ChatOptions,
  StreamingChatChunk,
  CrisisFlag,
  ConversationContext,
} from '../types/chat.js';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface OpenAIChatServiceConfig {
  endpoint: string;
  apiKey: string;
  deploymentName: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  enableContentFiltering?: boolean;
  enableModerationCheck?: boolean;
}

interface ChatMessageForApi {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIChatService {
  private client: OpenAI;
  private config: OpenAIChatServiceConfig;
  private logger: winston.Logger;

  constructor(config: OpenAIChatServiceConfig, logger?: winston.Logger) {
    this.config = {
      model: 'gpt-4o',
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
      enableContentFiltering: true,
      enableModerationCheck: true,
      ...config,
    };

    // Initialize Azure OpenAI client
    this.client = new OpenAI({
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}`,
      apiKey: this.config.apiKey,
      defaultQuery: { 'api-version': '2024-10-01-preview' },
      defaultHeaders: {
        'User-Agent': 'digital-sponsor-chat-service',
      },
    });

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

    this.logger.info('Azure OpenAI service initialized', {
      endpoint: this.config.endpoint,
      deployment: this.config.deploymentName,
      model: this.config.model,
    });
  }

  async generateChatCompletion(
    request: ChatRequest,
    conversationHistory: ChatMessage[] = [],
    ragContext?: string
  ): Promise<ChatMessage> {
    const startTime = Date.now();

    try {
      // Content moderation check if enabled
      if (this.config.enableModerationCheck) {
        await this.checkContent(request.message);
      }

      // Build system message with AA principles
      const systemMessage = this.buildSystemMessage(
        request.context,
        ragContext
      );

      // Convert conversation history to OpenAI format
      const messages: ChatMessageForApi[] = [
        { role: 'system', content: systemMessage },
        ...this.formatConversationHistory(conversationHistory),
        { role: 'user', content: request.message },
      ];

      // Apply options
      const options = this.mergeOptions(request.options);

      // Generate completion
      const completion = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages: messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: false,
      });

      if (!completion.choices || completion.choices.length === 0) {
        throw new Error('No response generated from Azure OpenAI');
      }

      const choice = completion.choices[0];
      const processingTime = Date.now() - startTime;

      // Check for crisis indicators in response
      const crisisFlags = await this.detectCrisisIndicators(
        request.message,
        choice.message?.content || ''
      );

      // Build response message
      const chatMessage: ChatMessage = {
        id: uuidv4(),
        conversationId: request.conversationId || uuidv4(),
        role: 'assistant',
        content: choice.message?.content || '',
        timestamp: new Date().toISOString(),
        metadata: {
          userId: request.userId,
          sessionId: request.sessionId,
          messageType: this.classifyMessageType(request.message),
          confidence: this.calculateConfidenceScore(choice),
          processingTime,
          modelUsed: this.config.model,
          tokensUsed: completion.usage?.total_tokens,
          ruleTriggered:
            crisisFlags.length > 0 ? crisisFlags.map(f => f.type) : undefined,
        },
      };

      this.logger.info('Azure OpenAI completion generated successfully', {
        conversationId: chatMessage.conversationId,
        userId: request.userId,
        processingTime,
        tokensUsed: completion.usage?.total_tokens,
        crisisFlags: crisisFlags.length,
        finishReason: choice.finish_reason,
      });

      return chatMessage;
    } catch (error) {
      this.logger.error('Failed to generate chat completion', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        conversationId: request.conversationId,
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  async generateStreamingCompletion(
    request: ChatRequest,
    conversationHistory: ChatMessage[] = [],
    ragContext: string | undefined,
    onChunk: (chunk: StreamingChatChunk) => void
  ): Promise<ChatMessage> {
    const startTime = Date.now();
    const messageId = uuidv4();
    const conversationId = request.conversationId || uuidv4();
    let fullContent = '';

    try {
      const systemMessage = this.buildSystemMessage(
        request.context,
        ragContext
      );
      const messages: ChatMessageForApi[] = [
        { role: 'system', content: systemMessage },
        ...this.formatConversationHistory(conversationHistory),
        { role: 'user', content: request.message },
      ];

      const options = this.mergeOptions(request.options);

      const stream = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages: messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        top_p: this.config.topP,
        frequency_penalty: this.config.frequencyPenalty,
        presence_penalty: this.config.presencePenalty,
        stream: true,
      });

      let totalTokens = 0;

      for await (const chunk of stream) {
        if (chunk.choices && chunk.choices.length > 0) {
          const delta = chunk.choices[0].delta;
          if (delta?.content) {
            fullContent += delta.content;

            // Send streaming chunk
            const streamChunk: StreamingChatChunk = {
              id: messageId,
              conversationId,
              chunk: delta.content,
              finished: false,
            };

            onChunk(streamChunk);
          }

          if (chunk.choices[0].finish_reason) {
            // Send final chunk
            const finalChunk: StreamingChatChunk = {
              id: messageId,
              conversationId,
              chunk: '',
              finished: true,
              metadata: {
                tokens_used: totalTokens,
                finish_reason: chunk.choices[0].finish_reason,
              },
            };

            onChunk(finalChunk);
          }
        }

        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      // Create final message
      const processingTime = Date.now() - startTime;
      const crisisFlags = await this.detectCrisisIndicators(
        request.message,
        fullContent
      );

      const chatMessage: ChatMessage = {
        id: messageId,
        conversationId,
        role: 'assistant',
        content: fullContent,
        timestamp: new Date().toISOString(),
        metadata: {
          userId: request.userId,
          sessionId: request.sessionId,
          messageType: this.classifyMessageType(request.message),
          processingTime,
          modelUsed: this.config.model,
          tokensUsed: totalTokens,
          ruleTriggered:
            crisisFlags.length > 0 ? crisisFlags.map(f => f.type) : undefined,
        },
      };

      this.logger.info('Azure OpenAI streaming completion generated', {
        conversationId,
        userId: request.userId,
        processingTime,
        tokensUsed: totalTokens,
        contentLength: fullContent.length,
      });

      return chatMessage;
    } catch (error) {
      this.logger.error('Failed to generate streaming completion', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        conversationId,
        processingTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  private buildSystemMessage(
    context?: Partial<ConversationContext>,
    ragContext?: string
  ): string {
    let systemPrompt = `You are a supportive AI assistant for the Digital Sponsor platform, designed to help individuals in recovery from alcohol addiction using the principles of Alcoholics Anonymous.

CORE PRINCIPLES:
- Follow AA traditions and maintain anonymity
- Provide supportive, non-judgmental responses
- Encourage connection with sponsor, meetings, and fellowship
- Focus on the 12 Steps and AA literature
- Never provide medical advice or replace professional treatment
- Maintain hope and emphasize that recovery is possible

RESPONSE GUIDELINES:
- Be compassionate, understanding, and supportive
- Use inclusive language that respects all backgrounds
- Encourage personal responsibility and growth
- Share general AA principles, not personal stories
- If someone is in crisis, provide emergency resources
- Keep responses focused on recovery and AA principles

`;

    if (context?.currentStep) {
      systemPrompt += `CURRENT FOCUS: The user is working on Step ${context.currentStep} of the AA program.\n`;
    }

    if (context?.sessionType) {
      systemPrompt += `SESSION TYPE: This is a ${context.sessionType} conversation.\n`;
    }

    if (context?.emotionalState && context.emotionalState !== 'stable') {
      systemPrompt += `EMOTIONAL STATE: The user appears to be ${context.emotionalState}. Respond with extra care and support.\n`;
    }

    if (ragContext) {
      systemPrompt += `\nRELEVANT AA LITERATURE:\n${ragContext}\n\nUse this literature to inform your response when relevant, but don't quote it verbatim unless specifically asked.\n`;
    }

    systemPrompt += `\nRemember: You are here to support, not to replace human connection. Always encourage real-world AA fellowship and professional help when needed.`;

    return systemPrompt;
  }

  private formatConversationHistory(
    messages: ChatMessage[]
  ): ChatMessageForApi[] {
    // Take last N messages to stay within token limits
    const maxContextMessages = 10;
    const recentMessages = messages.slice(-maxContextMessages);

    return recentMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
  }

  private mergeOptions(
    options?: ChatOptions
  ): Required<Pick<ChatOptions, 'maxTokens' | 'temperature'>> {
    return {
      maxTokens: options?.maxTokens || this.config.maxTokens || 1000,
      temperature: options?.temperature || this.config.temperature || 0.7,
    };
  }

  private async checkContent(content: string): Promise<void> {
    // Implement content moderation using Azure Content Safety or OpenAI moderation
    // For now, basic keyword checking
    const prohibitedKeywords = [
      'suicide',
      'self-harm',
      'kill myself',
      'end my life',
    ];
    const lowerContent = content.toLowerCase();

    for (const keyword of prohibitedKeywords) {
      if (lowerContent.includes(keyword)) {
        this.logger.warn('Potentially harmful content detected', { keyword });
        // Don't block, but flag for crisis detection
        break;
      }
    }
  }

  private async detectCrisisIndicators(
    userMessage: string,
    assistantResponse: string
  ): Promise<CrisisFlag[]> {
    const flags: CrisisFlag[] = [];
    const lowerUserMessage = userMessage.toLowerCase();

    // Substance use indicators
    if (
      lowerUserMessage.includes('drink') ||
      lowerUserMessage.includes('relapse') ||
      lowerUserMessage.includes('using')
    ) {
      flags.push({
        type: 'substance_use',
        confidence: 0.7,
        timestamp: new Date().toISOString(),
        action_taken: 'flagged_for_review',
        resolved: false,
      });
    }

    // Self-harm indicators
    const selfHarmKeywords = [
      'hurt myself',
      'suicide',
      'kill myself',
      'end it all',
      'give up',
    ];
    if (selfHarmKeywords.some(keyword => lowerUserMessage.includes(keyword))) {
      flags.push({
        type: 'self_harm',
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        action_taken: 'emergency_resources_provided',
        resolved: false,
      });
    }

    // Emergency indicators
    const emergencyKeywords = [
      'emergency',
      'overdose',
      'hospital',
      'dangerous',
    ];
    if (emergencyKeywords.some(keyword => lowerUserMessage.includes(keyword))) {
      flags.push({
        type: 'emergency',
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        action_taken: 'emergency_contacts_suggested',
        resolved: false,
      });
    }

    // Depression indicators
    const depressionKeywords = [
      'hopeless',
      'worthless',
      'pointless',
      'no reason to live',
    ];
    if (
      depressionKeywords.some(keyword => lowerUserMessage.includes(keyword))
    ) {
      flags.push({
        type: 'severe_depression',
        confidence: 0.6,
        timestamp: new Date().toISOString(),
        action_taken: 'support_resources_suggested',
        resolved: false,
      });
    }

    return flags;
  }

  private classifyMessageType(
    message: string
  ): 'text' | 'help_request' | 'crisis' | 'step_guidance' | 'literature_query' {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('help') ||
      lowerMessage.includes('support') ||
      lowerMessage.includes('crisis')
    ) {
      return 'help_request';
    }

    if (
      lowerMessage.includes('step') ||
      lowerMessage.includes('inventory') ||
      lowerMessage.includes('amends')
    ) {
      return 'step_guidance';
    }

    if (
      lowerMessage.includes('book') ||
      lowerMessage.includes('literature') ||
      lowerMessage.includes('reading')
    ) {
      return 'literature_query';
    }

    if (
      lowerMessage.includes('emergency') ||
      lowerMessage.includes('suicide') ||
      lowerMessage.includes('overdose')
    ) {
      return 'crisis';
    }

    return 'text';
  }

  private calculateConfidenceScore(completion: any): number {
    // Simple confidence calculation based on response characteristics
    if (!completion.message?.content) return 0;

    const contentLength = completion.message.content.length;
    const hasSpecificKeywords = /step|tradition|sponsor|meeting|recovery/.test(
      completion.message.content.toLowerCase()
    );

    let confidence = 0.5;

    if (contentLength > 50 && contentLength < 500) {
      confidence += 0.2;
    }

    if (hasSpecificKeywords) {
      confidence += 0.2;
    }

    if (completion.finish_reason === 'stop') {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    model: string;
  }> {
    const startTime = Date.now();

    try {
      const testResponse = await this.client.chat.completions.create({
        model: this.config.deploymentName,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });

      const latency = Date.now() - startTime;

      return {
        healthy: testResponse.choices.length > 0,
        latency,
        model: this.config.model || 'unknown',
      };
    } catch (error) {
      this.logger.error('Azure OpenAI health check failed', {
        error: error instanceof Error ? error.message : String(error),
        endpoint: this.config.endpoint,
        deployment: this.config.deploymentName,
      });
      return {
        healthy: false,
        latency: Date.now() - startTime,
        model: this.config.model || 'unknown',
      };
    }
  }
}
