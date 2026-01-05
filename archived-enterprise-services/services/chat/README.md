# Digital Sponsor Chat Service

A conversational AI service for recovery support using Azure OpenAI and RAG (Retrieval-Augmented
Generation) with AA literature.

## Features

- **Azure OpenAI Integration**: GPT-4 powered conversations with AA-focused prompts
- **RAG (Retrieval-Augmented Generation)**: Literature-informed responses using vector search
- **Conversation Management**: Persistent conversation history and context tracking
- **Crisis Detection**: Automated detection and response for crisis situations
- **Streaming Support**: Real-time streaming responses via REST API and WebSocket
- **Session Awareness**: Integration with user sessions and preferences
- **Resource Recommendations**: Automated suggestions for literature, meetings, and support

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Chat Client   │────│   Chat API      │────│  OpenAI Chat    │
│   (Frontend)    │    │  (Express.js)   │    │    Service      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  RAG Service    │────│ Literature      │
                       │  (Vector Search)│    │   Service       │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Conversation    │
                       │   Manager       │
                       │ (Cosmos DB)     │
                       └─────────────────┘
```

## API Endpoints

### Health Check

```
GET /health
```

### Chat Completion

```
POST /chat
Content-Type: application/json

{
  "message": "I'm struggling with step 4",
  "userId": "user123",
  "conversationId": "conv456", // optional
  "sessionId": "session789",   // optional
  "context": {                 // optional
    "currentStep": 4,
    "emotionalState": "stressed"
  },
  "options": {                 // optional
    "includeRAG": true,
    "maxRAGSources": 3,
    "responseStyle": "supportive"
  }
}
```

### Streaming Chat

```
POST /chat/stream
Content-Type: application/json
Accept: text/event-stream

// Same request body as /chat
// Returns Server-Sent Events stream
```

### Conversation Management

```
GET /conversations?userId=user123           # Get conversation history
GET /conversations/{conversationId}?userId=user123  # Get specific conversation
PATCH /conversations/{conversationId}       # Update conversation title/context
DELETE /conversations/{conversationId}?userId=user123  # Deactivate conversation
```

### WebSocket

```
ws://localhost:3003/ws/chat

// Send messages:
{
  "type": "chat",
  "data": {
    "message": "Hello",
    "userId": "user123"
  }
}

// Receive streaming responses:
{
  "type": "chunk",
  "data": {
    "chunk": "Hello, I'm here to help...",
    "finished": false
  }
}
```

## Configuration

Copy `.env.example` to `.env` and configure:

### Required Variables

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com
AZURE_OPENAI_API_KEY=your_api_key_here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Literature Service
LITERATURE_SERVICE_URL=http://localhost:3002

# Database
COSMOS_CONNECTION_STRING=AccountEndpoint=https://...
COSMOS_DATABASE_NAME=DigitalSponsor
```

### Optional Variables

```bash
# Server
PORT=3003
LOG_LEVEL=info

# OpenAI Parameters
AZURE_OPENAI_MAX_TOKENS=1000
AZURE_OPENAI_TEMPERATURE=0.7

# RAG Settings
RAG_MAX_SOURCES=5
RAG_RELEVANCE_THRESHOLD=0.6

# Features
ENABLE_RAG=true
ENABLE_CRISIS_DETECTION=true
```

## Installation & Setup

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Build the service
npm run build

# Run tests
npm test

# Start development server
npm run dev

# Start production server
npm start
```

## Development

```bash
# Watch mode for development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm test
npm run test:watch
npm run test:coverage
```

## Integration Requirements

### Prerequisites

1. **Literature Service**: Must be running and accessible
2. **Azure OpenAI**: Deployed GPT-4 model
3. **Cosmos DB**: Database with Conversations container
4. **Azure Cognitive Search**: For literature vector search

### Container Setup

The service expects a `Conversations` container in Cosmos DB with:

- Partition key: `/userId`
- Indexing policy: Default (all paths indexed)

### Literature Service Integration

The chat service connects to the literature service for RAG functionality:

```bash
# Literature service must expose:
POST /search  # For literature queries
GET /health   # For health checks
```

## Crisis Detection

The service includes automated crisis detection for:

- **Substance Use**: Relapse or drinking mentions
- **Self-Harm**: Suicidal ideation or self-harm
- **Emergency**: Medical emergencies or overdoses
- **Severe Depression**: Hopelessness or despair

Crisis flags trigger:

- Enhanced logging and monitoring
- Resource recommendations (hotlines, emergency contacts)
- Conversation metadata updates
- Optional external notifications

## Security Considerations

- **Content Filtering**: Azure OpenAI content safety
- **Input Validation**: Joi schema validation on all inputs
- **Rate Limiting**: Consider implementing rate limiting in production
- **Authentication**: Integrate with your authentication system
- **Data Encryption**: Conversation data encrypted at rest in Cosmos DB
- **Logging**: Structured logging without exposing PII

## Monitoring & Observability

The service provides:

- Health endpoints for liveness/readiness probes
- Structured JSON logging
- Performance metrics (response times, token usage)
- Error tracking and alerting hooks
- Conversation analytics and insights

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3003
CMD ["npm", "start"]
```

### Environment Variables in Production

- Use Azure Key Vault or similar for secrets
- Enable Azure Managed Identity for database access
- Configure CORS_ORIGIN for your frontend domains
- Set LOG_LEVEL=warn or error for production

## Testing

The service includes comprehensive tests:

```bash
# Unit tests
npm test

# Integration tests (requires test database)
npm run test:integration

# Coverage report
npm run test:coverage
```

## Performance

Typical response times:

- **Simple chat**: 500-1000ms
- **RAG-enhanced chat**: 1000-2000ms
- **Vector search latency**: 200-500ms
- **Database operations**: 50-200ms

## Troubleshooting

### Common Issues

1. **OpenAI Connection Failed**
   - Check AZURE_OPENAI_ENDPOINT and API key
   - Verify deployment name exists

2. **Literature Service Unavailable**
   - Ensure literature service is running
   - Check LITERATURE_SERVICE_URL

3. **Database Connection Failed**
   - Verify Cosmos DB connection string
   - Check database and container names

4. **RAG Not Working**
   - Verify literature service has indexed content
   - Check RAG_RELEVANCE_THRESHOLD settings

### Debug Mode

```bash
LOG_LEVEL=debug npm run dev
```

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Ensure TypeScript compilation passes
5. Follow AA principles in prompts and responses
