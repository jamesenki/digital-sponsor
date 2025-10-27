import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Sample Literature Ingestion Script
 * 
 * Adds sample AA literature content for testing the RAG system
 * AA Traditions Compliant - Only AA-approved excerpts
 */

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

const sampleBigBookContent = [
  {
    section_title: "How It Works",
    content_text: "Rarely have we seen a person fail who has thoroughly followed our path. Those who do not recover are people who cannot or will not give themselves completely to this simple program, usually men and women who are constitutionally incapable of being honest with themselves.",
    page_number: 58,
    chapter_number: 5,
    chunk_index: 1,
    word_count: 52
  },
  {
    section_title: "How It Works - Resentments",
    content_text: "Resentment is the \"number one\" offender. It destroys more alcoholics than anything else. From it stem all forms of spiritual disease, for we have been not only mentally and physically ill, we have been spiritually sick.",
    page_number: 64,
    chapter_number: 5,
    chunk_index: 2,
    word_count: 40
  },
  {
    section_title: "How It Works - Powerlessness",
    content_text: "Remember that we deal with alcohol—cunning, baffling, powerful! Without help it is too much for us. But there is One who has all power—that One is God. May you find Him now!",
    page_number: 58,
    chapter_number: 5,
    chunk_index: 3,
    word_count: 35
  },
  {
    section_title: "The Promises",
    content_text: "If we are painstaking about this phase of our development, we will be amazed before we are half way through. We are going to know a new freedom and a new happiness.",
    page_number: 83,
    chapter_number: 6,
    chunk_index: 4,
    word_count: 35
  }
]

const sampleTwelveAndTwelveContent = [
  {
    section_title: "Step One",
    content_text: "We admitted we were powerless over alcohol—that our lives had become unmanageable. Who cares to admit complete defeat? Practically no one, of course.",
    page_number: 21,
    chapter_number: 1,
    chunk_index: 1,
    word_count: 26
  },
  {
    section_title: "Step Four",
    content_text: "Made a searching and fearless moral inventory of ourselves. Creation gave us instincts for a purpose. Without them we wouldn't be complete human beings.",
    page_number: 42,
    chapter_number: 4,
    chunk_index: 1,
    word_count: 26
  }
]

async function ingestSampleLiterature() {
  try {
    console.log('🔄 Starting sample literature ingestion...')
    
    // Get source IDs
    const sourcesResult = await pgPool.query(
      'SELECT id, title FROM literature_sources WHERE aa_approved = true'
    )
    
    const sources = sourcesResult.rows
    const bigBookSource = sources.find(s => s.title.includes('Big Book'))
    const twelveAndTwelveSource = sources.find(s => s.title.includes('Twelve Steps'))
    
    if (!bigBookSource || !twelveAndTwelveSource) {
      throw new Error('Required literature sources not found')
    }
    
    console.log(`✅ Found Big Book source: ${bigBookSource.id}`)
    console.log(`✅ Found Twelve & Twelve source: ${twelveAndTwelveSource.id}`)
    
    // Insert Big Book content
    console.log('📚 Ingesting Big Book content...')
    for (const content of sampleBigBookContent) {
      await pgPool.query(
        `INSERT INTO literature_content 
         (source_id, section_title, content_text, page_number, chapter_number, chunk_index, word_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          bigBookSource.id,
          content.section_title,
          content.content_text,
          content.page_number,
          content.chapter_number,
          content.chunk_index,
          content.word_count,
          JSON.stringify({
            source: 'Alcoholics Anonymous (Big Book)',
            copyright: 'AA World Services, Inc.',
            fair_use: true,
            excerpt_only: true
          })
        ]
      )
    }
    
    // Insert Twelve & Twelve content
    console.log('📖 Ingesting Twelve Steps and Twelve Traditions content...')
    for (const content of sampleTwelveAndTwelveContent) {
      await pgPool.query(
        `INSERT INTO literature_content 
         (source_id, section_title, content_text, page_number, chapter_number, chunk_index, word_count, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          twelveAndTwelveSource.id,
          content.section_title,
          content.content_text,
          content.page_number,
          content.chapter_number,
          content.chunk_index,
          content.word_count,
          JSON.stringify({
            source: 'Twelve Steps and Twelve Traditions',
            copyright: 'AA World Services, Inc.',
            fair_use: true,
            excerpt_only: true
          })
        ]
      )
    }
    
    // Verify ingestion
    const totalContentResult = await pgPool.query(
      'SELECT COUNT(*) as total FROM literature_content'
    )
    
    console.log(`✅ Sample literature ingestion completed!`)
    console.log(`📊 Total content chunks: ${totalContentResult.rows[0].total}`)
    console.log(`🔍 Ready for literature search testing`)
    
    // Test search functionality
    console.log('\n🔍 Testing literature search...')
    const searchResult = await pgPool.query(`
      SELECT 
        c.section_title,
        c.content_text,
        c.page_number,
        s.title as source_title
      FROM literature_content c
      JOIN literature_sources s ON c.source_id = s.id
      WHERE c.content_text ILIKE '%resentment%'
      ORDER BY c.page_number
    `)
    
    console.log(`📚 Found ${searchResult.rows.length} results for "resentment":`)
    searchResult.rows.forEach(row => {
      console.log(`  - ${row.section_title} (${row.source_title}, p. ${row.page_number})`)
      console.log(`    "${row.content_text.substring(0, 100)}..."`)
    })
    
  } catch (error) {
    console.error('❌ Literature ingestion failed:', error)
    throw error
  } finally {
    await pgPool.end()
  }
}

// Run if called directly
if (require.main === module) {
  ingestSampleLiterature()
    .then(() => {
      console.log('\n🎉 Sample literature ingestion complete!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Ingestion failed:', error)
      process.exit(1)
    })
}

export { ingestSampleLiterature }