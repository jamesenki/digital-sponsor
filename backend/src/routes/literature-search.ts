import { Router, Request, Response } from 'express'
import { Pool } from 'pg'

// Simple async handler without dependencies
const asyncHandler = (fn: any) => (req: Request, res: Response, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * Literature Search Routes
 * 
 * Full-text search capabilities for literature content
 * AA Traditions compliant - anonymous access only
 */

const router = Router()

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
})

interface SearchResult {
  id: string
  sourceTitle: string
  sectionTitle: string
  content: string
  pageNumber?: number
  chapterNumber?: number
  relevanceScore: number
  copyright: string
}

/**
 * Search literature content
 */
router.post('/search', asyncHandler(async (req: Request, res: Response) => {
  const { query, limit = 10, category } = req.body
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      error: 'Search query is required',
      message: 'Please provide a non-empty search query'
    })
  }
  
  try {
    // Build search query with optional category filter
    let searchQuery = `
      SELECT 
        c.id,
        s.title as source_title,
        c.section_title,
        c.content_text,
        c.page_number,
        c.chapter_number,
        ts_rank(to_tsvector('english', c.content_text), plainto_tsquery('english', $1)) as relevance_score,
        s.copyright_notice
      FROM literature_content c
      JOIN literature_sources s ON c.source_id = s.id
      WHERE to_tsvector('english', c.content_text) @@ plainto_tsquery('english', $1)
        AND s.aa_approved = true
    `
    
    const queryParams: any[] = [query.trim()]
    
    if (category) {
      searchQuery += ' AND s.category = $2'
      queryParams.push(category)
    }
    
    searchQuery += ' ORDER BY relevance_score DESC LIMIT $' + (queryParams.length + 1)
    queryParams.push(Math.min(parseInt(limit) || 10, 50)) // Max 50 results
    
    const result = await pgPool.query(searchQuery, queryParams)
    
    const searchResults: SearchResult[] = result.rows.map(row => ({
      id: row.id,
      sourceTitle: row.source_title,
      sectionTitle: row.section_title,
      content: row.content_text,
      pageNumber: row.page_number,
      chapterNumber: row.chapter_number,
      relevanceScore: parseFloat(row.relevance_score),
      copyright: row.copyright_notice
    }))
    
    // Analytics logging disabled for now (table doesn't exist)
    // TODO: Implement usage analytics after schema update
    
    res.json({
      query: query.trim(),
      totalResults: searchResults.length,
      results: searchResults,
      compliance: {
        aa_traditions: true,
        anonymous_access: true,
        fair_use: true,
        attribution_required: true
      }
    })
    
  } catch (error) {
    console.error('Literature search failed:', error)
    res.status(500).json({
      error: 'Search failed',
      message: 'Unable to complete literature search'
    })
  }
}))

/**
 * Get literature sources catalog
 */
router.get('/sources', asyncHandler(async (req: Request, res: Response) => {
  try {
    const sourcesResult = await pgPool.query(`
      SELECT 
        s.id,
        s.title,
        s.category,
        s.author,
        s.published_date,
        s.copyright_notice,
        COUNT(c.id) as content_chunks
      FROM literature_sources s
      LEFT JOIN literature_content c ON s.id = c.source_id
      WHERE s.aa_approved = true
      GROUP BY s.id, s.title, s.category, s.author, s.published_date, s.copyright_notice
      ORDER BY s.category, s.title
    `)
    
    const sources = sourcesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      category: row.category,
      author: row.author,
      publishedDate: row.published_date,
      copyright: row.copyright_notice,
      contentChunks: parseInt(row.content_chunks),
      available: parseInt(row.content_chunks) > 0
    }))
    
    res.json({
      totalSources: sources.length,
      sources,
      compliance: {
        aa_approved_only: true,
        fair_use_attribution: true,
        anonymous_access: true
      }
    })
    
  } catch (error) {
    console.error('Sources catalog failed:', error)
    res.status(500).json({
      error: 'Catalog unavailable',
      message: 'Unable to retrieve literature sources'
    })
  }
}))

/**
 * Get content by source
 */
