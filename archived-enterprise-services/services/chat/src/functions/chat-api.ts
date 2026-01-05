// Digital Sponsor - Chat API Functions
// Express endpoints for chat functionality

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import winston from 'winston';
import Joi from 'joi';
import { ChatService, ChatServiceConfig } from '../services/chat-service.js';
import {
  ChatRequest,
  StreamingChatRequest,
  StreamingChatChunk,
  ConversationContext,
} from '../types/chat.js';
import WebSocket from 'ws';

// Validation schemas
const chatRequestSchema = Joi.object({
  message: Joi.string().required().min(1).max(4000),
  conversationId: Joi.string().uuid().optional(),
  userId: Joi.string().required(),
  sessionId: Joi.string().optional(),
  context: Joi.object({
    currentStep: Joi.number().min(1).max(12).optional(),
    currentTopic: Joi.string().optional(),
    userGoals: Joi.array().items(Joi.string()).optional(),
    challengeAreas: Joi.array().items(Joi.string()).optional(),
    preferredLiterature: Joi.array().items(Joi.string()).optional(),
    sessionType: Joi.string()
      .valid('general', 'step_work', 'crisis_support', 'meditation')
      .optional(),
    emotionalState: Joi.string()
      .valid('stable', 'stressed', 'crisis', 'celebrating')
      .optional(),
  }).optional(),
  options: Joi.object({
    includeRAG: Joi.boolean().optional(),
    maxRAGSources: Joi.number().min(1).max(10).optional(),
    searchFilters: Joi.object({
      literatureTypes: Joi.array().items(Joi.string()).optional(),
      steps: Joi.array().items(Joi.number().min(1).max(12)).optional(),
      traditions: Joi.array().items(Joi.number().min(1).max(12)).optional(),
      readingLevel: Joi.string()
        .valid('basic', 'intermediate', 'advanced')
        .optional(),
    }).optional(),
    responseStyle: Joi.string()
      .valid('supportive', 'educational', 'reflective', 'directive')
      .optional(),
    maxTokens: Joi.number().min(100).max(2000).optional(),
    temperature: Joi.number().min(0).max(2).optional(),
  }).optional(),
});

const conversationUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  context: Joi.object({
    currentStep: Joi.number().min(1).max(12).optional(),
    currentTopic: Joi.string().optional(),
    sessionType: Joi.string()
      .valid('general', 'step_work', 'crisis_support', 'meditation')
      .optional(),
    emotionalState: Joi.string()
      .valid('stable', 'stressed', 'crisis', 'celebrating')
      .optional(),
  }).optional(),
});

