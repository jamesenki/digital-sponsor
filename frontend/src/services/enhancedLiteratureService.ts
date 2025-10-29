/**
 * Enhanced AA Literature Service
 * 
 * Comprehensive literature search, reading progress, bookmarks, and study tools
 * Maintains AA Traditions - no personal data collection, complete anonymity
 */

export interface LiteratureItem {
  id: string
  title: string
  type: 'book' | 'pamphlet' | 'reflection' | 'tradition' | 'step' | 'story'
  category: string
  subcategory?: string
  content: LiteratureContent[]
  description: string
  pageCount: number
  publishedYear?: number
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  suggestedFor: string[]
  isOfflineAvailable: boolean
  lastUpdated: Date
}

export interface LiteratureContent {
  id: string
  pageNumber: number
  chapterTitle?: string
  sectionTitle?: string
  content: string
  contentType: 'text' | 'prayer' | 'step' | 'tradition' | 'story'
  wordCount: number
  readingTime: number // estimated minutes
}

export interface ReadingProgress {
  literatureId: string
  currentPage: number
  totalPages: number
  progressPercentage: number
  timeSpent: number // minutes
  lastReadDate: Date
  isCompleted: boolean
  bookmarks: Bookmark[]
  notes: PersonalNote[]
}

export interface Bookmark {
  id: string
  literatureId: string
  pageNumber: number
  content: string
  title: string
  createdDate: Date
  tags: string[]
  color: 'yellow' | 'blue' | 'green' | 'red' | 'purple'
}

export interface PersonalNote {
  id: string
  literatureId: string
  pageNumber: number
  content: string
  isPrivate: boolean
  createdDate: Date
  modifiedDate: Date
  tags: string[]
}

export interface DailyReflection {
  id: string
  date: string // YYYY-MM-DD format
  title: string
  content: string
  bigBookReference?: string
  stepReference?: number
  traditionReference?: number
  tags: string[]
  suggestedActions: string[]
  reflectionQuestions: string[]
}

export interface LiteratureSearchFilters {
  query?: string
  categories?: string[]
  types?: string[]
  difficulty?: string[]
  tags?: string[]
  suggestedFor?: string[]
  sortBy?: 'relevance' | 'title' | 'date' | 'popularity' | 'reading_time'
  sortOrder?: 'asc' | 'desc'
  pageSize?: number
  onlyOfflineAvailable?: boolean
}

export interface LiteratureSearchResult {
  items: LiteratureItem[]
  totalFound: number
  searchTime: number
  suggestions?: string[]
  facets: SearchFacets
}

export interface SearchFacets {
  categories: { name: string; count: number }[]
  types: { name: string; count: number }[]
  tags: { name: string; count: number }[]
  difficulty: { name: string; count: number }[]
}

export interface StudySession {
  id: string
  startTime: Date
  endTime?: Date
  literatureId: string
  pagesRead: number[]
  notesAdded: number
  bookmarksAdded: number
  totalTime: number // minutes
  completionStatus: 'in_progress' | 'completed' | 'paused'
}

export class EnhancedLiteratureService {
  private readonly STORAGE_KEYS = {
    reading_progress: 'aa_reading_progress',
    bookmarks: 'aa_bookmarks',
    notes: 'aa_personal_notes',
    study_sessions: 'aa_study_sessions',
    preferences: 'aa_literature_preferences'
  }

  private literatureDatabase: Map<string, LiteratureItem> = new Map()
  private dailyReflections: Map<string, DailyReflection> = new Map()
  private searchIndex: Map<string, string[]> = new Map()

  constructor() {
    this.initializeLiteratureDatabase()
    this.buildSearchIndex()
    this.cleanupOldData()
  }

  /**
   * Search literature with advanced filtering and ranking
   */
  async searchLiterature(filters: LiteratureSearchFilters): Promise<LiteratureSearchResult> {
    const startTime = Date.now()
    
    let results = Array.from(this.literatureDatabase.values())

    // Apply filters
    if (filters.query && filters.query.trim()) {
      results = this.performTextSearch(results, filters.query)
    }

    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(item => filters.categories!.includes(item.category))
    }

