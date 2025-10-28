#!/usr/bin/env npx ts-node

/**
 * AA Grapevine Collections Content Ingestion
 * 
 * Processes additional Grapevine collections with diverse content
 * - Best of Grapevine (classic stories)
 * - Spiritual Awakenings (spiritual growth stories)
 * - In Our Own Words (women's stories)  
 * - Young & Sober (young people's stories)
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

interface GrapevineCollections {
  grapevine_collections: {
    best_grapevine: GrapevineContent[]
    grapevine_spiritual: GrapevineContent[]
    grapevine_women: GrapevineContent[]
    grapevine_young: GrapevineContent[]
  }
  collection_metadata: any
}

class GrapevineCollectionsService {
  private client: PoolClient | null = null

  async initialize(): Promise<void> {
    console.log('🍇 Initializing Grapevine Collections Service...')
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

  async getSourceIdByCategory(category: string): Promise<string | null> {
    if (!this.client) throw new Error('Database not initialized')

    const query = 'SELECT id FROM literature_sources WHERE category = $1 LIMIT 1'
    const result = await this.client.query(query, [category])
    
    return result.rows.length > 0 ? result.rows[0].id : null
  }

  /**
   * Process and chunk content for different collection types
   */
  processCollectionContent(content: GrapevineContent, collectionType: string): Array<{
    section_title: string
    content_text: string
    metadata: any
    word_count: number
  }> {
    return [{
      section_title: content.title,
      content_text: content.content,
      metadata: {
        type: content.type,
        published_date: content.published_date,
        issue: content.issue,
        category: content.category,
        tags: content.tags,
        author: content.author,
        aa_traditions_compliant: content.aa_traditions_compliant,
        collection: collectionType,
        era: this.determineEra(content.published_date)
      },
      word_count: content.word_count
    }]
  }

  private determineEra(publishedDate: string): string {
    const year = new Date(publishedDate).getFullYear()
    if (year < 1980) return 'classic'
    if (year < 2000) return 'modern_classic'
    if (year < 2010) return 'contemporary'
    return 'current'
  }

  /**
   * Ingest content into specific collection
   */
  async ingestToCollection(
    collectionCategory: string,
    content: GrapevineContent,
    collectionType: string
  ): Promise<number> {
    if (!this.client) throw new Error('Database not initialized')

    const sourceId = await this.getSourceIdByCategory(collectionCategory)
    if (!sourceId) {
      console.log(`⚠️ Source not found for category: ${collectionCategory}`)
      return 0
    }

    const chunks = this.processCollectionContent(content, collectionType)
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
   * Load and process all Grapevine collections
   */
  async loadGrapevineCollections(): Promise<void> {
    console.log('📚 Loading Grapevine collections sample data...')

    const sampleFilePath = path.join(__dirname, '../../samples/grapevine-collections-sample.json')
    
    try {
      const fileContent = await fs.readFile(sampleFilePath, 'utf-8')
      const collectionsData: GrapevineCollections = JSON.parse(fileContent)

      const collections = [
        {
          key: 'best_grapevine',
          category: 'best_grapevine',
          name: 'Best of Grapevine',
          content: collectionsData.grapevine_collections.best_grapevine
        },
        {
          key: 'grapevine_spiritual',
          category: 'grapevine_spiritual', 
          name: 'Spiritual Awakenings',
          content: collectionsData.grapevine_collections.grapevine_spiritual
        },
        {
          key: 'grapevine_women',
          category: 'grapevine_women',
          name: 'In Our Own Words (Women)',
          content: collectionsData.grapevine_collections.grapevine_women
        },
        {
          key: 'grapevine_young',
          category: 'grapevine_young',
          name: 'Young & Sober',
          content: collectionsData.grapevine_collections.grapevine_young
        }
      ]

      let totalInserted = 0

      for (const collection of collections) {
        console.log(`\\n📖 Processing ${collection.name} collection...`)
        
        for (const content of collection.content) {
          // Validate AA Traditions compliance
          if (!content.aa_traditions_compliant) {
            console.log(`⚠️ Skipping non-compliant content: ${content.title}`)
            continue
          }

          try {
            const inserted = await this.ingestToCollection(
              collection.category,
              content,
              collection.key
            )
            totalInserted += inserted
            
            console.log(`✅ ${collection.name}: "${content.title}" (${content.type}) - ${inserted} chunks`)
          } catch (error) {
            console.error(`❌ Error processing "${content.title}":`, error)
          }
        }
      }

      console.log(`\\n🎉 Collections ingestion complete! Inserted ${totalInserted} content chunks`)

    } catch (error) {
      console.error('❌ Error loading Grapevine collections:', error)
      throw error
    }
  }

  /**
   * Generate comprehensive statistics
   */
  async generateStatistics(): Promise<void> {
    if (!this.client) throw new Error('Database not initialized')

    console.log('\\n📊 Complete Grapevine Statistics:')

    // Count by source and collection
    const sourceStats = await this.client.query(`
      SELECT 
        ls.title,
        ls.category,
        COUNT(lc.id) as content_chunks,
        SUM(lc.word_count) as total_words
      FROM literature_sources ls
      LEFT JOIN literature_content lc ON ls.id = lc.source_id
      WHERE ls.category LIKE '%grapevine%' OR ls.category = 'best_grapevine'
      GROUP BY ls.id, ls.title, ls.category
      ORDER BY content_chunks DESC
    `)

    sourceStats.rows.forEach(row => {
      if (row.content_chunks > 0) {
        console.log(`  📖 ${row.title}`)
        console.log(`     Category: ${row.category}`)
        console.log(`     Chunks: ${row.content_chunks}`)
        console.log(`     Words: ${row.total_words}`)
        console.log()
      }
    })

    // Count by content type and collection
    const collectionStats = await this.client.query(`
      SELECT 
        metadata->>'collection' as collection,
        metadata->>'type' as content_type,
        COUNT(*) as count
      FROM literature_content lc
      JOIN literature_sources ls ON lc.source_id = ls.id
      WHERE (ls.category LIKE '%grapevine%' OR ls.category = 'best_grapevine')
        AND metadata->>'collection' IS NOT NULL
      GROUP BY metadata->>'collection', metadata->>'type'
      ORDER BY collection, count DESC
    `)

    if (collectionStats.rows.length > 0) {
      console.log('📝 Content by Collection & Type:')
      let currentCollection = ''
      collectionStats.rows.forEach(row => {
        if (row.collection !== currentCollection) {
          console.log(`  ${row.collection}:`)
          currentCollection = row.collection
        }
        console.log(`    ${row.content_type}: ${row.count}`)
      })
    }

    // Era distribution
    const eraStats = await this.client.query(`
      SELECT 
        metadata->>'era' as era,
        COUNT(*) as count
      FROM literature_content lc
      JOIN literature_sources ls ON lc.source_id = ls.id
      WHERE (ls.category LIKE '%grapevine%' OR ls.category = 'best_grapevine')
        AND metadata->>'era' IS NOT NULL
      GROUP BY metadata->>'era'
      ORDER BY count DESC
    `)

    if (eraStats.rows.length > 0) {
      console.log('\\n📅 Content by Era:')
      eraStats.rows.forEach(row => {
        console.log(`  ${row.era}: ${row.count}`)
      })
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const service = new GrapevineCollectionsService()

  try {
    await service.initialize()

    console.log('🍇 Starting Grapevine Collections Ingestion...')
    console.log('📋 Processing diverse AA recovery stories from multiple collections\\n')

    // Load all collections
    await service.loadGrapevineCollections()

    // Generate comprehensive statistics
    await service.generateStatistics()

    console.log('\\n✅ Grapevine collections ingestion completed successfully!')
    console.log('🤝 All content maintains AA Traditions compliance')
    console.log('📚 Diverse recovery stories now available for search')

  } catch (error) {
    console.error('❌ Grapevine collections ingestion failed:', error)
    process.exit(1)
  } finally {
    await service.cleanup()
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { GrapevineCollectionsService }