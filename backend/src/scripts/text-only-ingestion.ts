import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Text-Only Literature Ingestion (No Embeddings)
 * 
 * Processes literature into searchable text chunks without embeddings
 * Focuses on PostgreSQL full-text search capabilities
 */

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

interface TextSection {
  title: string
  content: string
  pageNumber?: number
  chapterNumber?: number
}

class TextOnlyProcessor {
  private readonly TARGET_WORDS = 200 // words per chunk
  private readonly MIN_WORDS = 50
  private readonly MAX_WORDS = 400

  /**
   * Split text into word-based chunks
   */
  private chunkByWords(text: string): string[] {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const chunks: string[] = []
    
    let currentChunk: string[] = []
    
    for (const word of words) {
      currentChunk.push(word)
      
      // Check if we should finalize this chunk
      if (currentChunk.length >= this.TARGET_WORDS) {
        // Look for sentence boundary in next few words
        const nextWords = words.slice(words.indexOf(word) + 1, words.indexOf(word) + 10)
        const hasSentenceEnd = nextWords.some(w => w.includes('.') || w.includes('!') || w.includes('?'))
        
        if (hasSentenceEnd || currentChunk.length >= this.MAX_WORDS) {
          chunks.push(currentChunk.join(' '))
          currentChunk = []
        }
      }
    }
    
    // Add remaining words as final chunk
    if (currentChunk.length >= this.MIN_WORDS) {
      chunks.push(currentChunk.join(' '))
    }
    
    return chunks
  }

  /**
   * Store text chunk in database
   */
  async storeTextChunk(
    sourceId: string,
    sectionTitle: string,
    chunkText: string,
    chunkIndex: number,
    pageNumber?: number,
    chapterNumber?: number
  ): Promise<void> {
    const wordCount = chunkText.split(/\s+/).length
    
    await pgPool.query(
      `INSERT INTO literature_content 
       (source_id, section_title, content_text, page_number, chapter_number, 
        chunk_index, word_count, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        sourceId,
        sectionTitle,
        chunkText,
        pageNumber,
        chapterNumber,
        chunkIndex,
        wordCount,
        JSON.stringify({
          processingType: 'text-only',
          chunkingMethod: 'word-based',
          version: '1.0'
        })
      ]
    )
  }

  /**
   * Process literature sections into searchable chunks
   */
  async processSections(sourceId: string, sections: TextSection[]): Promise<{
    totalChunks: number
    totalWords: number
  }> {
    let totalChunks = 0
    let totalWords = 0
    let globalChunkIndex = 0
    
    for (const section of sections) {
      console.log(`📄 Processing section: ${section.title}`)
      
      const chunks = this.chunkByWords(section.content)
      console.log(`   📝 Generated ${chunks.length} chunks`)
      
      for (let i = 0; i < chunks.length; i++) {
        await this.storeTextChunk(
          sourceId,
          section.title,
          chunks[i],
          globalChunkIndex,
          section.pageNumber,
          section.chapterNumber
        )
        
        totalWords += chunks[i].split(/\s+/).length
        totalChunks++
        globalChunkIndex++
      }
    }
    
    return { totalChunks, totalWords }
  }

  async close(): Promise<void> {
    await pgPool.end()
  }
}

// Sample content for testing
const sampleSections: TextSection[] = [
  {
    title: "Introduction to Recovery",
    content: `Recovery is a journey that begins with a single step. It requires courage, honesty, and willingness to change. Many people find strength in community and shared experiences. The path forward involves learning new ways of thinking and living. Progress may be slow at times, but each small step matters. Support from others who understand the journey can make a significant difference. Personal growth happens through consistent effort and self-reflection.`,
    pageNumber: 1,
    chapterNumber: 1
  },
  {
    title: "Building Foundations", 
    content: `Strong foundations are essential for lasting change. This involves developing healthy habits and routines. Regular practice of positive behaviors creates momentum. Setting realistic goals helps maintain motivation. Celebrating small victories builds confidence. Learning from setbacks is part of the process. Each person's journey is unique and valid. Community support provides encouragement during difficult times.`,
    pageNumber: 15,
    chapterNumber: 2
  },
  {
    title: "Daily Practices",
    content: `Daily practices form the backbone of sustained growth. Morning routines set a positive tone for the day. Reflection and gratitude exercises develop mindfulness. Regular check-ins with supportive people maintain connection. Reading inspirational material provides guidance and hope. Taking time for self-care prevents burnout. Consistent small actions create lasting transformation over time.`,
    pageNumber: 42,
    chapterNumber: 3
  }
]

async function runTextIngestion() {
  const processor = new TextOnlyProcessor()
  
  try {
    console.log('🔄 Starting text-only literature ingestion...')
    
    // Get a literature source
    const sourceResult = await pgPool.query(
      "SELECT id, title FROM literature_sources WHERE title LIKE '%Big Book%' LIMIT 1"
    )
    
    if (sourceResult.rows.length === 0) {
      throw new Error('No literature source found')
    }
    
    const sourceId = sourceResult.rows[0].id
    console.log(`✅ Using source: ${sourceResult.rows[0].title}`)
    
    // Process the sample sections
    const result = await processor.processSections(sourceId, sampleSections)
    
    console.log(`✅ Ingestion complete:`)
    console.log(`   📝 ${result.totalChunks} chunks stored`)
    console.log(`   📊 ${result.totalWords} total words`)
    
    // Test search functionality
    console.log('\n🔍 Testing text search...')
    const searchResult = await pgPool.query(`
      SELECT 
        section_title,
        content_text,
        page_number,
        ts_rank(to_tsvector('english', content_text), plainto_tsquery('english', $1)) as rank
      FROM literature_content 
      WHERE to_tsvector('english', content_text) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT 5
    `, ['community support'])
    
    console.log(`Found ${searchResult.rows.length} search results:`)
    searchResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.section_title} (p.${row.page_number}) - Rank: ${row.rank.toFixed(3)}`)
      console.log(`   "${row.content_text.substring(0, 100)}..."`)
    })
    
  } catch (error) {
    console.error('❌ Text ingestion failed:', error)
    throw error
  } finally {
    await processor.close()
  }
}

// Run if called directly
if (require.main === module) {
  runTextIngestion()
    .then(() => {
      console.log('\n🎉 Text-only ingestion completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Ingestion failed:', error)
      process.exit(1)
    })
}

export { TextOnlyProcessor, runTextIngestion }