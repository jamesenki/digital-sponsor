import { Pool } from 'pg'
import { TextOnlyProcessor } from './text-only-ingestion'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

/**
 * Bulk Text Processing System
 * 
 * Processes large text files into searchable chunks
 * Supports multiple file formats and batch processing
 */

interface ProcessingJob {
  sourceId: string
  filePath: string
  metadata: {
    title: string
    author: string
    category: string
    estimatedChunks: number
  }
}

class BulkTextProcessor {
  private processor: TextOnlyProcessor
  private pgPool: Pool

  constructor() {
    this.processor = new TextOnlyProcessor()
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://digital_sponsor:password@localhost:5432/digital_sponsor_dev',
    })
  }

  /**
   * Process a single text file
   */
  async processTextFile(
    sourceId: string, 
    filePath: string, 
    options: {
      chapterPattern?: RegExp
      sectionPattern?: RegExp
      pagePattern?: RegExp
    } = {}
  ): Promise<{
    chunksCreated: number
    wordsProcessed: number
    processingTime: number
  }> {
    const startTime = Date.now()
    
    try {
      console.log(`📖 Processing file: ${filePath}`)
      
      // Read file content
      const fullText = fs.readFileSync(filePath, 'utf-8')
      console.log(`📄 File size: ${fullText.length} characters`)
      
      // Split into sections if patterns provided
      const sections = this.extractSections(fullText, options)
      console.log(`📚 Extracted ${sections.length} sections`)
      
      // Process sections
      const result = await this.processor.processSections(sourceId, sections)
      
      const processingTime = Date.now() - startTime
      
      console.log(`✅ Processing complete:`)
      console.log(`   📝 ${result.totalChunks} chunks created`)
      console.log(`   📊 ${result.totalWords} words processed`)
      console.log(`   ⏱️  ${(processingTime / 1000).toFixed(2)}s processing time`)
      
      return {
        chunksCreated: result.totalChunks,
        wordsProcessed: result.totalWords,
        processingTime
      }
      
    } catch (error) {
      console.error(`❌ File processing failed:`, error)
      throw error
    }
  }

  /**
   * Extract sections from text using patterns
   */
  private extractSections(
    text: string, 
    options: {
      chapterPattern?: RegExp
      sectionPattern?: RegExp
      pagePattern?: RegExp
    }
  ): Array<{
    title: string
    content: string
    pageNumber?: number
    chapterNumber?: number
  }> {
    const sections: Array<{
      title: string
      content: string
      pageNumber?: number
      chapterNumber?: number
    }> = []
    
    // Default: split by double newlines (paragraphs)
    if (!options.chapterPattern && !options.sectionPattern) {
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
      
      paragraphs.forEach((paragraph, index) => {
        sections.push({
          title: `Section ${index + 1}`,
          content: paragraph.trim(),
          pageNumber: Math.floor(index / 3) + 1, // Rough page estimation
          chapterNumber: Math.floor(index / 10) + 1 // Rough chapter estimation
        })
      })
      
      return sections
    }
    
    // Chapter-based splitting
    if (options.chapterPattern) {
      const chapterMatches = [...text.matchAll(options.chapterPattern)]
      
      for (let i = 0; i < chapterMatches.length; i++) {
        const match = chapterMatches[i]
        const nextMatch = chapterMatches[i + 1]
        
        const chapterStart = match.index || 0
        const chapterEnd = nextMatch ? nextMatch.index || text.length : text.length
        const chapterContent = text.slice(chapterStart, chapterEnd)
        
        sections.push({
          title: match[0].trim(),
          content: chapterContent,
          chapterNumber: i + 1,
          pageNumber: Math.floor(chapterStart / 2000) + 1 // Rough page estimation
        })
      }
    }
    
    return sections
  }

  /**
   * Process multiple files in batch
   */
  async processBatch(jobs: ProcessingJob[]): Promise<{
    totalFiles: number
    totalChunks: number
    totalWords: number
    successfulJobs: number
    failedJobs: number
    processingTime: number
  }> {
    const startTime = Date.now()
    let totalChunks = 0
    let totalWords = 0
    let successfulJobs = 0
    let failedJobs = 0
    
    console.log(`🚀 Starting batch processing of ${jobs.length} files`)
    
    for (const job of jobs) {
      try {
        console.log(`\n📂 Processing: ${job.metadata.title}`)
        
        const result = await this.processTextFile(job.sourceId, job.filePath)
        
        totalChunks += result.chunksCreated
        totalWords += result.wordsProcessed
        successfulJobs++
        
        // Small delay between files to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Failed to process ${job.metadata.title}:`, error)
        failedJobs++
      }
    }
    
    const processingTime = Date.now() - startTime
    
    console.log(`\n🎉 Batch processing complete:`)
    console.log(`   📁 ${successfulJobs}/${jobs.length} files processed successfully`)
    console.log(`   📝 ${totalChunks} total chunks created`)
    console.log(`   📊 ${totalWords} total words processed`)
    console.log(`   ⏱️  ${(processingTime / 1000).toFixed(2)}s total time`)
    
    return {
      totalFiles: jobs.length,
      totalChunks,
      totalWords,
      successfulJobs,
      failedJobs,
      processingTime
    }
  }

  /**
   * Create sample text files for testing
   */
  async createSampleFiles(): Promise<string[]> {
    const samplesDir = path.join(__dirname, '../../samples')
    
    // Create samples directory if it doesn't exist
    if (!fs.existsSync(samplesDir)) {
      fs.mkdirSync(samplesDir, { recursive: true })
    }
    
    const sampleTexts = [
      {
        filename: 'recovery-foundations.txt',
        content: `Chapter 1: Understanding Recovery

Recovery is a process of personal transformation. It involves developing new perspectives on life and building healthy relationships with oneself and others.

The journey begins with recognition that change is needed. This acknowledgment requires courage and honesty about one's current situation.

Chapter 2: Building Support Systems

No one recovers in isolation. Community and fellowship play essential roles in maintaining long-term wellness.

Support systems include friends, family, professionals, and peer networks. Each contributes unique value to the recovery process.

Chapter 3: Daily Practices

Regular practices form the foundation of sustained recovery. These might include reflection, exercise, healthy nutrition, and meaningful activities.

Consistency in daily routines helps establish stability and reduces stress during challenging periods.`
      },
      {
        filename: 'personal-growth.txt',
        content: `Section A: Self-Awareness

Personal growth begins with understanding one's thoughts, emotions, and behavioral patterns. This awareness creates opportunities for positive change.

Regular self-examination helps identify areas for improvement and celebrates progress made along the journey.

Section B: Goal Setting

Setting realistic, achievable goals provides direction and motivation. Goals should be specific, measurable, and aligned with personal values.

Progress toward goals should be monitored regularly, with adjustments made as circumstances change.

Section C: Relationship Building

Healthy relationships are built on trust, communication, and mutual respect. Learning to set boundaries and express needs clearly improves all interactions.

Forgiveness - of self and others - is often necessary for relationship healing and personal peace.`
      }
    ]
    
    const createdFiles: string[] = []
    
    for (const sample of sampleTexts) {
      const filePath = path.join(samplesDir, sample.filename)
      fs.writeFileSync(filePath, sample.content, 'utf-8')
      createdFiles.push(filePath)
      console.log(`✅ Created sample file: ${filePath}`)
    }
    
    return createdFiles
  }

  async close(): Promise<void> {
    await this.processor.close()
    await this.pgPool.end()
  }
}