    if (filters.types && filters.types.length > 0) {
      results = results.filter(item => filters.types!.includes(item.type))
    }

    if (filters.difficulty && filters.difficulty.length > 0) {
      results = results.filter(item => filters.difficulty!.includes(item.difficulty))
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(item => 
        filters.tags!.some(tag => item.tags.includes(tag))
      )
    }

    if (filters.onlyOfflineAvailable) {
      results = results.filter(item => item.isOfflineAvailable)
    }

    // Sort results
    results = this.sortResults(results, filters.sortBy || 'relevance', filters.sortOrder || 'desc')

    // Apply pagination
    const pageSize = filters.pageSize || 20
    const paginatedResults = results.slice(0, pageSize)

    // Build facets for filtering UI
    const facets = this.buildSearchFacets(Array.from(this.literatureDatabase.values()))

    return {
      items: paginatedResults,
      totalFound: results.length,
      searchTime: Date.now() - startTime,
      suggestions: this.generateSearchSuggestions(filters.query || '', results.length),
      facets
    }
  }

  /**
   * Get literature item by ID with full content
   */
  async getLiteratureById(id: string): Promise<LiteratureItem | null> {
    return this.literatureDatabase.get(id) || null
  }

  /**
   * Get reading progress for a literature item
   */
  getReadingProgress(literatureId: string): ReadingProgress | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.reading_progress)
      if (!stored) return null

      const allProgress = JSON.parse(stored)
      const progress = allProgress[literatureId]
      
      if (progress) {
        return {
          ...progress,
          lastReadDate: new Date(progress.lastReadDate),
          bookmarks: progress.bookmarks?.map((b: any) => ({
            ...b,
            createdDate: new Date(b.createdDate)
          })) || [],
          notes: progress.notes?.map((n: any) => ({
            ...n,
            createdDate: new Date(n.createdDate),
            modifiedDate: new Date(n.modifiedDate)
          })) || []
        }
      }
      
      return null
    } catch (error) {
      console.error('Failed to get reading progress:', error)
      return null
    }
  }

  /**
   * Update reading progress
   */
  updateReadingProgress(literatureId: string, pageNumber: number, timeSpent: number = 0): void {
    try {
      const literature = this.literatureDatabase.get(literatureId)
      if (!literature) return

      const stored = localStorage.getItem(this.STORAGE_KEYS.reading_progress) || '{}'
      const allProgress = JSON.parse(stored)
      
      const existing = allProgress[literatureId] || {
        literatureId,
        currentPage: 0,
        totalPages: literature.pageCount,
        progressPercentage: 0,
        timeSpent: 0,
        lastReadDate: new Date(),
        isCompleted: false,
        bookmarks: [],
        notes: []
      }

      // Update progress
      existing.currentPage = Math.max(existing.currentPage, pageNumber)
      existing.progressPercentage = Math.round((existing.currentPage / existing.totalPages) * 100)
      existing.timeSpent += timeSpent
      existing.lastReadDate = new Date()
      existing.isCompleted = existing.currentPage >= existing.totalPages

      allProgress[literatureId] = existing
      localStorage.setItem(this.STORAGE_KEYS.reading_progress, JSON.stringify(allProgress))

      console.log(`📚 Progress updated: ${literature.title} - Page ${pageNumber} (${existing.progressPercentage}%)`)
    } catch (error) {
      console.error('Failed to update reading progress:', error)
    }
  }

  /**
   * Add bookmark
   */
  addBookmark(bookmark: Omit<Bookmark, 'id' | 'createdDate'>): string {
    try {
      const bookmarkId = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newBookmark: Bookmark = {
        ...bookmark,
        id: bookmarkId,
        createdDate: new Date()
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.bookmarks) || '[]'
      const bookmarks = JSON.parse(stored)
      bookmarks.push(newBookmark)
      
      localStorage.setItem(this.STORAGE_KEYS.bookmarks, JSON.stringify(bookmarks))
      
      console.log(`🔖 Bookmark added: ${bookmark.title}`)
      return bookmarkId
    } catch (error) {
      console.error('Failed to add bookmark:', error)
      return ''
    }
  }

  /**
   * Get bookmarks for literature item
   */
  getBookmarks(literatureId?: string): Bookmark[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.bookmarks) || '[]'
      let bookmarks = JSON.parse(stored).map((b: any) => ({
        ...b,
        createdDate: new Date(b.createdDate)
      }))

      if (literatureId) {
        bookmarks = bookmarks.filter((b: Bookmark) => b.literatureId === literatureId)
      }

      return bookmarks.sort((a: Bookmark, b: Bookmark) => b.createdDate.getTime() - a.createdDate.getTime())
    } catch (error) {
      console.error('Failed to get bookmarks:', error)
      return []
    }
  }

  /**
   * Remove bookmark
   */
  removeBookmark(bookmarkId: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.bookmarks) || '[]'
      const bookmarks = JSON.parse(stored)
      const updated = bookmarks.filter((b: any) => b.id !== bookmarkId)
      
      localStorage.setItem(this.STORAGE_KEYS.bookmarks, JSON.stringify(updated))
      console.log(`🗑️ Bookmark removed`)
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    }
  }

  /**
   * Add personal note
   */
  addNote(note: Omit<PersonalNote, 'id' | 'createdDate' | 'modifiedDate'>): string {
    try {
      const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const newNote: PersonalNote = {
        ...note,
        id: noteId,
        createdDate: new Date(),
        modifiedDate: new Date()
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.notes) || '[]'
      const notes = JSON.parse(stored)
      notes.push(newNote)
      
      localStorage.setItem(this.STORAGE_KEYS.notes, JSON.stringify(notes))
      
      console.log(`📝 Note added`)
      return noteId
    } catch (error) {
      console.error('Failed to add note:', error)
      return ''
    }
  }

  /**
   * Get notes for literature item
   */
  getNotes(literatureId?: string): PersonalNote[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.notes) || '[]'
      let notes = JSON.parse(stored).map((n: any) => ({
        ...n,
        createdDate: new Date(n.createdDate),
        modifiedDate: new Date(n.modifiedDate)
      }))

      if (literatureId) {
        notes = notes.filter((n: PersonalNote) => n.literatureId === literatureId)
      }

      return notes.sort((a: PersonalNote, b: PersonalNote) => b.modifiedDate.getTime() - a.modifiedDate.getTime())
    } catch (error) {
      console.error('Failed to get notes:', error)
      return []
    }
  }

  /**
   * Get daily reflection for specific date
   */
  getDailyReflection(date?: string): DailyReflection | null {
    const targetDate = date || new Date().toISOString().split('T')[0]
    return this.dailyReflections.get(targetDate) || this.generateDailyReflection(targetDate)
  }

  /**
   * Get literature recommendations based on reading history
   */
  getRecommendations(limit: number = 6): LiteratureItem[] {
    try {
      // Get reading progress to understand user preferences
      const stored = localStorage.getItem(this.STORAGE_KEYS.reading_progress) || '{}'
      const allProgress = JSON.parse(stored)
      
      const readItems = Object.keys(allProgress)
      const userPreferences = this.analyzeUserPreferences(readItems)
      
      // Get unread items matching preferences
      const unreadItems = Array.from(this.literatureDatabase.values())
        .filter(item => !readItems.includes(item.id))
      
      // Score and rank recommendations
      const scored = unreadItems.map(item => ({
        item,
        score: this.calculateRecommendationScore(item, userPreferences)
      }))
      
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.item)
        
    } catch (error) {
      console.error('Failed to get recommendations:', error)
      return Array.from(this.literatureDatabase.values()).slice(0, limit)
    }
  }

  /**
   * Get reading statistics
   */
  getReadingStats(): {
    totalItemsRead: number
    totalPagesRead: number
    totalTimeSpent: number
    completionRate: number
    favoriteCategories: string[]
    readingStreak: number
  } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.reading_progress) || '{}'
      const allProgress = JSON.parse(stored)
      
      const progressItems = Object.values(allProgress) as any[]
      
      const totalItemsRead = progressItems.filter(p => p.isCompleted).length
      const totalPagesRead = progressItems.reduce((sum, p) => sum + p.currentPage, 0)
      const totalTimeSpent = progressItems.reduce((sum, p) => sum + p.timeSpent, 0)
      const completionRate = progressItems.length > 0 
        ? Math.round((totalItemsRead / progressItems.length) * 100) 
        : 0
      
      // Analyze favorite categories
      const categoryCount = new Map<string, number>()
      progressItems.forEach(progress => {
        const item = this.literatureDatabase.get(progress.literatureId)
        if (item) {
          categoryCount.set(item.category, (categoryCount.get(item.category) || 0) + 1)
        }
      })
      
      const favoriteCategories = Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([category]) => category)
      
      // Calculate reading streak (consecutive days with reading activity)
      const readingStreak = this.calculateReadingStreak(progressItems)
      
      return {
        totalItemsRead,
        totalPagesRead,
        totalTimeSpent,
        completionRate,
        favoriteCategories,
        readingStreak
      }
    } catch (error) {
      console.error('Failed to get reading stats:', error)
      return {
        totalItemsRead: 0,
        totalPagesRead: 0,
        totalTimeSpent: 0,
        completionRate: 0,
        favoriteCategories: [],
        readingStreak: 0
      }
    }
  }

  // Private helper methods

  private initializeLiteratureDatabase(): void {
    // Initialize with comprehensive AA literature database
    const literature: LiteratureItem[] = [
      {
        id: 'big_book',
        title: 'Alcoholics Anonymous (The Big Book)',
        type: 'book',
        category: 'Core Literature',
        description: 'The basic text of Alcoholics Anonymous, containing the program of recovery.',
        content: this.generateBigBookContent(),
        pageCount: 575,
        publishedYear: 1939,
        tags: ['core', 'basic text', 'steps', 'recovery', 'spiritual'],
        difficulty: 'beginner',
        suggestedFor: ['newcomers', 'step work', 'daily reading'],
        isOfflineAvailable: true,
        lastUpdated: new Date()
      },
      {
        id: 'twelve_and_twelve',
        title: 'Twelve Steps and Twelve Traditions',
        type: 'book',
        category: 'Core Literature',
        description: 'Detailed exploration of the Twelve Steps and Twelve Traditions.',
        content: this.generateTwelveAndTwelveContent(),
        pageCount: 192,
        publishedYear: 1953,
        tags: ['steps', 'traditions', 'spiritual', 'detailed'],
        difficulty: 'intermediate',
        suggestedFor: ['step work', 'sponsors', 'group study'],
        isOfflineAvailable: true,
        lastUpdated: new Date()
      },
      {
        id: 'daily_reflections',
        title: 'Daily Reflections',
        type: 'reflection',
        category: 'Daily Readings',
        description: '365 daily meditations for AA members.',
        content: this.generateDailyReflectionsContent(),
        pageCount: 380,
        publishedYear: 1990,
        tags: ['daily', 'meditation', 'reflection', 'spiritual'],
        difficulty: 'beginner',
        suggestedFor: ['daily reading', 'meditation', 'newcomers'],
        isOfflineAvailable: true,
        lastUpdated: new Date()
      },
      {
        id: 'living_sober',
        title: 'Living Sober',
        type: 'book',
        category: 'Practical Guides',
        description: 'Practical suggestions for staying sober.',
        content: this.generateLivingSoberContent(),
        pageCount: 87,
        publishedYear: 1975,
        tags: ['practical', 'sobriety', 'tools', 'daily living'],
        difficulty: 'beginner',
        suggestedFor: ['newcomers', 'practical tools', 'early recovery'],
        isOfflineAvailable: true,
        lastUpdated: new Date()
      },
      {
        id: 'came_to_believe',
        title: 'Came to Believe',
        type: 'book',
        category: 'Spiritual',
        description: 'Spiritual experiences of AA members.',
        content: this.generateCameToBelieveContent(),
        pageCount: 120,
        publishedYear: 1973,
        tags: ['spiritual', 'higher power', 'experiences', 'faith'],
        difficulty: 'intermediate',
        suggestedFor: ['spiritual growth', 'step 2', 'higher power'],
        isOfflineAvailable: false,
        lastUpdated: new Date()
      }
    ]

    literature.forEach(item => {
      this.literatureDatabase.set(item.id, item)
    })

    // Initialize daily reflections
    this.initializeDailyReflections()
    
    console.log(`📚 Literature database initialized with ${literature.length} items`)
  }

  private generateBigBookContent(): LiteratureContent[] {
    // Generate sample Big Book content structure
    return [
      {
        id: 'bb_foreword',
        pageNumber: 1,
        chapterTitle: 'Foreword to First Edition',
        content: 'We, of Alcoholics Anonymous, are more than one hundred men and women who have recovered from a seemingly hopeless state of mind and body...',
        contentType: 'text',
        wordCount: 850,
        readingTime: 4
      },
      {
        id: 'bb_doctors_opinion',
        pageNumber: 25,
        chapterTitle: 'The Doctor\'s Opinion',
        content: 'We of Alcoholics Anonymous believe that the reader will be interested in the medical estimate of the plan of recovery described in this book...',
        contentType: 'text',
        wordCount: 1200,
        readingTime: 6
      },
      {
        id: 'bb_chapter1',
        pageNumber: 44,
        chapterTitle: 'Chapter 1 - Bill\'s Story',
        content: 'War fever ran high in the New England town to which we new, young officers from Plattsburg were assigned...',
        contentType: 'story',
        wordCount: 2100,
        readingTime: 10
      },
      {
        id: 'bb_chapter2',
        pageNumber: 66,
        chapterTitle: 'Chapter 2 - There Is a Solution',
        content: 'We, of Alcoholics Anonymous, know thousands of men and women who were once just as hopeless as Bill...',
        contentType: 'text',
        wordCount: 1800,
        readingTime: 9
      },
      {
        id: 'bb_chapter3',
        pageNumber: 83,
        chapterTitle: 'Chapter 3 - More About Alcoholism',
        content: 'Most of us have been unwilling to admit we were real alcoholics...',
        contentType: 'text',
        wordCount: 2200,
        readingTime: 11
      }
    ]
  }

  private generateTwelveAndTwelveContent(): LiteratureContent[] {
    return [
      {
        id: 'tt_step1',
        pageNumber: 21,
        chapterTitle: 'Step One',
        sectionTitle: 'We admitted we were powerless over alcohol—that our lives had become unmanageable.',
        content: 'How many times we alcoholics have said: "I can take it or leave it alone." The first time we said this we probably were quite sure we meant it...',
        contentType: 'step',
        wordCount: 1500,
        readingTime: 7
      },
      {
        id: 'tt_step2',
        pageNumber: 25,
        chapterTitle: 'Step Two',
        sectionTitle: 'Came to believe that a Power greater than ourselves could restore us to sanity.',
        content: 'The moment they read Step Two, most A.A. newcomers are confronted with a dilemma, sometimes a serious one...',
        contentType: 'step',
        wordCount: 1400,
        readingTime: 7
      }
    ]
  }

  private generateDailyReflectionsContent(): LiteratureContent[] {
    return [
      {
        id: 'dr_jan1',
        pageNumber: 1,
        chapterTitle: 'January 1st',
        content: 'And acceptance is the answer to all my problems today...',
        contentType: 'text',
        wordCount: 200,
        readingTime: 1
      }
    ]
  }

  private generateLivingSoberContent(): LiteratureContent[] {
    return [
      {
        id: 'ls_avoiding_first_drink',
        pageNumber: 11,
        chapterTitle: 'Avoiding the First Drink',
        content: 'Since we got sober in A.A., we have heard many suggestions for staying sober...',
        contentType: 'text',
        wordCount: 800,
        readingTime: 4
      }
    ]
  }

  private generateCameToBelieveContent(): LiteratureContent[] {
    return [
      {
        id: 'ctb_introduction',
        pageNumber: 1,
        chapterTitle: 'Introduction',
        content: 'The stories in this book are told by A.A. members who have found a faith that works...',
        contentType: 'text',
        wordCount: 600,
        readingTime: 3
      }
    ]
  }

  private initializeDailyReflections(): void {
    // Generate sample daily reflections for the year
    const sampleReflections = [
      {
        date: new Date().toISOString().split('T')[0],
        title: 'Acceptance',
        content: 'And acceptance is the answer to all my problems today. When I am disturbed, it is because I find some person, place, thing, or situation—some fact of my life—unacceptable to me.',
        bigBookReference: 'Alcoholics Anonymous, p. 417',
        stepReference: 1,
        tags: ['acceptance', 'serenity', 'problems'],
        suggestedActions: [
          'Practice acceptance in one difficult situation today',
          'Identify what you cannot change',
          'Focus on what is within your control'
        ],
        reflectionQuestions: [
          'What am I struggling to accept today?',
          'How can I let go of trying to control this situation?',
          'What would change if I fully accepted this circumstance?'
        ]
      }
    ]

    sampleReflections.forEach(reflection => {
      this.dailyReflections.set(reflection.date, {
        id: `reflection_${reflection.date}`,
        ...reflection
      })
    })
  }

  private buildSearchIndex(): void {
    // Build search index for fast text searching
    this.literatureDatabase.forEach((item, id) => {
      const searchableText = [
        item.title,
        item.description,
        item.category,
        item.subcategory || '',
        ...item.tags,
        ...item.suggestedFor,
        ...item.content.map(c => c.content)
      ].join(' ').toLowerCase()

      const words = searchableText.split(/\s+/).filter(word => word.length > 2)
      this.searchIndex.set(id, words)
    })
  }

  private performTextSearch(items: LiteratureItem[], query: string): LiteratureItem[] {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 0)
    
    return items
      .map(item => ({
        item,
        relevance: this.calculateSearchRelevance(item.id, queryWords)
      }))
      .filter(result => result.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .map(result => result.item)
  }

  private calculateSearchRelevance(itemId: string, queryWords: string[]): number {
    const itemWords = this.searchIndex.get(itemId) || []
    let score = 0

    queryWords.forEach(queryWord => {
      itemWords.forEach(itemWord => {
        if (itemWord.includes(queryWord)) {
          score += itemWord === queryWord ? 2 : 1 // Exact match scores higher
        }
      })
    })

    return score
  }

  private sortResults(items: LiteratureItem[], sortBy: string, order: string): LiteratureItem[] {
    const multiplier = order === 'asc' ? 1 : -1

    return items.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return multiplier * a.title.localeCompare(b.title)
        case 'date':
          return multiplier * (a.lastUpdated.getTime() - b.lastUpdated.getTime())
        case 'reading_time':
          const aTime = a.content.reduce((sum, c) => sum + c.readingTime, 0)
          const bTime = b.content.reduce((sum, c) => sum + c.readingTime, 0)
          return multiplier * (aTime - bTime)
        case 'popularity':
          // Could be based on reading stats if available
          return 0
        default: // relevance
          return 0 // Already sorted by relevance in text search
      }
    })
  }

  private buildSearchFacets(items: LiteratureItem[]): SearchFacets {
    const categories = new Map<string, number>()
    const types = new Map<string, number>()
    const tags = new Map<string, number>()
    const difficulty = new Map<string, number>()

    items.forEach(item => {
      categories.set(item.category, (categories.get(item.category) || 0) + 1)
      types.set(item.type, (types.get(item.type) || 0) + 1)
      difficulty.set(item.difficulty, (difficulty.get(item.difficulty) || 0) + 1)
      
      item.tags.forEach(tag => {
        tags.set(tag, (tags.get(tag) || 0) + 1)
      })
    })

    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      types: Array.from(types.entries()).map(([name, count]) => ({ name, count })),
      tags: Array.from(tags.entries()).map(([name, count]) => ({ name, count })),
      difficulty: Array.from(difficulty.entries()).map(([name, count]) => ({ name, count }))
    }
  }

  private generateSearchSuggestions(query: string, resultCount: number): string[] {
    if (resultCount === 0) {
      return [
        'Try searching for "big book" or "twelve steps"',
        'Browse by category instead',
        'Check spelling and try again',
        'Use fewer or different search terms'
      ]
    }
    return []
  }

  private generateDailyReflection(date: string): DailyReflection {
    // Generate a basic daily reflection
    return {
      id: `reflection_${date}`,
      date,
      title: 'Daily Reflection',
      content: 'Today is a new day in recovery. Each day brings new opportunities for growth and spiritual development.',
      tags: ['daily', 'recovery', 'growth'],
      suggestedActions: ['Read morning meditation', 'Practice gratitude', 'Connect with sponsor'],
      reflectionQuestions: [
        'What am I grateful for today?',
        'How can I serve others today?',
        'What spiritual principle will I practice?'
      ]
    }
  }

  private analyzeUserPreferences(readItems: string[]): any {
    // Analyze reading patterns to determine preferences
    const preferences = {
      categories: new Map<string, number>(),
      types: new Map<string, number>(),
      difficulty: new Map<string, number>()
    }

    readItems.forEach(itemId => {
      const item = this.literatureDatabase.get(itemId)
      if (item) {
        preferences.categories.set(item.category, (preferences.categories.get(item.category) || 0) + 1)
        preferences.types.set(item.type, (preferences.types.get(item.type) || 0) + 1)
        preferences.difficulty.set(item.difficulty, (preferences.difficulty.get(item.difficulty) || 0) + 1)
      }
    })

    return preferences
  }

  private calculateRecommendationScore(item: LiteratureItem, preferences: any): number {
    let score = 0

    // Score based on category preference
    const categoryScore = preferences.categories.get(item.category) || 0
    score += categoryScore * 3

    // Score based on type preference
    const typeScore = preferences.types.get(item.type) || 0
    score += typeScore * 2

    // Score based on difficulty preference
    const difficultyScore = preferences.difficulty.get(item.difficulty) || 0
    score += difficultyScore

    // Boost for offline availability
    if (item.isOfflineAvailable) {
      score += 1
    }

    return score
  }

  private calculateReadingStreak(progressItems: any[]): number {
    // Calculate consecutive days with reading activity
    const readingDates = progressItems
      .map(p => new Date(p.lastReadDate).toDateString())
      .sort()

    let streak = 0
    let currentStreak = 0
    let lastDate: Date | null = null

    readingDates.forEach(dateStr => {
      const date = new Date(dateStr)
      
      if (lastDate) {
        const dayDiff = Math.floor((date.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (dayDiff === 1) {
          currentStreak++
        } else if (dayDiff > 1) {
          streak = Math.max(streak, currentStreak)
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }
      
      lastDate = date
    })

    return Math.max(streak, currentStreak)
  }

  private cleanupOldData(): void {
    // Clean up old data to prevent storage bloat
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      // Clean old study sessions
      const sessionsStored = localStorage.getItem(this.STORAGE_KEYS.study_sessions)
      if (sessionsStored) {
        const sessions = JSON.parse(sessionsStored)
        const recent = sessions.filter((s: any) => new Date(s.startTime) > thirtyDaysAgo)
        localStorage.setItem(this.STORAGE_KEYS.study_sessions, JSON.stringify(recent))
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error)
    }
  }
}

export default new EnhancedLiteratureService()