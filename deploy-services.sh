#!/bin/bash

# Deploy Digital Sponsor Chat and Literature Services to Azure Container Instances
# This script creates containerized versions of both services for production deployment

set -e  # Exit on any error

# Configuration
RESOURCE_GROUP="rg-digitalsponsor-new"
LOCATION="eastus2"
SUBSCRIPTION_ID="4ce39f78-e1f1-4e66-aa8e-4bb14e04f9dc"

# Service Configuration
CHAT_SERVICE_IMAGE="digitalsponsor-chat:latest"
LITERATURE_SERVICE_IMAGE="digitalsponsor-literature:latest"

# Container Instance Names
CHAT_CONTAINER="chat-service-prod"
LITERATURE_CONTAINER="literature-service-prod"

echo "🚀 Deploying Digital Sponsor Services to Azure Container Instances"
echo "📍 Resource Group: $RESOURCE_GROUP"
echo "🌍 Location: $LOCATION"
echo ""

# Create Dockerfile for Chat Service
echo "📦 Creating Chat Service Dockerfile..."
cat > services/chat/Dockerfile.prod << 'EOF'
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY simple-test.cjs ./
COPY .env ./

# Expose port
EXPOSE 3003

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Start the application
CMD ["node", "simple-test.cjs"]
EOF

# Create Dockerfile for Literature Service  
echo "📦 Creating Literature Service Dockerfile..."
cat > services/literature/Dockerfile.prod << 'EOF'
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY simple-test.cjs ./
COPY .env ./

# Expose port
EXPOSE 3002

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Start the application
CMD ["node", "simple-test.cjs"]
EOF

# Build and deploy Chat Service
echo ""
echo "🏗️  Building and Deploying Chat Service..."

# Create temporary build context
mkdir -p temp-chat-build
cp services/chat/package*.json temp-chat-build/
cp services/chat/simple-test.cjs temp-chat-build/
cp services/chat/.env temp-chat-build/
cp services/chat/Dockerfile.prod temp-chat-build/Dockerfile

# Deploy to Azure Container Instances
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $CHAT_CONTAINER \
  --image mcr.microsoft.com/azure-cli:latest \
  --command-line "sh -c 'apk add --no-cache nodejs npm && npm install express cors openai dotenv && node -e \"