router.get('/source/:sourceId', asyncHandler(async (req: Request, res: Response) => {
  const { sourceId } = req.params
  const { limit = 20, offset = 0 } = req.query
  
  try {
    // Get source info
    const sourceResult = await pgPool.query(
      'SELECT * FROM literature_sources WHERE id = $1 AND aa_approved = true',
      [sourceId]
    )
    
    if (sourceResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Source not found',
        message: 'Literature source not found or not approved'
      })
    }
    
    const source = sourceResult.rows[0]
    
    // Get content chunks
    const contentResult = await pgPool.query(`
      SELECT 
        id,
        section_title,
        content_text,
        page_number,
        chapter_number,
        word_count
      FROM literature_content
      WHERE source_id = $1
      ORDER BY chapter_number, page_number, chunk_index
      LIMIT $2 OFFSET $3
    `, [sourceId, parseInt(limit as string), parseInt(offset as string)])
    
    const contentChunks = contentResult.rows.map(row => ({
      id: row.id,
      sectionTitle: row.section_title,
      content: row.content_text,
      pageNumber: row.page_number,
      chapterNumber: row.chapter_number,
      wordCount: row.word_count
    }))
    
    res.json({
      source: {
        id: source.id,
        title: source.title,
        category: source.category,
        author: source.author,
        copyright: source.copyright_notice
      },
      content: {
        totalChunks: contentChunks.length,
        chunks: contentChunks
      },
      attribution: `${source.title} by ${source.author}. ${source.copyright_notice}`,
      fairUse: true
    })
    
  } catch (error) {
    console.error('Source content retrieval failed:', error)
    res.status(500).json({
      error: 'Content unavailable',
      message: 'Unable to retrieve source content'
    })
  }
}))

/**
 * Advanced search with filters
 */
router.post('/advanced-search', asyncHandler(async (req: Request, res: Response) => {
  const { 
    query, 
    categories = [], 
    authors = [],
    pageRange,
    limit = 10 
  } = req.body
  
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({
      error: 'Search query is required',
      message: 'Please provide a non-empty search query'
    })
  }
  
  try {
    let searchQuery = `
      SELECT 
        c.id,
        s.title as source_title,
        s.category,
        s.author,
        c.section_title,
        c.content_text,
        c.page_number,
        c.chapter_number,
        ts_rank(to_tsvector('english', c.content_text), plainto_tsquery('english', $1)) as relevance_score,
        s.copyright_notice
      FROM literature_content c
      JOIN literature_sources s ON c.source_id = s.id
      WHERE to_tsvector('english', c.content_text) @@ plainto_tsquery('english', $1)
        AND s.aa_approved = true
    `
    
    const queryParams: any[] = [query.trim()]
    let paramIndex = 2
    
    // Add category filter
    if (categories.length > 0) {
      searchQuery += ` AND s.category = ANY($${paramIndex})`
      queryParams.push(categories)
      paramIndex++
    }
    
    // Add author filter
    if (authors.length > 0) {
      searchQuery += ` AND s.author = ANY($${paramIndex})`
      queryParams.push(authors)
      paramIndex++
    }
    
    // Add page range filter
    if (pageRange && pageRange.min !== undefined) {
      searchQuery += ` AND c.page_number >= $${paramIndex}`
      queryParams.push(pageRange.min)
      paramIndex++
    }
    
    if (pageRange && pageRange.max !== undefined) {
      searchQuery += ` AND c.page_number <= $${paramIndex}`
      queryParams.push(pageRange.max)
      paramIndex++
    }
    
    searchQuery += ` ORDER BY relevance_score DESC LIMIT $${paramIndex}`
    queryParams.push(Math.min(parseInt(limit) || 10, 50))
    
    const result = await pgPool.query(searchQuery, queryParams)
    
    const searchResults = result.rows.map(row => ({
      id: row.id,
      sourceTitle: row.source_title,
      category: row.category,
      author: row.author,
      sectionTitle: row.section_title,
      content: row.content_text,
      pageNumber: row.page_number,
      chapterNumber: row.chapter_number,
      relevanceScore: parseFloat(row.relevance_score),
      copyright: row.copyright_notice
    }))
    
    res.json({
      query: query.trim(),
      filters: { categories, authors, pageRange },
      totalResults: searchResults.length,
      results: searchResults
    })
    
  } catch (error) {
    console.error('Advanced search failed:', error)
    res.status(500).json({
      error: 'Advanced search failed',
      message: 'Unable to complete advanced search'
    })
  }
}))

export default router