// Test function
async function runBulkProcessing() {
  const processor = new BulkTextProcessor()
  
  try {
    console.log('🧪 Testing Bulk Text Processing System')
    console.log('=' .repeat(50))
    
    // Create sample files
    const sampleFiles = await processor.createSampleFiles()
    
    // Get literature sources for testing
    const sourcesResult = await processor['pgPool'].query(
      'SELECT id, title FROM literature_sources WHERE aa_approved = true LIMIT 2'
    )
    
    if (sourcesResult.rows.length < 2) {
      throw new Error('Need at least 2 literature sources for testing')
    }
    
    // Create processing jobs
    const jobs: ProcessingJob[] = sampleFiles.map((filePath, index) => ({
      sourceId: sourcesResult.rows[index].id,
      filePath,
      metadata: {
        title: path.basename(filePath, '.txt'),
        author: 'Sample Author',
        category: 'sample',
        estimatedChunks: 10
      }
    }))
    
    // Process batch
    const result = await processor.processBatch(jobs)
    
    console.log('\n📊 Final Results:')
    console.log(`   Success Rate: ${(result.successfulJobs / result.totalFiles * 100).toFixed(1)}%`)
    console.log(`   Avg Chunks per File: ${(result.totalChunks / result.successfulJobs).toFixed(1)}`)
    console.log(`   Avg Words per Chunk: ${(result.totalWords / result.totalChunks).toFixed(0)}`)
    
  } catch (error) {
    console.error('💥 Bulk processing test failed:', error)
    throw error
  } finally {
    await processor.close()
  }
}

// Run if called directly
if (require.main === module) {
  runBulkProcessing()
    .then(() => {
      console.log('\n🎉 Bulk processing test completed!')
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Test failed:', error)
      process.exit(1)
    })
}

export { BulkTextProcessor, ProcessingJob }