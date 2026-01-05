// Digital Sponsor - RAG (Retrieval-Augmented Generation) Service
// Integrates literature search with chat responses

import axios, { AxiosInstance } from 'axios';
import {
  ChatRequest,
  RAGContext,
  LiteratureReference,
  ConversationContext,
} from '../types/chat.js';
import winston from 'winston';

export interface RAGServiceConfig {
  literatureServiceUrl: string;
  maxSources?: number;
  relevanceThreshold?: number;
  searchTimeout?: number;
  includeMetadata?: boolean;
}

export interface LiteratureSearchRequest {
  query?: string;
  filters?: {
    type?: string[];
    stepReferences?: number[];
    traditionReferences?: number[];
    contentType?: string[];
    readingLevel?: string;
    sensitivityLevel?: string;
  };
  searchMode?: 'keyword' | 'semantic' | 'hybrid';
  pagination?: {
    skip?: number;
    take?: number;
  };
  facets?: boolean;
  highlights?: boolean;
}

export interface LiteratureSearchResponse {
  results: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    chapter?: string;
    page?: number;
    stepNumber?: number;
    score: number;
    highlights?: Record<string, string[]>;
    snippet?: string;
    source: {
      publication: string;
      edition?: string;
      year?: number;
    };
    classification: {
      contentType: string;
      readingLevel: string;
      sensitivityLevel: string;
    };
    searchMetadata: {
      keywords: string[];
      topics: string[];
      stepReferences: number[];
      traditionReferences: number[];
    };
  }>;
  totalCount: number;
  queryTime: number;
  searchMode: string;
  suggestions?: string[];
}

export class RAGService {
  private literatureClient: AxiosInstance;
  private config: RAGServiceConfig;
  private logger: winston.Logger;

