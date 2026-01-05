// Digital Sponsor - Chat Service Main Entry Point
// Initializes and starts the chat service with all dependencies

import { config } from 'dotenv';
import { createServer } from 'http';
import winston from 'winston';
import { createChatAPI, createChatWebSocket } from './functions/chat-api.js';
import { ChatServiceConfig } from './services/chat-service.js';

// Load environment variables
config();

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
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

// Configuration validation
function validateConfig(): ChatServiceConfig {
  const requiredEnvVars = [
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_DEPLOYMENT_NAME',
    'LITERATURE_SERVICE_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }

  // Validate database connection
  if (!process.env.COSMOS_ENDPOINT && !process.env.COSMOS_CONNECTION_STRING) {
    throw new Error(
      'Either COSMOS_ENDPOINT or COSMOS_CONNECTION_STRING must be provided'
    );
  }

  return {
    openai: {
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME!,
      model: process.env.AZURE_OPENAI_MODEL || 'gpt-4',
      maxTokens: parseInt(process.env.AZURE_OPENAI_MAX_TOKENS || '1000'),
      temperature: parseFloat(process.env.AZURE_OPENAI_TEMPERATURE || '0.7'),
      topP: parseFloat(process.env.AZURE_OPENAI_TOP_P || '0.95'),
      frequencyPenalty: parseFloat(
        process.env.AZURE_OPENAI_FREQUENCY_PENALTY || '0'
      ),
      presencePenalty: parseFloat(
        process.env.AZURE_OPENAI_PRESENCE_PENALTY || '0'
      ),
      enableContentFiltering:
        process.env.AZURE_OPENAI_CONTENT_FILTERING !== 'false',
      enableModerationCheck:
        process.env.AZURE_OPENAI_MODERATION_CHECK !== 'false',
    },
    rag: {
      literatureServiceUrl: process.env.LITERATURE_SERVICE_URL!,
      maxSources: parseInt(process.env.RAG_MAX_SOURCES || '5'),
      relevanceThreshold: parseFloat(
        process.env.RAG_RELEVANCE_THRESHOLD || '0.6'
      ),
      searchTimeout: parseInt(process.env.RAG_SEARCH_TIMEOUT || '5000'),
      includeMetadata: process.env.RAG_INCLUDE_METADATA !== 'false',
    },
    conversation: {
      cosmosEndpoint: process.env.COSMOS_ENDPOINT,
      cosmosConnectionString: process.env.COSMOS_CONNECTION_STRING,
      databaseName: process.env.COSMOS_DATABASE_NAME || 'DigitalSponsor',
      containerName:
        process.env.COSMOS_CONVERSATIONS_CONTAINER || 'Conversations',
      maxContextMessages: parseInt(
        process.env.CONVERSATION_MAX_CONTEXT || '50'
      ),
      contextRetentionDays: parseInt(
        process.env.CONVERSATION_RETENTION_DAYS || '30'
      ),
      autoSummarization: process.env.CONVERSATION_AUTO_SUMMARY !== 'false',
    },
    enableRAG: process.env.ENABLE_RAG !== 'false',
    enableCrisisDetection: process.env.ENABLE_CRISIS_DETECTION !== 'false',
    enableRecommendations: process.env.ENABLE_RECOMMENDATIONS !== 'false',
  };
}

async function startServer() {
  try {
    logger.info('Starting Digital Sponsor Chat Service...');

    // Validate configuration
    const config = validateConfig();
    logger.info('Configuration validated successfully');

    // Create Express app
    const app = createChatAPI(config);

    // Create HTTP server
    const server = createServer(app);

    // Create WebSocket server
    createChatWebSocket(server, app.get('chatService'), logger);

    // Start server
    const port = parseInt(process.env.PORT || '3003');
    const host = process.env.HOST || '0.0.0.0';

    server.listen(port, host, () => {
      logger.info('Digital Sponsor Chat Service started successfully', {
        port,
        host,
        nodeEnv: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        features: {
          rag: config.enableRAG,
          crisisDetection: config.enableCrisisDetection,
          recommendations: config.enableRecommendations,
        },
        endpoints: {
          health: `http://${host}:${port}/health`,
          chat: `http://${host}:${port}/chat`,
          websocket: `ws://${host}:${port}/ws/chat`,
        },
      });
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);

      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close server after 10s
      setTimeout(() => {
        logger.error(
          'Could not close connections in time, forcefully shutting down'
        );
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled errors
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start Chat Service', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the service
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer, validateConfig };
