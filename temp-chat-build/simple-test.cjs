// Simple test server for Azure OpenAI chat service
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  defaultQuery: { 'api-version': '2024-10-01-preview' },
  defaultHeaders: {
    'User-Agent': 'digital-sponsor-chat-test'
  }
});

// Simple chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[${new Date().toISOString()}] Processing chat message:`, message.substring(0, 50));

    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { 
          role: 'system', 
          content: `You are a supportive AI assistant for the Digital Sponsor platform, designed to help individuals in recovery from alcohol addiction using the principles of Alcoholics Anonymous.

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
- Keep responses focused on recovery and AA principles`
        },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    const processingTime = Date.now() - startTime;
    const response = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

    console.log(`[${new Date().toISOString()}] Response generated in ${processingTime}ms, tokens: ${completion.usage?.total_tokens}`);

    res.json({
      success: true,
      response: response,
      conversationId: conversationId || `conv-${Date.now()}`,
      metadata: {
        processingTime: processingTime,
        tokensUsed: completion.usage?.total_tokens,
        model: process.env.AZURE_OPENAI_MODEL
      }
    });

  } catch (error) {
    console.error('Chat endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    await openai.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });
    
    const latency = Date.now() - startTime;
    
    res.json({
      status: 'healthy',
      service: 'Digital Sponsor Chat Service',
      timestamp: new Date().toISOString(),
      azure_openai: {
        healthy: true,
        latency: latency,
        endpoint: process.env.AZURE_OPENAI_ENDPOINT,
        model: process.env.AZURE_OPENAI_MODEL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      azure_openai: {
        healthy: false
      }
    });
  }
});

app.listen(port, () => {
  console.log(`\n🚀 Digital Sponsor Chat Service running on port ${port}`);
  console.log(`📋 Health check: http://localhost:${port}/health`);
  console.log(`💬 Chat endpoint: POST http://localhost:${port}/api/chat`);
  console.log(`🔧 Azure OpenAI Model: ${process.env.AZURE_OPENAI_MODEL}`);
  console.log(`🌐 Azure OpenAI Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
});