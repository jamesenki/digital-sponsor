// Simple test script for Azure OpenAI integration
const OpenAI = require('openai');
require('dotenv').config();

async function testAzureOpenAI() {
  console.log('Testing Azure OpenAI connection...');
  
  try {
    const client = new OpenAI({
      baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      defaultQuery: { 'api-version': '2024-10-01-preview' },
      defaultHeaders: {
        'User-Agent': 'digital-sponsor-chat-test'
      }
    });

    console.log('Configuration:');
    console.log(`- Endpoint: ${process.env.AZURE_OPENAI_ENDPOINT}`);
    console.log(`- Deployment: ${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`);
    console.log(`- Model: ${process.env.AZURE_OPENAI_MODEL}`);

    // Test simple completion
    const startTime = Date.now();
    const completion = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
      messages: [
        { role: 'system', content: 'You are a helpful assistant for people in recovery.' },
        { role: 'user', content: 'Hello, I need some encouragement today.' }
      ],
      max_tokens: 50,
      temperature: 0.7
    });

    const latency = Date.now() - startTime;
    
    console.log('\n✅ Azure OpenAI test successful!');
    console.log(`- Response time: ${latency}ms`);
    console.log(`- Tokens used: ${completion.usage?.total_tokens}`);
    console.log(`- Response: ${completion.choices[0]?.message?.content}`);
    
  } catch (error) {
    console.error('❌ Azure OpenAI test failed:', error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    if (error.status) {
      console.error(`HTTP status: ${error.status}`);
    }
  }
}

testAzureOpenAI();