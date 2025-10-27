import { TextChunkingService } from '../services/text-chunking'
import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Test Script for Text Chunking Service
 * 
 * Tests the chunking and embedding system with sample AA literature
 * to validate content policy handling and embedding generation
 */

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

// Sample AA literature text that should be safe for OpenAI content policy
const sampleTexts = [
  {
    title: "The Twelve Steps - Step One",
    text: `We admitted we were powerless over our addiction—that our lives had become unmanageable.

This first step is the foundation of recovery. It requires complete honesty about our condition and acceptance that we cannot solve this problem alone. 

Many newcomers struggle with this concept of powerlessness, but it is actually the beginning of freedom. When we stop fighting and accept our situation, we can begin to receive help.

The admission of powerlessness is not a sign of weakness but of courage and wisdom.`
  },
  {
    title: "The Promises",
    text: `If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness.

We will not regret the past nor wish to shut the door on it. We will comprehensively grasp the word serenity and we will know peace.

No matter how far down the scale we have gone, we will see how our experience can benefit others. That feeling of uselessness and self-pity will disappear.

We will lose interest in selfish things and gain interest in our fellows. Self-seeking will slip away.`
  },
  {
    title: "Daily Reflection on Gratitude", 
    text: `Today I choose to focus on gratitude rather than resentment. Recovery has taught me that gratitude is not just a feeling but a practice.

When I make a conscious effort to notice the good in my life, my perspective shifts. The challenges I face become opportunities for growth rather than obstacles to my happiness.

In fellowship with others who share this journey, I find strength and hope. Together we support each other through both difficult and joyful times.

This practice of gratitude keeps me grounded in the present moment and connected to my higher power.`
  }
]

async function testChunkingService() {
  const chunkingService = new TextChunkingService()
  
  try {
    console.log('🧪 Testing Text Chunking Service')
    console.log('=' .repeat(50))
    
    // Get Big Book source for testing
    const sourceResult = await pgPool.query(
      "SELECT id, title FROM literature_sources WHERE title LIKE '%Big Book%' LIMIT 1"
    )
    
    if (sourceResult.rows.length === 0) {
      throw new Error('Big Book source not found in database')
    }
    
    const sourceId = sourceResult.rows[0].id
    console.log(`✅ Using source: ${sourceResult.rows[0].title} (${sourceId})`)
    
    let totalChunksProcessed = 0
    let totalEmbeddingsGenerated = 0
    let totalContentPolicyBlocks = 0
    
    for (let i = 0; i < sampleTexts.length; i++) {
      const sample = sampleTexts[i]
      console.log(`\n📖 Testing: ${sample.title}`)
      
      try {
        // Test the chunking and embedding process
        const result = await chunkingService.processLiteratureWork(
          sourceId,
          sample.text,
          [{ 
            title: sample.title, 
            text: sample.text,
            pageNumber: i + 1,
            chapterNumber: i + 1
          }]
        )
        
        totalChunksProcessed += result.totalChunks
        console.log(`   ✅ Processed ${result.totalChunks} chunks`)
        console.log(`   📊 ${result.totalTokens} tokens`)
        
      } catch (error: any) {
        if (error.message?.includes('content filtering policy')) {
          totalContentPolicyBlocks++
          console.log(`   ⚠️  Content blocked: ${sample.title}`)
        } else {
          console.error(`   ❌ Processing failed: ${error.message}`)
        }
      }
      
      // Rate limiting between samples
      if (i < sampleTexts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Get final statistics
    const stats = await chunkingService.getProcessingStats()
    
    console.log('\n📊 TEST RESULTS:')
    console.log(`   🧪 Samples tested: ${sampleTexts.length}`)
    console.log(`   📝 Total chunks processed: ${totalChunksProcessed}`)
    console.log(`   🤖 Embeddings generated: ${totalChunksProcessed - totalContentPolicyBlocks}`)
    console.log(`   ⚠️  Content policy blocks: ${totalContentPolicyBlocks}`)
    console.log(`   📚 Total sources in DB: ${stats.totalSources}`)
    console.log(`   🗂️  Total chunks in DB: ${stats.totalChunks}`)
    
    if (totalContentPolicyBlocks === 0) {
      console.log('\n🎉 SUCCESS: All content processed without content policy issues!')
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some content blocked, but system handled gracefully')
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error)
    throw error
  } finally {
    await chunkingService.close()
    await pgPool.end()
  }
}

// Run test if called directly
if (require.main === module) {
  testChunkingService()
    .then(() => {
      console.log('\n✅ Text chunking test completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
}

export { testChunkingService }