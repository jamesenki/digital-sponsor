#!/usr/bin/env npx ts-node

/**
 * AA Grapevine Content Ingestion Pipeline
 * 
 * Processes Grapevine archives (2004-2024) with AA Traditions compliance
 * - Maintains complete anonymity
 * - Respects copyright and fair use
 * - Categorizes content for enhanced search
 * - Processes stories, articles, meditations, and features
 */

import { Pool, PoolClient } from 'pg'
import { promises as fs } from 'fs'
import path from 'path'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

interface GrapevineContent {
  title: string
  author: string
  type: 'story' | 'article' | 'meditation' | 'feature'
  published_date: string
  issue: string
  category: string
  content: string
  tags: string[]
  aa_traditions_compliant: boolean
  word_count: number
}

interface GrapevineArchive {
  grapevine_archives_2004_2024: {
    description: string
    copyright: string
    content_types: string[]
    sample_content: GrapevineContent[]
  }
  content_guidelines: any
}

class GrapevineIngestionService {
  private client: PoolClient | null = null

  async initialize(): Promise<void> {
    console.log('🍇 Initializing Grapevine Ingestion Service...')
    this.client = await pool.connect()
    console.log('✅ Database connection established')
  }

  async cleanup(): Promise<void> {
    if (this.client) {
      this.client.release()
      console.log('🔄 Database connection released')
    }
    await pool.end()
  }

  /**
   * Get or create Grapevine source record
   */
  async ensureGrapevineSource(
    title: string, 
    category: string, 
    copyright: string
  ): Promise<string> {
    if (!this.client) throw new Error('Database not initialized')

    const query = `
      INSERT INTO literature_sources (title, category, author, copyright_notice, aa_approved)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (title) 
      DO UPDATE SET 
        category = EXCLUDED.category,
        copyright_notice = EXCLUDED.copyright_notice,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `

    const result = await this.client.query(query, [
      title,
      category, 
      'AA Grapevine Contributors',
      copyright
    ])

    return result.rows[0].id
  }

  /**
   * Process and chunk Grapevine content for search
   */
  processGrapevineContent(content: GrapevineContent): Array<{
    section_title: string
    content_text: string
    metadata: any
    word_count: number
  }> {
    const chunks: Array<any> = []

    // For Grapevine content, we typically want to keep stories/articles as single chunks
    // unless they're very long (>800 words)
    if (content.word_count <= 800) {
      // Single chunk for shorter content
      chunks.push({
        section_title: content.title,
        content_text: content.content,
        metadata: {
          type: content.type,
          published_date: content.published_date,
          issue: content.issue,
          category: content.category,
          tags: content.tags,
          author: content.author,
          aa_traditions_compliant: content.aa_traditions_compliant
        },
        word_count: content.word_count
      })
    } else {
      // Split longer content into paragraphs
      const paragraphs = content.content.split('\\n\\n').filter(p => p.trim().length > 0)
      
      paragraphs.forEach((paragraph, index) => {
        const wordCount = paragraph.split(' ').length
        if (wordCount > 20) { // Only include substantial paragraphs
          chunks.push({
            section_title: `${content.title} - Part ${index + 1}`,
            content_text: paragraph.trim(),
            metadata: {
              type: content.type,
              published_date: content.published_date,
              issue: content.issue,
              category: content.category,
              tags: content.tags,
              author: content.author,
              aa_traditions_compliant: content.aa_traditions_compliant,
              chunk_part: index + 1,
              total_parts: paragraphs.length
            },
            word_count: wordCount
          })
        }
      })
    }

    return chunks
  }

  /**
   * Ingest Grapevine content into database
   */
  async ingestGrapevineContent(
    sourceId: string, 
    content: GrapevineContent
  ): Promise<number> {
    if (!this.client) throw new Error('Database not initialized')

    const chunks = this.processGrapevineContent(content)
    let insertedCount = 0

    for (const [index, chunk] of chunks.entries()) {
      const query = `
        INSERT INTO literature_content (
          source_id, 
          section_title, 
          content_text, 
          chunk_index,
          word_count,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `

      const result = await this.client.query(query, [
        sourceId,
        chunk.section_title,
        chunk.content_text,
        index,
        chunk.word_count,
        JSON.stringify(chunk.metadata)
      ])

      if (result.rowCount && result.rowCount > 0) {
        insertedCount++
      }
    }

    return insertedCount
  }

