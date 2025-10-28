import { Pool } from 'pg'
import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config()

/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * Combines literature search with AI response generation
 * AA Traditions Compliant - Educational purpose only
 */

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

interface ChatResponse {
  response: string
  sources: SourceCitation[]
  confidence: number
  responseType: 'literature_based' | 'general_guidance' | 'crisis_referral'
  compliance: {
    aa_traditions: boolean
    fair_use: boolean
    educational_purpose: boolean
  }
}

interface SourceCitation {
  title: string
  page?: number
  excerpt: string
  copyright: string
}

class RAGService {
  private pgPool: Pool
  private openai: OpenAI | null = null
  private readonly MAX_SEARCH_RESULTS = 5
  private readonly MAX_CONTEXT_LENGTH = 2000 // characters

  constructor() {
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
    })

    // Initialize OpenAI only if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    }
  }

  /**
   * Search literature for relevant content
   */
  private async searchLiterature(query: string): Promise<SearchResult[]> {
    try {
      const searchQuery = `
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
        ORDER BY relevance_score DESC
        LIMIT $2
      `
      
      const result = await this.pgPool.query(searchQuery, [query.trim(), this.MAX_SEARCH_RESULTS])
      
      return result.rows.map(row => ({
        id: row.id,
        sourceTitle: row.source_title,
        sectionTitle: row.section_title,
        content: row.content_text,
        pageNumber: row.page_number,
        chapterNumber: row.chapter_number,
        relevanceScore: parseFloat(row.relevance_score),
        copyright: row.copyright_notice
      }))
      
    } catch (error) {
      console.error('Literature search failed:', error)
      return []
    }
  }

  /**
   * Build context from search results
   */
  private buildContext(searchResults: SearchResult[]): string {
    let context = ''
    let totalLength = 0
    
    for (const result of searchResults) {
      const citation = `\n\nFrom "${result.sourceTitle}" - ${result.sectionTitle}${result.pageNumber ? ` (p. ${result.pageNumber})` : ''}:\n${result.content}`
      
      if (totalLength + citation.length > this.MAX_CONTEXT_LENGTH) {
        break
      }
      
      context += citation
      totalLength += citation.length
    }
    
    return context
  }

  /**
   * Generate AI response using literature context
   */
  private async generateAIResponse(
    userQuery: string, 
    literatureContext: string,
    searchResults: SearchResult[]
  ): Promise<string> {
    if (!this.openai) {
      return this.generateFallbackResponse(userQuery, searchResults)
    }

    try {
      const systemPrompt = `You are a Digital Sponsor, an AI assistant that helps people with recovery questions using only AA-approved literature. 

CRITICAL INSTRUCTIONS:
- ONLY use information from the provided literature context
- Always maintain AA Traditions compliance (especially anonymity and no endorsements)
- Provide educational support, not medical or professional advice
- Include proper attribution to sources
- If the literature doesn't address the question, say so honestly
- Never provide personal opinions or non-literature based advice
- Focus on hope, experience, strength, and recovery principles

The user's question should be answered using the AA literature provided in the context below.`

      const userPrompt = `User Question: ${userQuery}

AA Literature Context:
${literatureContext}

Please provide a helpful response based ONLY on the AA literature provided above. Include specific citations when referencing the literature.`

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })

      return response.choices[0]?.message?.content || this.generateFallbackResponse(userQuery, searchResults)
      
    } catch (error) {
      console.error('AI response generation failed:', error)
      return this.generateFallbackResponse(userQuery, searchResults)
    }
  }

  /**
   * Generate fallback response without AI
   */
  private generateFallbackResponse(userQuery: string, searchResults: SearchResult[]): string {
    if (searchResults.length === 0) {
      return `I searched our AA literature database for "${userQuery}" but didn't find specific content to address your question. You might try rephrasing your question or contacting your local AA group for guidance.

For immediate support:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Find local AA meetings: https://www.aa.org/meeting-guide`
    }

    const topResult = searchResults[0]
    return `Based on your question about "${userQuery}", here's what I found in our AA literature:

From "${topResult.sourceTitle}" - ${topResult.sectionTitle}${topResult.pageNumber ? ` (page ${topResult.pageNumber})` : ''}:

"${topResult.content}"

${topResult.copyright}

This response is based solely on AA-approved literature and is provided for educational purposes. For personal guidance, please speak with a sponsor or attend an AA meeting.`
  }

  /**
   * Create source citations from search results
   */
  private createCitations(searchResults: SearchResult[]): SourceCitation[] {
    return searchResults.map(result => ({
      title: `${result.sourceTitle} - ${result.sectionTitle}`,
      page: result.pageNumber,
      excerpt: result.content.substring(0, 150) + (result.content.length > 150 ? '...' : ''),
      copyright: result.copyright
    }))
  }

  /**
   * Determine response type based on query and results
   */
  private determineResponseType(query: string, searchResults: SearchResult[]): ChatResponse['responseType'] {
    const crisisKeywords = ['suicide', 'kill', 'death', 'crisis', 'emergency', 'help']
    const lowerQuery = query.toLowerCase()
    
    if (crisisKeywords.some(keyword => lowerQuery.includes(keyword))) {
      return 'crisis_referral'
    }
    
    if (searchResults.length > 0 && searchResults[0].relevanceScore > 0.01) {
      return 'literature_based'
    }
    
    return 'general_guidance'
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(searchResults: SearchResult[], responseType: ChatResponse['responseType']): number {
    if (responseType === 'crisis_referral') return 1.0
    if (searchResults.length === 0) return 0.2
    
    const avgRelevance = searchResults.reduce((sum, r) => sum + r.relevanceScore, 0) / searchResults.length
    return Math.min(0.9, Math.max(0.3, avgRelevance * 10))
  }

  /**
   * Main chat processing method
   */
  async processChat(userQuery: string, sessionId?: string): Promise<ChatResponse> {
    try {
      console.log(`🔍 Processing chat query: "${userQuery}"`)
      
      // Search literature for relevant content
      const searchResults = await this.searchLiterature(userQuery)
      console.log(`📚 Found ${searchResults.length} literature results`)
      
      // Build context from search results
      const literatureContext = this.buildContext(searchResults)
      
      // Generate AI response
      const aiResponse = await this.generateAIResponse(userQuery, literatureContext, searchResults)
      
      // Create citations
      const citations = this.createCitations(searchResults)
      
      // Determine response characteristics
      const responseType = this.determineResponseType(userQuery, searchResults)
      const confidence = this.calculateConfidence(searchResults, responseType)
      
      console.log(`✅ Generated ${responseType} response with ${confidence.toFixed(2)} confidence`)
      
      return {
        response: aiResponse,
        sources: citations,
        confidence,
        responseType,
        compliance: {
          aa_traditions: true,
          fair_use: true,
          educational_purpose: true
        }
      }
      
    } catch (error) {
      console.error('Chat processing failed:', error)
      
      // Emergency fallback response
      return {
        response: 'I apologize, but I\'m unable to process your question right now. Please try again later or contact your local AA group for support.\n\nIf you\'re in crisis:\n- National Suicide Prevention Lifeline: 988\n- Crisis Text Line: Text HOME to 741741',
        sources: [],
        confidence: 0.1,
        responseType: 'crisis_referral',
        compliance: {
          aa_traditions: true,
          fair_use: true,
          educational_purpose: true
        }
      }
    }
  }

  /**
   * Get processing statistics
   */
  async getStats(): Promise<{
    totalContent: number
    availableSources: number
    aiEnabled: boolean
  }> {
    try {
      const contentResult = await this.pgPool.query('SELECT COUNT(*) as total FROM literature_content')
      const sourcesResult = await this.pgPool.query('SELECT COUNT(*) as total FROM literature_sources WHERE aa_approved = true')
      
      return {
        totalContent: parseInt(contentResult.rows[0].total),
        availableSources: parseInt(sourcesResult.rows[0].total),
        aiEnabled: !!this.openai
      }
      
    } catch (error) {
      console.error('Stats retrieval failed:', error)
      return { totalContent: 0, availableSources: 0, aiEnabled: false }
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pgPool.end()
  }
}

export { RAGService, ChatResponse, SourceCitation }