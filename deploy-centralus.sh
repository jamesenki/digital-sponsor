#!/bin/bash

# Deploy Digital Sponsor Services to Central US (matching function apps)
set -e

RESOURCE_GROUP="rg-digitalsponsor-centralus"
LOCATION="centralus"

echo "🚀 Deploying to Central US to match function apps"
echo "📍 Resource Group: $RESOURCE_GROUP"
echo ""

# Deploy Chat Service
echo "💬 Deploying Chat Service to Central US..."

az container create \
  --resource-group $RESOURCE_GROUP \
  --name digitalsponsor-chat-prod \
  --image node:18-alpine \
  --os-type Linux \
  --location $LOCATION \
  --restart-policy Always \
  --command-line "sh -c '
npm init -y > /dev/null 2>&1 && 
npm install --silent express cors openai dotenv && 
cat > app.js << EOF
const express = require(\"express\");
const cors = require(\"cors\");
const OpenAI = require(\"openai\");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: \`\${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/\${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}\`,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  defaultQuery: { \"api-version\": \"2024-10-01-preview\" },
  defaultHeaders: { \"User-Agent\": \"digital-sponsor-chat\" }
});

app.post(\"/api/chat\", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: \"Message required\" });
    
    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: \"system\", content: \"You are a supportive AI assistant for Digital Sponsor platform, helping individuals in recovery using AA principles.\" },
        { role: \"user\", content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    res.json({
      success: true,
      response: completion.choices[0]?.message?.content || \"No response\",
      metadata: { 
        tokensUsed: completion.usage?.total_tokens, 
        model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME 
      }
    });
  } catch (error) {
    console.error(\"Chat error:\", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get(\"/health\", (req, res) => {
  res.json({ 
    status: \"healthy\", 
    service: \"Digital Sponsor Chat Service\",
    timestamp: new Date().toISOString(),
    version: \"1.0.0\"
  });
});

const port = process.env.PORT || 3003;
app.listen(port, \"0.0.0.0\", () => {
  console.log(\`💬 Chat Service running on port \${port}\`);
  console.log(\"🤖 Model:\", process.env.AZURE_OPENAI_DEPLOYMENT_NAME);
});
EOF
node app.js'" \
  --dns-name-label digitalsponsor-chat-centralus \
  --ports 3003 \
  --environment-variables \
    AZURE_OPENAI_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/ \
    AZURE_OPENAI_API_KEY=B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR \
    AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o \
    NODE_ENV=production \
    PORT=3003 \
  --cpu 1 \
  --memory 1.5

echo "✅ Chat Service deployment initiated"
echo ""

# Deploy Literature Service  
echo "📚 Deploying Literature Service to Central US..."

az container create \
  --resource-group $RESOURCE_GROUP \
  --name digitalsponsor-literature-prod \
  --image node:18-alpine \
  --os-type Linux \
  --location $LOCATION \
  --restart-policy Always \
  --command-line "sh -c '
npm init -y > /dev/null 2>&1 && 
npm install --silent express cors openai dotenv && 
cat > app.js << EOF
const express = require(\"express\");
const cors = require(\"cors\");
const OpenAI = require(\"openai\");

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: \`\${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/\${process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT}\`,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  defaultQuery: { \"api-version\": \"2024-10-01-preview\" },
  defaultHeaders: { \"User-Agent\": \"digital-sponsor-literature\" }
});

const mockLiterature = [
  { 
    id: \"step1\", 
    title: \"Step 1: We admitted we were powerless over alcohol\",
    content: \"We admitted we were powerless over alcohol—that our lives had become unmanageable. This is the first step in recovery.\",
    type: \"twelve_steps\", 
    step: 1,
    relevanceScore: 0.95
  },
  { 
    id: \"step4\", 
    title: \"Step 4: Made a searching and fearless moral inventory\",
    content: \"Made a searching and fearless moral inventory of ourselves. This step involves honest self-examination.\",
    type: \"twelve_steps\", 
    step: 4,
    relevanceScore: 0.88
  },
  { 
    id: \"tradition1\",
    title: \"Tradition 1: Our common welfare should come first\",
    content: \"Our common welfare should come first; personal recovery depends upon A.A. unity.\",
    type: \"twelve_traditions\", 
    tradition: 1,
    relevanceScore: 0.85
  }
];

app.post(\"/api/search\", async (req, res) => {
  try {
    const { query, maxResults = 5 } = req.body;
    if (!query) return res.status(400).json({ error: \"Query required\" });
    
    const results = mockLiterature.slice(0, maxResults);
    res.json({ 
      success: true, 
      results, 
      totalCount: results.length, 
      query,
      searchMode: \"keyword_mock\"
    });
  } catch (error) {
    console.error(\"Search error:\", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(\"/api/embed\", async (req, res) => {
  try {
    const { text, texts } = req.body;
    if (!text && !texts) return res.status(400).json({ error: \"Text required\" });
    
    const input = texts || [text];
    const startTime = Date.now();
    
    const response = await openai.embeddings.create({
      model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
      input: input
    });
    
    res.json({
      success: true,
      embeddings: response.data.map(item => item.embedding),
      model: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
      tokensUsed: response.usage?.total_tokens,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    console.error(\"Embedding error:\", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get(\"/health\", (req, res) => {
  res.json({ 
    status: \"healthy\", 
    service: \"Digital Sponsor Literature Service\",
    timestamp: new Date().toISOString(),
    mock_literature_count: mockLiterature.length,
    version: \"1.0.0\"
  });
});

const port = process.env.PORT || 3002;
app.listen(port, \"0.0.0.0\", () => {
  console.log(\`📚 Literature Service running on port \${port}\`);
  console.log(\"🧮 Embedding Model:\", process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT);
});
EOF
node app.js'" \
  --dns-name-label digitalsponsor-literature-centralus \
  --ports 3002 \
  --environment-variables \
    AZURE_OPENAI_ENDPOINT=https://eastus2.api.cognitive.microsoft.com/ \
    AZURE_OPENAI_API_KEY=B9o7R6Hp56uGByc0erNGzzvjBXYC5faTh5EP4YiehmhjSU7PZkCoJQQJ99CAACHYHv6XJ3w3AAABACOG7SVR \
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002 \
    NODE_ENV=production \
    PORT=3002 \
  --cpu 1 \
  --memory 1.5

echo "✅ Literature Service deployment initiated"
echo ""

# Wait for deployments
echo "⏳ Waiting 60 seconds for containers to start..."
sleep 60

echo "📊 Checking Deployment Status..."
echo ""
echo "💬 Chat Service:"
az container show --resource-group $RESOURCE_GROUP --name digitalsponsor-chat-prod --query "instanceView.state" --output tsv

echo "📚 Literature Service:"  
az container show --resource-group $RESOURCE_GROUP --name digitalsponsor-literature-prod --query "instanceView.state" --output tsv

echo ""
echo "🎉 Central US Deployment Complete! 🎉"
echo ""
echo "📋 Production Service URLs:"
echo "💬 Chat Service: http://digitalsponsor-chat-centralus.centralus.azurecontainer.io:3003/health"
echo "📚 Literature Service: http://digitalsponsor-literature-centralus.centralus.azurecontainer.io:3002/health"