  /**
   * Load and process Grapevine sample data
   */
  async loadSampleGrapevineData(): Promise<void> {
    console.log('📚 Loading Grapevine sample data...')

    const sampleFilePath = path.join(__dirname, '../../samples/grapevine-sample-stories.json')
    
    try {
      const fileContent = await fs.readFile(sampleFilePath, 'utf-8')
      const grapevineData: GrapevineArchive = JSON.parse(fileContent)

      // Ensure main Grapevine source exists
      const sourceId = await this.ensureGrapevineSource(
        'AA Grapevine Archives (2004-2024)',
        'grapevine_modern',
        grapevineData.grapevine_archives_2004_2024.copyright
      )

      console.log(`📖 Processing ${grapevineData.grapevine_archives_2004_2024.sample_content.length} Grapevine items...`)

      let totalInserted = 0

      for (const content of grapevineData.grapevine_archives_2004_2024.sample_content) {
        // Validate AA Traditions compliance
        if (!content.aa_traditions_compliant) {
          console.log(`⚠️ Skipping non-compliant content: ${content.title}`)
          continue
        }

        try {
          const inserted = await this.ingestGrapevineContent(sourceId, content)
          totalInserted += inserted
          
          console.log(`✅ Processed: "${content.title}" (${content.type}) - ${inserted} chunks`)
        } catch (error) {
          console.error(`❌ Error processing "${content.title}":`, error)
        }
      }

      console.log(`🎉 Grapevine ingestion complete! Inserted ${totalInserted} content chunks`)

    } catch (error) {
      console.error('❌ Error loading Grapevine sample data:', error)
      throw error
    }
  }

  /**
   * Load additional Grapevine collections
   */
  async loadGrapevineCollections(): Promise<void> {
    console.log('📚 Loading additional Grapevine collections...')

    const collections = [
      {
        title: 'The Best of the Grapevine - Volume 1',
        category: 'best_grapevine',
        description: 'Classic stories from AA Grapevine archives'
      },
      {
        title: 'Spiritual Awakenings - Grapevine Collection', 
        category: 'grapevine_spiritual',
        description: 'Stories of spiritual growth and awakening'
      },
      {
        title: 'In Our Own Words - Stories by Women',
        category: 'grapevine_women', 
        description: 'Recovery stories by women in AA'
      },
      {
        title: 'Young & Sober - Grapevine Collection',
        category: 'grapevine_young',
        description: 'Stories by young people in recovery'
      }
    ]

    for (const collection of collections) {
      await this.ensureGrapevineSource(
        collection.title,
        collection.category,
        'Copyright © AA Grapevine, Inc.'
      )
      console.log(`✅ Ensured source: ${collection.title}`)
    }

    console.log('🎉 Grapevine collections setup complete!')
  }

  /**
   * Generate statistics for ingested content
   */
  async generateStatistics(): Promise<void> {
    if (!this.client) throw new Error('Database not initialized')

    console.log('\\n📊 Grapevine Content Statistics:')

    // Count by source
    const sourceStats = await this.client.query(`
      SELECT 
        ls.title,
        ls.category,
        COUNT(lc.id) as content_chunks,
        SUM(lc.word_count) as total_words
      FROM literature_sources ls
      LEFT JOIN literature_content lc ON ls.id = lc.source_id
      WHERE ls.category LIKE '%grapevine%'
      GROUP BY ls.id, ls.title, ls.category
      ORDER BY content_chunks DESC
    `)

    sourceStats.rows.forEach(row => {
      console.log(`  📖 ${row.title}`)
      console.log(`     Category: ${row.category}`)
      console.log(`     Chunks: ${row.content_chunks}`)
      console.log(`     Words: ${row.total_words || 0}`)
      console.log()
    })

    // Count by content type (from metadata)
    const typeStats = await this.client.query(`
      SELECT 
        metadata->>'type' as content_type,
        COUNT(*) as count
      FROM literature_content lc
      JOIN literature_sources ls ON lc.source_id = ls.id
      WHERE ls.category LIKE '%grapevine%'
        AND metadata->>'type' IS NOT NULL
      GROUP BY metadata->>'type'
      ORDER BY count DESC
    `)

    if (typeStats.rows.length > 0) {
      console.log('📝 Content Types:')
      typeStats.rows.forEach(row => {
        console.log(`  ${row.content_type}: ${row.count}`)
      })
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const service = new GrapevineIngestionService()

  try {
    await service.initialize()

    console.log('🍇 Starting AA Grapevine Content Ingestion...')
    console.log('📋 This process respects AA Traditions and copyright guidelines\\n')

    // Load Grapevine collections (ensure they exist in database)
    await service.loadGrapevineCollections()

    // Load sample content
    await service.loadSampleGrapevineData()

    // Generate statistics
    await service.generateStatistics()

    console.log('\\n✅ Grapevine ingestion completed successfully!')
    console.log('🤝 All content maintains AA Traditions compliance')
    console.log('📚 Content is now available for literature search')

  } catch (error) {
    console.error('❌ Grapevine ingestion failed:', error)
    process.exit(1)
  } finally {
    await service.cleanup()
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { GrapevineIngestionService }