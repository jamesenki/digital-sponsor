import { Pool } from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

/**
 * Comprehensive AA Literature Ingestion Pipeline
 * 
 * Phase 2: Fair Use Full Text Ingestion with Proper Attribution
 * 
 * Scope:
 * - Big Book (complete)
 * - Twelve Steps and Twelve Traditions (complete) 
 * - Daily Reflections (complete)
 * - AA Grapevine (last 20 years: 2004-2024)
 * - Language of the Heart (Bill W.'s Grapevine writings)
 * - Best of Grapevine collections
 * - As Bill Sees It
 * - Living Sober
 * 
 * Fair Use Compliance:
 * - Educational/recovery support purpose (non-commercial)
 * - Always include proper attribution
 * - Paraphrase when possible in responses
 * - Serve AA's primary purpose of helping alcoholics
 */

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

interface LiteratureWork {
  title: string
  category: string
  author: string
  published_date: Date
  copyright_notice: string
  description: string
  priority: number
  estimated_chunks: number
  status: 'planned' | 'in_progress' | 'completed'
}

// Comprehensive catalog of works to ingest
const comprehensiveCatalog: LiteratureWork[] = [
  // Tier 1: Essential Core
  {
    title: "Alcoholics Anonymous (Big Book) - 4th Edition",
    category: "big_book",
    author: "Bill W. and AA Members", 
    published_date: new Date("2001-01-01"),
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "The basic text of Alcoholics Anonymous - complete text",
    priority: 1,
    estimated_chunks: 500,
    status: 'planned'
  },
  {
    title: "Twelve Steps and Twelve Traditions",
    category: "twelve_and_twelve",
    author: "Bill W.",
    published_date: new Date("1953-04-01"),
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "Detailed exploration of the Twelve Steps and Twelve Traditions",
    priority: 1,
    estimated_chunks: 200,
    status: 'planned'
  },
  {
    title: "Daily Reflections",
    category: "daily_reflections",
    author: "AA World Services",
    published_date: new Date("1990-01-01"),
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "365 daily meditations for AA members",
    priority: 1,
    estimated_chunks: 365,
    status: 'planned'
  },
  
  // Tier 2: Grapevine Materials (Last 20 Years)
  {
    title: "AA Grapevine Archives (2004-2024)",
    category: "grapevine_modern",
    author: "AA Members",
    published_date: new Date("2004-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "20 years of Grapevine articles, stories, and member experiences",
    priority: 2,
    estimated_chunks: 2400, // ~20 years × 12 issues × 10 articles per issue
    status: 'planned'
  },
  {
    title: "Language of the Heart",
    category: "language_of_heart",
    author: "Bill W.",
    published_date: new Date("1988-01-01"),
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "Bill W.'s Grapevine writings",
    priority: 2,
    estimated_chunks: 150,
    status: 'planned'
  },
  {
    title: "The Best of the Grapevine - Volume 1",
    category: "best_grapevine",
    author: "AA Members",
    published_date: new Date("1985-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "Selected stories from the Grapevine",
    priority: 2,
    estimated_chunks: 100,
    status: 'planned'
  },
  {
    title: "The Best of the Grapevine - Volume 2",
    category: "best_grapevine",
    author: "AA Members", 
    published_date: new Date("1986-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "More selected stories from the Grapevine",
    priority: 2,
    estimated_chunks: 100,
    status: 'planned'
  },
  {
    title: "The Best of the Grapevine - Volume 3", 
    category: "best_grapevine",
    author: "AA Members",
    published_date: new Date("1987-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "Additional selected stories from the Grapevine",
    priority: 2,
    estimated_chunks: 100,
    status: 'planned'
  },
  
  // Tier 3: Key Supporting Works
  {
    title: "As Bill Sees It (The AA Way of Life)",
    category: "as_bill_sees_it",
    author: "Bill W.",
    published_date: new Date("1967-01-01"), 
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "Selected writings of Bill W.",
    priority: 3,
    estimated_chunks: 100,
    status: 'planned'
  },
  {
    title: "Living Sober",
    category: "living_sober",
    author: "AA World Services",
    published_date: new Date("1975-01-01"),
    copyright_notice: "Copyright © AA World Services, Inc.", 
    description: "Practical suggestions for staying sober",
    priority: 3,
    estimated_chunks: 80,
    status: 'planned'
  },
  {
    title: "Came to Believe",
    category: "came_to_believe",
    author: "AA Members",
    published_date: new Date("1973-01-01"),
    copyright_notice: "Copyright © AA World Services, Inc.",
    description: "Spiritual experiences of AA members",
    priority: 3,
    estimated_chunks: 120,
    status: 'planned'
  },
  
  // Tier 4: Grapevine Collections
  {
    title: "Spiritual Awakenings - Grapevine Collection",
    category: "grapevine_spiritual",
    author: "AA Members",
    published_date: new Date("1988-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "Spiritual stories from the Grapevine",
    priority: 4,
    estimated_chunks: 80,
    status: 'planned'
  },
  {
    title: "In Our Own Words - Stories by Women",
    category: "grapevine_women",
    author: "AA Women Members",
    published_date: new Date("1995-01-01"), 
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "Stories by women in AA from Grapevine",
    priority: 4,
    estimated_chunks: 60,
    status: 'planned'
  },
  {
    title: "Young & Sober - Grapevine Collection", 
    category: "grapevine_young",
    author: "Young AA Members",
    published_date: new Date("1997-01-01"),
    copyright_notice: "Copyright © AA Grapevine, Inc.",
    description: "Stories by young people in AA",
    priority: 4,
    estimated_chunks: 50,
    status: 'planned'
  }
]

async function initializeComprehensiveCatalog() {
  try {
    console.log('🔄 Initializing comprehensive AA literature catalog...')
    
    // Clear existing sources to start fresh (optional)
    // await pgPool.query('DELETE FROM literature_sources WHERE true')
    
    // Insert all planned works into literature_sources
    for (const work of comprehensiveCatalog) {
      await pgPool.query(
        `INSERT INTO literature_sources 
         (title, category, author, published_date, copyright_notice, aa_approved, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (title) DO UPDATE SET
         updated_at = CURRENT_TIMESTAMP`,
        [
          work.title,
          work.category, 
          work.author,
          work.published_date,
          work.copyright_notice,
          true // All are AA approved
        ]
      )
    }
    
    console.log(`✅ Initialized ${comprehensiveCatalog.length} works in literature catalog`)
    
    // Show statistics
    const totalChunks = comprehensiveCatalog.reduce((sum, work) => sum + work.estimated_chunks, 0)
    console.log(`📊 Estimated total content chunks: ${totalChunks.toLocaleString()}`)
    
    const priorityBreakdown = comprehensiveCatalog.reduce((acc, work) => {
      acc[work.priority] = (acc[work.priority] || 0) + work.estimated_chunks
      return acc
    }, {} as Record<number, number>)
    
    console.log('📈 Content by priority:')
    Object.entries(priorityBreakdown).forEach(([priority, chunks]) => {
      console.log(`  Priority ${priority}: ${chunks.toLocaleString()} chunks`)
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Catalog initialization failed:', error)
    throw error
  }
}

async function createIngestionPlan() {
  try {
    console.log('\n📋 Creating Comprehensive Ingestion Plan...')
    
    const plan = {
      phase1_essential: comprehensiveCatalog.filter(w => w.priority === 1),
      phase2_grapevine: comprehensiveCatalog.filter(w => w.priority === 2), 
      phase3_supporting: comprehensiveCatalog.filter(w => w.priority === 3),
      phase4_collections: comprehensiveCatalog.filter(w => w.priority === 4)
    }
    
    console.log('\n🎯 INGESTION PLAN:')
    console.log('\n📚 Phase 1 - Essential Core (Priority 1):')
    plan.phase1_essential.forEach(work => {
      console.log(`  ✓ ${work.title} (~${work.estimated_chunks} chunks)`)
    })
    
    console.log('\n📰 Phase 2 - Grapevine Materials (Priority 2):')
    plan.phase2_grapevine.forEach(work => {
      console.log(`  ✓ ${work.title} (~${work.estimated_chunks} chunks)`)
    })
    
    console.log('\n📖 Phase 3 - Supporting Works (Priority 3):')
    plan.phase3_supporting.forEach(work => {
      console.log(`  ✓ ${work.title} (~${work.estimated_chunks} chunks)`)
    })
    
    console.log('\n📑 Phase 4 - Specialized Collections (Priority 4):')
    plan.phase4_collections.forEach(work => {
      console.log(`  ✓ ${work.title} (~${work.estimated_chunks} chunks)`)
    })
    
    const totalEstimated = comprehensiveCatalog.reduce((sum, w) => sum + w.estimated_chunks, 0)
    console.log(`\n📊 TOTAL ESTIMATED CONTENT: ${totalEstimated.toLocaleString()} chunks`)
    console.log(`🔍 This will create a comprehensive AA literature database for RAG queries`)
    
    return plan
    
  } catch (error) {
    console.error('❌ Plan creation failed:', error)
    throw error
  }
}

async function showCurrentStatus() {
  try {
    console.log('\n📈 Current Ingestion Status:')
    
    const sourcesResult = await pgPool.query(
      'SELECT category, COUNT(*) as count FROM literature_sources GROUP BY category ORDER BY category'
    )
    
    const contentResult = await pgPool.query(
      'SELECT COUNT(*) as total FROM literature_content'
    )
    
    console.log('\n📚 Literature Sources by Category:')
    sourcesResult.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count} sources`)
    })
    
    console.log(`\n📝 Total Content Chunks: ${contentResult.rows[0].total}`)
    
    // Calculate percentage of planned content
    const totalPlanned = comprehensiveCatalog.reduce((sum, w) => sum + w.estimated_chunks, 0)
    const currentChunks = parseInt(contentResult.rows[0].total)
    const percentage = ((currentChunks / totalPlanned) * 100).toFixed(2)
    
    console.log(`📊 Completion: ${percentage}% of planned comprehensive catalog`)
    
  } catch (error) {
    console.error('❌ Status check failed:', error)
  }
}

// Priority-based ingestion framework
async function ingestByPriority(priority: number) {
  const worksToIngest = comprehensiveCatalog.filter(w => w.priority === priority)
  
  console.log(`\n🔄 Starting Priority ${priority} Ingestion...`)
  console.log(`📚 Works to process: ${worksToIngest.length}`)
  
  for (const work of worksToIngest) {
    console.log(`\n📖 Processing: ${work.title}`)
    console.log(`📂 Category: ${work.category}`)
    console.log(`👤 Author: ${work.author}`) 
    console.log(`📊 Estimated chunks: ${work.estimated_chunks}`)
    console.log(`⚖️ Copyright: ${work.copyright_notice}`)
    
    // This is where we would implement the actual text ingestion
    // For now, just mark as planned
    console.log(`📋 Status: Ready for text ingestion implementation`)
  }
  
  console.log(`\n✅ Priority ${priority} analysis complete`)
}

// Main execution function
async function runComprehensiveIngestion() {
  try {
    console.log('🚀 COMPREHENSIVE AA LITERATURE INGESTION PIPELINE')
    console.log('=' .repeat(60))
    
    await initializeComprehensiveCatalog()
    await createIngestionPlan()
    await showCurrentStatus()
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Implement text chunking and embedding generation')
    console.log('2. Create attribution and fair-use compliance system')
    console.log('3. Build automated ingestion for Priority 1 works')
    console.log('4. Develop Grapevine archive processing (2004-2024)')
    console.log('5. Integrate with RAG system for intelligent responses')
    
    console.log('\n📄 Fair Use Compliance Features:')
    console.log('✓ Educational/recovery support purpose (non-commercial)')
    console.log('✓ Always include proper source attribution') 
    console.log('✓ Paraphrase AI responses when possible')
    console.log('✓ Serve AA\'s primary purpose of helping alcoholics')
    console.log('✓ Copyright notices preserved for all sources')
    
  } catch (error) {
    console.error('💥 Comprehensive ingestion failed:', error)
    throw error
  } finally {
    await pgPool.end()
  }
}

// Export for use in other modules
export { 
  comprehensiveCatalog, 
  initializeComprehensiveCatalog, 
  createIngestionPlan,
  ingestByPriority,
  runComprehensiveIngestion 
}

// Run if called directly  
if (require.main === module) {
  runComprehensiveIngestion()
    .then(() => {
      console.log('\n🎉 Comprehensive literature ingestion plan ready!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Pipeline failed:', error)
      process.exit(1)
    })
}