const express = require('\''express'\'');
const cors = require('\''cors'\'');
const OpenAI = require('\''openai'\'');
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: \`\${process.env.AZURE_OPENAI_ENDPOINT || '\''https://eastus2.api.cognitive.microsoft.com/'\''}/openai/deployments/\${process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '\''gpt-4o'\''}\`,
  apiKey: process.env.AZURE_OPENAI_API_KEY || '\''B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR'\'',
  defaultQuery: { '\''api-version'\'': '\''2024-10-01-preview'\'' },
  defaultHeaders: { '\''User-Agent'\'': '\''digital-sponsor-chat-service'\'' }
});

app.post('\''/api/chat'\'', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: '\''Message required'\'' });
    
    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '\''gpt-4o'\'',
      messages: [
        { role: '\''system'\'', content: '\''You are a supportive AI assistant for Digital Sponsor platform, helping individuals in recovery using AA principles.'\'' },
        { role: '\''user'\'', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    res.json({
      success: true,
      response: completion.choices[0]?.message?.content || '\''No response generated'\'',
      metadata: { tokensUsed: completion.usage?.total_tokens, model: '\''gpt-4o'\'' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('\''/health'\'', (req, res) => {
  res.json({ status: '\''healthy'\'', service: '\''Digital Sponsor Chat Service'\'' });
});

app.listen(3003, '\''0.0.0.0'\'', () => console.log('\''Chat Service running on port 3003'\''));
\"'" \
  --dns-name-label digitalsponsor-chat-prod \
  --ports 3003 \
  --environment-variables \
    AZURE_OPENAI_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/ \
    AZURE_OPENAI_API_KEY=B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR \
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o \
    AZURE_OPENAI_MODEL=gpt-4o \
  --cpu 1 \
  --memory 1

echo "✅ Chat Service deployed successfully!"
echo "🌐 Chat Service URL: http://digitalsponsor-chat-prod.eastus2.azurecontainer.io:3003"

# Deploy Literature Service
echo ""
echo "🏗️  Building and Deploying Literature Service..."

az container create \
  --resource-group $RESOURCE_GROUP \
  --name $LITERATURE_CONTAINER \
  --image mcr.microsoft.com/azure-cli:latest \
  --command-line "sh -c 'apk add --no-cache nodejs npm && npm install express cors openai dotenv && node -e \"
const express = require('\''express'\'');
const cors = require('\''cors'\'');
const OpenAI = require('\''openai'\'');
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: \`\${process.env.AZURE_OPENAI_ENDPOINT || '\''https://eastus2.api.cognitive.microsoft.com/'\''}/openai/deployments/\${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || '\''text-embedding-ada-002'\''}\`,
  apiKey: process.env.AZURE_OPENAI_API_KEY || '\''B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR'\'',
  defaultQuery: { '\''api-version'\'': '\''2024-10-01-preview'\'' },
  defaultHeaders: { '\''User-Agent'\'': '\''digital-sponsor-literature-service'\'' }
});

const mockLiterature = [
  { id: '\''step1'\'', title: '\''Step 1: Powerlessness'\'', content: '\''We admitted we were powerless over alcohol—that our lives had become unmanageable.'\'', type: '\''twelve_steps'\'', step: 1 },
  { id: '\''step4'\'', title: '\''Step 4: Moral Inventory'\'', content: '\''Made a searching and fearless moral inventory of ourselves.'\'', type: '\''twelve_steps'\'', step: 4 }
];

app.post('\''/api/search'\'', async (req, res) => {
  try {
    const { query, maxResults = 5 } = req.body;
    if (!query) return res.status(400).json({ error: '\''Query required'\'' });
    
    const results = mockLiterature.slice(0, maxResults);
    res.json({ success: true, results, totalCount: results.length, query });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('\''/api/embed'\'', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: '\''Text required'\'' });
    
    const response = await openai.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || '\''text-embedding-ada-002'\'',
      input: [text]
    });
    
    res.json({
      success: true,
      embeddings: response.data.map(item => item.embedding),
      model: '\''text-embedding-ada-002'\'',
      tokensUsed: response.usage?.total_tokens
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('\''/health'\'', (req, res) => {
  res.json({ status: '\''healthy'\'', service: '\''Digital Sponsor Literature Service'\'' });
});

app.listen(3002, '\''0.0.0.0'\'', () => console.log('\''Literature Service running on port 3002'\''));
\"'" \
  --dns-name-label digitalsponsor-literature-prod \
  --ports 3002 \
  --environment-variables \
    AZURE_OPENAI_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/ \
    AZURE_OPENAI_API_KEY=B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002 \
    AZURE_OPENAI_EMBEDDING_MODEL=text-embedding-ada-002 \
  --cpu 1 \
  --memory 1

echo "✅ Literature Service deployed successfully!"
echo "🌐 Literature Service URL: http://digitalsponsor-literature-prod.eastus2.azurecontainer.io:3002"

# Cleanup temporary files
rm -rf temp-chat-build

echo ""
echo "🎉 Deployment Complete! 🎉"
echo ""
echo "📋 Service URLs:"
echo "💬 Chat Service: http://digitalsponsor-chat-prod.eastus2.azurecontainer.io:3003"
echo "📚 Literature Service: http://digitalsponsor-literature-prod.eastus2.azurecontainer.io:3002"
echo ""
echo "🔧 Health Checks:"
echo "curl http://digitalsponsor-chat-prod.eastus2.azurecontainer.io:3003/health"
echo "curl http://digitalsponsor-literature-prod.eastus2.azurecontainer.io:3002/health"
echo ""
echo "💡 Example Usage:"
echo "curl -X POST http://digitalsponsor-chat-prod.eastus2.azurecontainer.io:3003/api/chat \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"message\": \"I need encouragement in my recovery today\"}'"