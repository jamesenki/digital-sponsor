import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Cleanup and Migration Script
 * 
 * Fixes duplicate literature sources and prepares clean catalog
 */

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

async function cleanupDuplicates() {
  try {
    console.log('🧹 Cleaning up duplicate and conflicting literature sources...')
    
    // First, let's see what we have
    const currentSources = await pgPool.query(
      'SELECT id, title, category FROM literature_sources ORDER BY category, title'
    )
    
    console.log('\n📚 Current sources in database:')
    currentSources.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.title}`)
    })
    
    // Remove the old "Alcoholics Anonymous (Big Book)" and keep the "4th Edition" version
    const oldBigBook = await pgPool.query(
      `SELECT id FROM literature_sources WHERE title = 'Alcoholics Anonymous (Big Book)'`
    )
    
    if (oldBigBook.rows.length > 0) {
      const oldId = oldBigBook.rows[0].id
      console.log(`\n🗑️  Removing old Big Book entry: ${oldId}`)
      
      // First delete any content associated with the old source
      await pgPool.query('DELETE FROM literature_content WHERE source_id = $1', [oldId])
      console.log('   - Removed associated content')
      
      // Then delete the source
      await pgPool.query('DELETE FROM literature_sources WHERE id = $1', [oldId])
      console.log('   - Removed old source record')
    }
    
    // Update the comprehensive Big Book title to be cleaner
    await pgPool.query(
      `UPDATE literature_sources 
       SET title = 'Alcoholics Anonymous (Big Book)', 
           updated_at = CURRENT_TIMESTAMP
       WHERE title = 'Alcoholics Anonymous (Big Book) - 4th Edition'`
    )
    console.log('✅ Updated Big Book title to standard format')
    
    // Verify cleanup
    const cleanedSources = await pgPool.query(
      'SELECT title, category FROM literature_sources ORDER BY category, title'
    )
    
    console.log('\n📚 Cleaned catalog:')
    cleanedSources.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.title}`)
    })
    
    console.log(`\n✅ Cleanup complete - ${cleanedSources.rows.length} sources in catalog`)
    
    return cleanedSources.rows.length
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    throw error
  }
}

async function validateCatalog() {
  try {
    console.log('\n🔍 Validating literature catalog...')
    
    // Check for essential works
    const essentialWorks = [
      'Alcoholics Anonymous (Big Book)',
      'Twelve Steps and Twelve Traditions', 
      'Daily Reflections',
      'AA Grapevine Archives (2004-2024)'
    ]
    
    for (const work of essentialWorks) {
      const result = await pgPool.query(
        'SELECT title FROM literature_sources WHERE title = $1',
        [work]
      )
      
      if (result.rows.length > 0) {
        console.log(`  ✅ ${work}`)
      } else {
        console.log(`  ❌ MISSING: ${work}`)
      }
    }
    
    // Check category distribution
    const categoryStats = await pgPool.query(`
      SELECT category, COUNT(*) as count
      FROM literature_sources 
      GROUP BY category 
      ORDER BY category
    `)
    
    console.log('\n📊 Sources by category:')
    categoryStats.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`)
    })
    
    // Check content status
    const contentStats = await pgPool.query(`
      SELECT 
        s.category,
        COUNT(c.id) as content_chunks
      FROM literature_sources s
      LEFT JOIN literature_content c ON s.id = c.source_id
      GROUP BY s.category
      ORDER BY s.category
    `)
    
    console.log('\n📝 Content chunks by category:')
    contentStats.rows.forEach(row => {
      console.log(`  ${row.category}: ${row.content_chunks} chunks`)
    })
    
    const totalContent = await pgPool.query('SELECT COUNT(*) as total FROM literature_content')
    console.log(`\n📊 Total content chunks: ${totalContent.rows[0].total}`)
    
    return true
    
  } catch (error) {
    console.error('❌ Validation failed:', error)
    throw error
  }
}

async function showIngestionPriorities() {
  try {
    console.log('\n🎯 RECOMMENDED INGESTION PRIORITIES:')
    
    console.log('\n📚 Priority 1 - Essential Core (Start Here):')
    console.log('  1. Alcoholics Anonymous (Big Book) - ~500 chunks')
    console.log('  2. Twelve Steps and Twelve Traditions - ~200 chunks') 
    console.log('  3. Daily Reflections - ~365 chunks')
    console.log('  → Total: ~1,065 chunks (most critical content)')
    
    console.log('\n📰 Priority 2 - Grapevine Content (Largest Volume):')
    console.log('  1. AA Grapevine Archives (2004-2024) - ~2,400 chunks')
    console.log('  2. Language of the Heart - ~150 chunks')
    console.log('  3. Best of Grapevine collections - ~300 chunks')
    console.log('  → Total: ~2,850 chunks (member experiences)')
    
    console.log('\n📖 Priority 3 - Supporting Works:')
    console.log('  1. As Bill Sees It - ~100 chunks')
    console.log('  2. Living Sober - ~80 chunks')
    console.log('  3. Came to Believe - ~120 chunks')
    console.log('  → Total: ~300 chunks (additional guidance)')
    
    console.log('\n🔍 NEXT STEPS:')
    console.log('1. Implement text chunking system for Priority 1 works')
    console.log('2. Create embedding generation with OpenAI')
    console.log('3. Build attribution and fair-use response system')
    console.log('4. Test RAG system with Big Book content first')
    console.log('5. Scale to full Grapevine archive (20 years)')
    
  } catch (error) {
    console.error('❌ Priority display failed:', error)
  }
}

async function runCleanupAndMigration() {
  try {
    console.log('🚀 LITERATURE CATALOG CLEANUP & MIGRATION')
    console.log('=' .repeat(50))
    
    const sourceCount = await cleanupDuplicates()
    await validateCatalog()
    await showIngestionPriorities()
    
    console.log('\n🎉 Cleanup and migration complete!')
    console.log(`📚 Clean catalog ready with ${sourceCount} literature sources`)
    console.log('🔄 Ready for text ingestion implementation')
    
  } catch (error) {
    console.error('💥 Cleanup and migration failed:', error)
    throw error
  } finally {
    await pgPool.end()
  }
}

// Run if called directly
if (require.main === module) {
  runCleanupAndMigration()
    .then(() => {
      console.log('\n✅ Migration completed successfully!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { cleanupDuplicates, validateCatalog, runCleanupAndMigration }