export function createChatAPI(config: ChatServiceConfig): express.Application {
  const app = express();

  // Create logger
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });

  // Initialize chat service
  const chatService = new ChatService(config, logger);

  // Middleware
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info('API Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
      });
    });
    next();
  });

  // Health check endpoint
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await chatService.healthCheck();
      const statusCode =
        health.status === 'healthy'
          ? 200
          : health.status === 'degraded'
            ? 206
            : 503;

      res.status(statusCode).json({
        status: health.status,
        timestamp: new Date().toISOString(),
        services: {
          openai: health.openaiConnected,
          literature: health.literatureServiceConnected,
          conversations: true,
        },
        metrics: {
          averageResponseTime: health.averageResponseTime,
          activeConversations: health.activeConversations,
        },
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Chat completion endpoint
  app.post('/chat', async (req: Request, res: Response) => {
    try {
      // Validate request
      const { error, value } = chatRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
      }

      const chatRequest: ChatRequest = value;

      // Process chat message
      const response = await chatService.processMessage(chatRequest);

      res.json({
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Chat completion failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.body?.userId,
        conversationId: req.body?.conversationId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Streaming chat endpoint
  app.post('/chat/stream', async (req: Request, res: Response) => {
    try {
      // Validate request
      const { error, value } = chatRequestSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => d.message),
        });
      }

      const chatRequest: StreamingChatRequest = { ...value, stream: true };

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Handle client disconnect
      let isClientConnected = true;
      req.on('close', () => {
        isClientConnected = false;
      });

      // Stream handler
      const streamHandler = (chunk: StreamingChatChunk) => {
        if (!isClientConnected) return;

        res.write(
          `data: ${JSON.stringify({
            type: 'chunk',
            data: chunk,
          })}\n\n`
        );

        if (chunk.finished) {
          res.write(
            `data: ${JSON.stringify({
              type: 'complete',
              timestamp: new Date().toISOString(),
            })}\n\n`
          );
          res.end();
        }
      };

      // Process streaming message
      const response = await chatService.processStreamingMessage(
        chatRequest,
        streamHandler
      );

      // Send final response data
      if (isClientConnected) {
        res.write(
          `data: ${JSON.stringify({
            type: 'response',
            data: {
              conversation: response.conversation,
              suggestions: response.suggestions,
              resources: response.resources,
              nextSteps: response.nextSteps,
            },
          })}\n\n`
        );
      }
    } catch (error) {
      logger.error('Streaming chat failed', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.body?.userId,
        conversationId: req.body?.conversationId,
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to process streaming message',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  // Get conversation history
  app.get('/conversations', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!userId) {
        return res.status(400).json({
          error: 'userId query parameter is required',
        });
      }

      const conversations = await chatService.getConversationHistory(
        userId,
        limit,
        offset
      );

      res.json({
        success: true,
        data: conversations,
        pagination: {
          limit,
          offset,
          total: conversations.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to get conversation history', {
        error: error instanceof Error ? error.message : String(error),
        userId: req.query.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get conversation history',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Get specific conversation
  app.get(
    '/conversations/:conversationId',
    async (req: Request, res: Response) => {
      try {
        const conversationId = req.params.conversationId;
        const userId = req.query.userId as string;

        if (!userId) {
          return res.status(400).json({
            error: 'userId query parameter is required',
          });
        }

        const conversation = await chatService.getConversation(
          conversationId,
          userId
        );

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found',
          });
        }

        res.json({
          success: true,
          data: conversation,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to get conversation', {
          error: error instanceof Error ? error.message : String(error),
          conversationId: req.params.conversationId,
          userId: req.query.userId,
        });

        res.status(500).json({
          success: false,
          error: 'Failed to get conversation',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Update conversation (title, context)
  app.patch(
    '/conversations/:conversationId',
    async (req: Request, res: Response) => {
      try {
        const conversationId = req.params.conversationId;
        const userId = req.body.userId;

        if (!userId) {
          return res.status(400).json({
            error: 'userId is required in request body',
          });
        }

        // Validate request
        const { error, value } = conversationUpdateSchema.validate(req.body);
        if (error) {
          return res.status(400).json({
            error: 'Validation failed',
            details: error.details.map(d => d.message),
          });
        }

        // Update title if provided
        if (value.title) {
          await chatService.updateConversationTitle(
            conversationId,
            userId,
            value.title
          );
        }

        // Update context if provided
        if (value.context) {
          // This would require a method in ConversationManager
          // await chatService.updateConversationContext(conversationId, userId, value.context);
        }

        res.json({
          success: true,
          message: 'Conversation updated successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to update conversation', {
          error: error instanceof Error ? error.message : String(error),
          conversationId: req.params.conversationId,
          userId: req.body.userId,
        });

        res.status(500).json({
          success: false,
          error: 'Failed to update conversation',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Deactivate conversation
  app.delete(
    '/conversations/:conversationId',
    async (req: Request, res: Response) => {
      try {
        const conversationId = req.params.conversationId;
        const userId = req.query.userId as string;

        if (!userId) {
          return res.status(400).json({
            error: 'userId query parameter is required',
          });
        }

        await chatService.deactivateConversation(conversationId, userId);

        res.json({
          success: true,
          message: 'Conversation deactivated successfully',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('Failed to deactivate conversation', {
          error: error instanceof Error ? error.message : String(error),
          conversationId: req.params.conversationId,
          userId: req.query.userId,
        });

        res.status(500).json({
          success: false,
          error: 'Failed to deactivate conversation',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Error handling middleware
  app.use(
    (error: Error, req: Request, res: Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  );

  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}

// WebSocket handler for real-time chat
export function createChatWebSocket(
  server: any,
  chatService: ChatService,
  logger: winston.Logger
) {
  const wss = new WebSocket.Server({ server, path: '/ws/chat' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    logger.info('WebSocket connection established', {
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'chat') {
          // Validate chat request
          const { error, value } = chatRequestSchema.validate(message.data);
          if (error) {
            ws.send(
              JSON.stringify({
                type: 'error',
                error: 'Validation failed',
                details: error.details.map(d => d.message),
              })
            );
            return;
          }

          const chatRequest: StreamingChatRequest = { ...value, stream: true };

          // Stream handler for WebSocket
          const streamHandler = (chunk: StreamingChatChunk) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: 'chunk',
                  data: chunk,
                })
              );
            }
          };

          const response = await chatService.processStreamingMessage(
            chatRequest,
            streamHandler
          );

          // Send final response
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'complete',
                data: {
                  conversation: response.conversation,
                  suggestions: response.suggestions,
                  resources: response.resources,
                  nextSteps: response.nextSteps,
                },
              })
            );
          }
        }
      } catch (error) {
        logger.error('WebSocket message processing failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Failed to process message',
              message: error instanceof Error ? error.message : String(error),
            })
          );
        }
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });

    ws.on('error', error => {
      logger.error('WebSocket error', { error: error.message });
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to Digital Sponsor Chat Service',
        timestamp: new Date().toISOString(),
      })
    );
  });

  return wss;
}