  constructor(config: RAGServiceConfig, logger?: winston.Logger) {
    this.config = {
      maxSources: 5,
      relevanceThreshold: 0.6,
      searchTimeout: 5000,
      includeMetadata: true,
      ...config,
    };

    this.literatureClient = axios.create({
      baseURL: this.config.literatureServiceUrl,
      timeout: this.config.searchTimeout,
      headers: {
        'Content-Type': 'application/json',
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
  }

  async generateRAGContext(
    request: ChatRequest,
    context?: ConversationContext
  ): Promise<RAGContext | null> {
    const startTime = Date.now();

    try {
      // Extract search queries from the user message
      const searchQueries = this.extractSearchQueries(request.message, context);

      if (searchQueries.length === 0) {
        this.logger.debug('No relevant search queries extracted from message', {
          userId: request.userId,
          message: request.message.substring(0, 100),
        });
        return null;
      }

      // Perform literature search
      const searchResults = await this.searchLiterature(
        searchQueries,
        request,
        context
      );

      if (!searchResults || searchResults.length === 0) {
        this.logger.debug('No literature results found', {
          userId: request.userId,
          queries: searchQueries,
        });
        return null;
      }

      // Convert to literature references
      const literatureReferences =
        this.convertToLiteratureReferences(searchResults);

      // Calculate overall relevance score
      const relevanceScore =
        this.calculateOverallRelevanceScore(literatureReferences);

      const searchTime = Date.now() - startTime;

      const ragContext: RAGContext = {
        literatureUsed: literatureReferences,
        searchQuery: searchQueries.join('; '),
        relevanceScore,
        totalSources: literatureReferences.length,
        searchTime,
      };

      this.logger.info('RAG context generated successfully', {
        userId: request.userId,
        conversationId: request.conversationId,
        sourcesFound: literatureReferences.length,
        relevanceScore,
        searchTime,
      });

      return ragContext;
    } catch (error) {
      this.logger.error('Failed to generate RAG context', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.userId,
        conversationId: request.conversationId,
        searchTime: Date.now() - startTime,
      });
      return null;
    }
  }

  async formatContextForPrompt(ragContext: RAGContext): Promise<string> {
    if (!ragContext.literatureUsed || ragContext.literatureUsed.length === 0) {
      return '';
    }

    let contextString = 'RELEVANT AA LITERATURE:\n\n';

    ragContext.literatureUsed.forEach((ref, index) => {
      contextString += `${index + 1}. ${ref.title}`;

      if (ref.chapter) {
        contextString += ` - ${ref.chapter}`;
      }

      if (ref.page) {
        contextString += ` (page ${ref.page})`;
      }

      if (ref.stepNumber) {
        contextString += ` [Step ${ref.stepNumber}]`;
      }

      contextString += `\n   Source: ${ref.source.publication}`;

      if (ref.source.edition) {
        contextString += `, ${ref.source.edition}`;
      }

      contextString += `\n   Content: ${ref.snippet}\n\n`;
    });

    contextString += `Search performed: "${ragContext.searchQuery}"\n`;
    contextString += `Sources found: ${ragContext.totalSources}, Relevance: ${(ragContext.relevanceScore * 100).toFixed(1)}%\n`;

    return contextString;
  }

  private extractSearchQueries(
    message: string,
    context?: ConversationContext
  ): string[] {
    const queries: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Direct step references
    const stepMatches = message.match(
      /step\s+(\d+)|(\d+)(?:st|nd|rd|th)\s+step/gi
    );
    if (stepMatches) {
      stepMatches.forEach(match => {
        queries.push(`step ${match.replace(/\D/g, '')}`);
      });
    }

    // Tradition references
    const traditionMatches = message.match(
      /tradition\s+(\d+)|(\d+)(?:st|nd|rd|th)\s+tradition/gi
    );
    if (traditionMatches) {
      traditionMatches.forEach(match => {
        queries.push(`tradition ${match.replace(/\D/g, '')}`);
      });
    }

    // AA concepts and topics
    const aaTopics = {
      sponsor: 'sponsorship sponsor guide',
      inventory: 'moral inventory step 4',
      amends: 'making amends step 8 step 9',
      meditation: 'meditation prayer step 11',
      prayer: 'prayer meditation step 11',
      'higher power': 'higher power god step 2 step 3',
      powerless: 'powerlessness step 1',
      defects: 'character defects step 6 step 7',
      resentment: 'resentments inventory step 4',
      fear: 'fear inventory step 4',
      recovery: 'recovery sobriety',
      meeting: 'meetings fellowship',
      fellowship: 'fellowship meetings',
      serenity: 'serenity prayer acceptance',
      acceptance: 'acceptance serenity',
      surrender: 'surrender step 1 step 3',
      humility: 'humility step 7',
      honesty: 'honesty step 1',
      willingness: 'willingness step 6',
      spiritual: 'spiritual awakening step 12',
    };

    Object.entries(aaTopics).forEach(([keyword, searchTerm]) => {
      if (lowerMessage.includes(keyword)) {
        queries.push(searchTerm);
      }
    });

    // Use context to enhance search
    if (context?.currentStep) {
      queries.push(`step ${context.currentStep}`);
    }

    if (context?.currentTopic) {
      queries.push(context.currentTopic);
    }

    // If no specific topics found, use the full message as a search query
    if (queries.length === 0 && message.length > 10 && message.length < 200) {
      // Clean the message for searching
      const cleanedMessage = message
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanedMessage.length > 10) {
        queries.push(cleanedMessage);
      }
    }

    return [...new Set(queries)]; // Remove duplicates
  }

  private async searchLiterature(
    queries: string[],
    request: ChatRequest,
    context?: ConversationContext
  ): Promise<any[]> {
    const allResults: any[] = [];

    for (const query of queries.slice(0, 3)) {
      // Limit to 3 queries max
      try {
        const searchRequest: LiteratureSearchRequest = {
          query,
          searchMode: 'hybrid',
          pagination: {
            skip: 0,
            take: this.config.maxSources,
          },
          highlights: true,
          filters: this.buildSearchFilters(request, context),
        };

        const response =
          await this.literatureClient.post<LiteratureSearchResponse>(
            '/search',
            searchRequest
          );

        if (response.data && response.data.results) {
          // Filter by relevance threshold
          const relevantResults = response.data.results.filter(
            result => result.score >= (this.config.relevanceThreshold || 0.6)
          );

          allResults.push(...relevantResults);
        }
      } catch (error) {
        this.logger.warn('Literature search failed for query', {
          query,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueResults = allResults
      .reduce((acc, current) => {
        const existing = acc.find((item: any) => item.id === current.id);
        if (!existing || current.score > existing.score) {
          return [
            ...acc.filter((item: any) => item.id !== current.id),
            current,
          ];
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, this.config.maxSources);

    return uniqueResults;
  }

  private buildSearchFilters(
    request: ChatRequest,
    context?: ConversationContext
  ): any {
    const filters: any = {};

    // Apply user preferences
    if (request.options?.searchFilters) {
      Object.assign(filters, request.options.searchFilters);
    }

    // Apply context filters
    if (
      context?.preferredLiterature &&
      context.preferredLiterature.length > 0
    ) {
      filters.type = context.preferredLiterature;
    }

    if (context?.currentStep) {
      filters.stepReferences = [context.currentStep];
    }

    // Default to appropriate reading level and sensitivity
    if (!filters.readingLevel) {
      filters.readingLevel = 'basic';
    }

    if (!filters.sensitivityLevel) {
      filters.sensitivityLevel =
        context?.emotionalState === 'crisis' ? 'general' : undefined;
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  private convertToLiteratureReferences(
    searchResults: any[]
  ): LiteratureReference[] {
    return searchResults.map(result => ({
      id: result.id,
      title: result.title,
      type: result.type,
      chapter: result.chapter,
      page: result.page,
      stepNumber: result.stepNumber,
      snippet: result.snippet || result.content.substring(0, 300) + '...',
      relevanceScore: result.score,
      source: result.source,
    }));
  }

  private calculateOverallRelevanceScore(
    references: LiteratureReference[]
  ): number {
    if (references.length === 0) return 0;

    const totalScore = references.reduce(
      (sum, ref) => sum + ref.relevanceScore,
      0
    );
    return totalScore / references.length;
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency: number;
    endpoint: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.literatureClient.get('/health');
      const latency = Date.now() - startTime;

      return {
        healthy: response.status === 200,
        latency,
        endpoint: this.config.literatureServiceUrl,
      };
    } catch (error) {
      this.logger.error('Literature service health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        healthy: false,
        latency: Date.now() - startTime,
        endpoint: this.config.literatureServiceUrl,
      };
    }
  }
}
