// Integration test for Chat Service + Literature Service RAG
const axios = require('axios');

const CHAT_SERVICE_URL = 'http://localhost:3003';
const LITERATURE_SERVICE_URL = 'http://localhost:3002';

async function testRAGIntegration() {
  console.log('🧪 Testing Chat + Literature RAG Integration\n');

  try {
    // Test 1: Check both services are healthy
    console.log('1️⃣ Testing Service Health...');
    
    const [chatHealth, litHealth] = await Promise.all([
      axios.get(`${CHAT_SERVICE_URL}/health`),
      axios.get(`${LITERATURE_SERVICE_URL}/health`)
    ]);
    
    console.log(`✅ Chat Service: ${chatHealth.data.status} (${chatHealth.data.azure_openai.latency}ms)`);
    console.log(`✅ Literature Service: ${litHealth.data.status} (${litHealth.data.azure_openai_embeddings.latency}ms)`);

    // Test 2: Literature Search for AA content
    console.log('\n2️⃣ Testing Literature Search...');
    
    const searchQuery = "step 4 moral inventory fearless searching";
    const litResponse = await axios.post(`${LITERATURE_SERVICE_URL}/api/search`, {
      query: searchQuery,
      maxResults: 3
    });
    
    console.log(`✅ Found ${litResponse.data.totalCount} literature results for: "${searchQuery}"`);
    console.log(`📚 Top result: "${litResponse.data.results[0].title}"`);

    // Test 3: Chat with RAG Context
    console.log('\n3️⃣ Testing Chat with Manual RAG Context...');
    
    // Get literature context
    const ragContext = litResponse.data.results
      .slice(0, 2)
      .map(result => `${result.title}: ${result.content}`)
      .join('\n\n');

    // Test chat with RAG context by including it in the message
    const chatMessage = `Based on AA literature about Step 4, I'm feeling scared about doing my moral inventory. What guidance can you provide?

    Context from AA Literature:
    ${ragContext}`;

    const chatResponse = await axios.post(`${CHAT_SERVICE_URL}/api/chat`, {
      message: chatMessage,
      conversationId: `test-rag-${Date.now()}`
    });

    console.log(`✅ Chat response generated successfully`);
    console.log(`⏱️  Processing time: ${chatResponse.data.metadata.processingTime}ms`);
    console.log(`🔤 Tokens used: ${chatResponse.data.metadata.tokensUsed}`);
    console.log(`🤖 Model: ${chatResponse.data.metadata.model}`);
    console.log(`\n📝 Response preview: "${chatResponse.data.response.substring(0, 150)}..."`);

    // Test 4: Advanced RAG with Embeddings
    console.log('\n4️⃣ Testing Literature Search with Embeddings...');
    
    const embeddingQuery = "I'm struggling with resentments and fear in my inventory";
    const embeddingResponse = await axios.post(`${LITERATURE_SERVICE_URL}/api/embed`, {
      text: embeddingQuery
    });

    console.log(`✅ Generated embeddings for query`);
    console.log(`⏱️  Embedding time: ${embeddingResponse.data.processingTime}ms`);
    console.log(`🔤 Tokens used: ${embeddingResponse.data.tokensUsed}`);
    console.log(`📏 Embedding dimensions: ${embeddingResponse.data.embeddings[0].length}`);

    // Test 5: Full RAG Pipeline Simulation
    console.log('\n5️⃣ Simulating Full RAG Pipeline...');
    
    const userQuery = "Help me understand how to overcome fear when doing step 4";
    
    // Step 1: Search literature
    const litResults = await axios.post(`${LITERATURE_SERVICE_URL}/api/search`, {
      query: userQuery,
      maxResults: 2,
      includeEmbeddings: false
    });

    // Step 2: Create RAG context
    const ragCtx = litResults.data.results
      .map(r => `[${r.type}] ${r.title}: ${r.content.substring(0, 200)}...`)
      .join('\n\n');

    // Step 3: Chat with context
    const ragMessage = `User question: "${userQuery}"
    
Please provide guidance based on the following AA literature excerpts:

${ragCtx}

Respond with compassion and focus on AA principles.`;

    const ragChatResponse = await axios.post(`${CHAT_SERVICE_URL}/api/chat`, {
      message: ragMessage,
      conversationId: `rag-pipeline-${Date.now()}`
    });

    console.log(`✅ Full RAG pipeline completed successfully`);
    console.log(`📖 Literature sources: ${litResults.data.totalCount}`);
    console.log(`⏱️  Total time: ${ragChatResponse.data.metadata.processingTime}ms`);
    console.log(`\n📝 Final response: "${ragChatResponse.data.response.substring(0, 200)}..."`);

    console.log('\n🎉 All RAG Integration Tests Passed! 🎉');
    console.log('\n📊 Integration Summary:');
    console.log(`• Chat Service: ✅ Operational`);
    console.log(`• Literature Service: ✅ Operational`);
    console.log(`• Literature Search: ✅ Working`);
    console.log(`• Embeddings: ✅ Working`);
    console.log(`• RAG Pipeline: ✅ Functional`);
    console.log(`• Azure OpenAI: ✅ Both GPT-4o and text-embedding-ada-002 active`);

  } catch (error) {
    console.error('❌ RAG Integration Test Failed:', error.response?.data || error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`URL: ${error.config?.url}`);
    }
    
    process.exit(1);
  }
}

// Run the integration test
testRAGIntegration();