/**
 * Recovery Resource Library Service
 * 
 * Enhanced resource library with advanced search, categorization, and personalized recommendations
 * Maintains AA Tradition compliance while providing valuable recovery resources
 */

export interface RecoveryResource {
  id: string
  title: string
  description: string
  content: string
  category: ResourceCategory
  type: ResourceType
  source: string
  dateAdded: Date
  lastUpdated: Date
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedReadTime: number // minutes
  relatedSteps: number[] // AA Steps 1-12
  keywords: string[]
  isBookmarked: boolean
  readingProgress: number // percentage
  personalNotes: string
  rating: number // 1-5 stars
  accessCount: number
  lastAccessed: Date | null
}

export interface ResourceCategory {
  id: string
  name: string
  description: string
  icon: string
  color: string
  parentCategory?: string
  subcategories?: string[]
}

export type ResourceType = 
  | 'article' 
  | 'meditation' 
  | 'prayer' 
  | 'worksheet' 
  | 'reflection' 
  | 'story' 
  | 'quote' 
  | 'exercise'
  | 'audio'
  | 'video'

export interface SearchFilters {
  query?: string
  categories?: string[]
  types?: ResourceType[]
  steps?: number[]
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[]
  tags?: string[]
  dateRange?: {
    start: Date
    end: Date
  }
  readingTime?: {
    min: number
    max: number
  }
  rating?: {
    min: number
    max: number
  }
  onlyBookmarked?: boolean
  onlyUnread?: boolean
}

export interface SearchResult {
  resources: RecoveryResource[]
  totalCount: number
  facets: {
    categories: { id: string, name: string, count: number }[]
    types: { type: ResourceType, count: number }[]
    steps: { step: number, count: number }[]
    tags: { tag: string, count: number }[]
  }
  suggestions: string[]
  searchTime: number
}

export interface PersonalizedRecommendation {
  resource: RecoveryResource
  reason: string
  score: number
  category: 'trending' | 'related' | 'step-based' | 'similar-interests'
}

export class RecoveryResourceLibraryService {
  private readonly STORAGE_KEYS = {
    resources: 'aa_recovery_resources',
    categories: 'aa_resource_categories',
    searchHistory: 'aa_search_history',
    userPreferences: 'aa_library_preferences'
  }

  private resources: Map<string, RecoveryResource> = new Map()
  private categories: Map<string, ResourceCategory> = new Map()
  private searchHistory: string[] = []
  private searchIndex: Map<string, Set<string>> = new Map()
  private userPreferences: {
    favoriteCategories: string[]
    preferredTypes: ResourceType[]
    readingLevel: 'beginner' | 'intermediate' | 'advanced'
    interests: string[]
  } = {
    favoriteCategories: [],
    preferredTypes: [],
    readingLevel: 'beginner',
    interests: []
  }

  constructor() {
    this.loadData()
    this.initializeDefaultContent()
    this.buildSearchIndex()
  }

  /**
   * Advanced search with multiple filters and faceting
   */
  async search(filters: SearchFilters): Promise<SearchResult> {
    const startTime = performance.now()
    let results = Array.from(this.resources.values())

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase().trim()
      this.addToSearchHistory(query)
      
      results = results.filter(resource => 
        this.matchesQuery(resource, query)
      )
    }

    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      results = results.filter(resource => 
        filters.categories!.includes(resource.category.id)
      )
    }

    // Type filter
    if (filters.types && filters.types.length > 0) {
      results = results.filter(resource => 
        filters.types!.includes(resource.type)
      )
    }

    // Steps filter
    if (filters.steps && filters.steps.length > 0) {
      results = results.filter(resource => 
        resource.relatedSteps.some(step => filters.steps!.includes(step))
      )
    }

    // Difficulty filter
    if (filters.difficulty && filters.difficulty.length > 0) {
      results = results.filter(resource => 
        filters.difficulty!.includes(resource.difficulty)
      )
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(resource => 
        filters.tags!.some(tag => resource.tags.includes(tag))
      )
    }

    // Date range filter
    if (filters.dateRange) {
      results = results.filter(resource => 
        resource.dateAdded >= filters.dateRange!.start &&
        resource.dateAdded <= filters.dateRange!.end
      )
    }

    // Reading time filter
    if (filters.readingTime) {
      results = results.filter(resource => 
        resource.estimatedReadTime >= filters.readingTime!.min &&
        resource.estimatedReadTime <= filters.readingTime!.max
      )
    }

    // Rating filter
    if (filters.rating) {
      results = results.filter(resource => 
        resource.rating >= filters.rating!.min &&
        resource.rating <= filters.rating!.max
      )
    }

    // Bookmark filter
    if (filters.onlyBookmarked) {
      results = results.filter(resource => resource.isBookmarked)
    }

    // Unread filter
    if (filters.onlyUnread) {
      results = results.filter(resource => resource.readingProgress === 0)
    }

    // Sort by relevance and then by date
    results.sort((a, b) => {
      if (filters.query) {
        const aScore = this.calculateRelevanceScore(a, filters.query)
        const bScore = this.calculateRelevanceScore(b, filters.query)
        if (aScore !== bScore) return bScore - aScore
      }
      return b.dateAdded.getTime() - a.dateAdded.getTime()
    })

    // Generate facets
    const facets = this.generateFacets(results)

    // Generate search suggestions
    const suggestions = this.generateSearchSuggestions(filters.query || '')

    const searchTime = performance.now() - startTime

    return {
      resources: results,
      totalCount: results.length,
      facets,
      suggestions,
      searchTime
    }
  }

  /**
   * Get personalized recommendations
   */
  getPersonalizedRecommendations(limit: number = 10): PersonalizedRecommendation[] {
    const recommendations: PersonalizedRecommendation[] = []
    const allResources = Array.from(this.resources.values())

    // Step-based recommendations
    const currentStep = this.getCurrentUserStep()
    if (currentStep) {
      const stepResources = allResources
        .filter(r => r.relatedSteps.includes(currentStep) && !r.isBookmarked)
        .slice(0, 3)

      stepResources.forEach(resource => {
        recommendations.push({
          resource,
          reason: `Recommended for Step ${currentStep}`,
          score: 0.9,
          category: 'step-based'
        })
      })
    }

    // Similar interests recommendations
    const userInterests = this.userPreferences.interests
    if (userInterests.length > 0) {
      const interestResources = allResources
        .filter(r => 
          r.tags.some(tag => userInterests.includes(tag)) && 
          !r.isBookmarked &&
          !recommendations.some(rec => rec.resource.id === r.id)
        )
        .slice(0, 3)

      interestResources.forEach(resource => {
        recommendations.push({
          resource,
          reason: 'Based on your interests',
          score: 0.8,
          category: 'similar-interests'
        })
      })
    }

    // Trending resources (most accessed recently)
    const trending = allResources
      .filter(r => 
        r.lastAccessed && 
        Date.now() - r.lastAccessed.getTime() < 7 * 24 * 60 * 60 * 1000 &&
        !recommendations.some(rec => rec.resource.id === r.id)
      )
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 2)

    trending.forEach(resource => {
      recommendations.push({
        resource,
        reason: 'Trending this week',
        score: 0.7,
        category: 'trending'
      })
    })

    // Related to recently read
    const recentlyRead = allResources
      .filter(r => r.readingProgress > 0)
      .sort((a, b) => (b.lastAccessed?.getTime() || 0) - (a.lastAccessed?.getTime() || 0))
      .slice(0, 2)

    recentlyRead.forEach(read => {
      const related = allResources
        .filter(r => 
          r.id !== read.id &&
          (r.category.id === read.category.id || 
           r.tags.some(tag => read.tags.includes(tag))) &&
          !recommendations.some(rec => rec.resource.id === r.id)
        )
        .slice(0, 2)

      related.forEach(resource => {
        recommendations.push({
          resource,
          reason: `Related to "${read.title}"`,
          score: 0.6,
          category: 'related'
        })
      })
    })

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  /**
   * Add or update a resource
   */
  saveResource(resource: Omit<RecoveryResource, 'id' | 'dateAdded' | 'lastUpdated'>): string {
    const id = `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()

    const newResource: RecoveryResource = {
      ...resource,
      id,
      dateAdded: now,
      lastUpdated: now,
      isBookmarked: false,
      readingProgress: 0,
      personalNotes: '',
      rating: 0,
      accessCount: 0,
      lastAccessed: null
    }

    this.resources.set(id, newResource)
    this.updateSearchIndex(newResource)
    this.saveData()

    return id
  }

  /**
   * Get resource by ID and track access
   */
  getResource(id: string): RecoveryResource | null {
    const resource = this.resources.get(id)
    if (resource) {
      // Track access
      resource.accessCount++
      resource.lastAccessed = new Date()
      this.resources.set(id, resource)
      this.saveData()
    }
    return resource || null
  }

  /**
   * Update reading progress
   */
  updateReadingProgress(id: string, progress: number): void {
    const resource = this.resources.get(id)
    if (resource) {
      resource.readingProgress = Math.max(0, Math.min(100, progress))
      resource.lastAccessed = new Date()
      this.resources.set(id, resource)
      this.saveData()
    }
  }

  /**
   * Toggle bookmark status
   */
  toggleBookmark(id: string): boolean {
    const resource = this.resources.get(id)
    if (resource) {
      resource.isBookmarked = !resource.isBookmarked
      this.resources.set(id, resource)
      this.saveData()
      return resource.isBookmarked
    }
    return false
  }

  /**
   * Add personal note to resource
   */
  addPersonalNote(id: string, note: string): void {
    const resource = this.resources.get(id)
    if (resource) {
      resource.personalNotes = note
      this.resources.set(id, resource)
      this.saveData()
    }
  }

  /**
   * Rate a resource
   */
  rateResource(id: string, rating: number): void {
    const resource = this.resources.get(id)
    if (resource && rating >= 1 && rating <= 5) {
      resource.rating = rating
      this.resources.set(id, resource)
      this.saveData()
    }
  }

  /**
   * Get all categories
   */
  getCategories(): ResourceCategory[] {
    return Array.from(this.categories.values())
  }

  /**
   * Get category by ID
   */
  getCategory(id: string): ResourceCategory | null {
    return this.categories.get(id) || null
  }

  /**
   * Get popular tags
   */
  getPopularTags(limit: number = 20): { tag: string, count: number }[] {
    const tagCounts = new Map<string, number>()
    
    Array.from(this.resources.values()).forEach(resource => {
      resource.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory].reverse().slice(0, 10)
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = []
    this.saveSearchHistory()
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(preferences: Partial<typeof this.userPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences }
    this.saveUserPreferences()
  }

  /**
   * Get user preferences
   */
  getUserPreferences() {
    return { ...this.userPreferences }
  }

  // Private implementation methods

  private matchesQuery(resource: RecoveryResource, query: string): boolean {
    const searchableText = [
      resource.title,
      resource.description,
      resource.content,
      resource.source,
      ...resource.tags,
      ...resource.keywords
    ].join(' ').toLowerCase()

    const queryWords = query.split(/\s+/)
    return queryWords.every(word => searchableText.includes(word))
  }

  private calculateRelevanceScore(resource: RecoveryResource, query: string): number {
    let score = 0
    const queryWords = query.toLowerCase().split(/\s+/)

    // Title matches get highest score
    queryWords.forEach(word => {
      if (resource.title.toLowerCase().includes(word)) score += 3
      if (resource.description.toLowerCase().includes(word)) score += 2
      if (resource.tags.some(tag => tag.toLowerCase().includes(word))) score += 2
      if (resource.content.toLowerCase().includes(word)) score += 1
    })

    // Boost for exact matches
    if (resource.title.toLowerCase().includes(query)) score += 5
    if (resource.description.toLowerCase().includes(query)) score += 3

    // Boost for popular resources
    score += Math.log(resource.accessCount + 1) * 0.5

    // Boost for highly rated resources
    score += resource.rating * 0.3

    return score
  }

  private generateFacets(resources: RecoveryResource[]) {
    const categoryCounts = new Map<string, number>()
    const typeCounts = new Map<ResourceType, number>()
    const stepCounts = new Map<number, number>()
    const tagCounts = new Map<string, number>()

    resources.forEach(resource => {
      // Categories
      categoryCounts.set(resource.category.id, (categoryCounts.get(resource.category.id) || 0) + 1)
      
      // Types
      typeCounts.set(resource.type, (typeCounts.get(resource.type) || 0) + 1)
      
      // Steps
      resource.relatedSteps.forEach(step => {
        stepCounts.set(step, (stepCounts.get(step) || 0) + 1)
      })
      
      // Tags
      resource.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })

    return {
      categories: Array.from(categoryCounts.entries())
        .map(([id, count]) => ({
          id,
          name: this.categories.get(id)?.name || id,
          count
        }))
        .sort((a, b) => b.count - a.count),
      
      types: Array.from(typeCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      
      steps: Array.from(stepCounts.entries())
        .map(([step, count]) => ({ step, count }))
        .sort((a, b) => a.step - b.step),
      
      tags: Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    }
  }

  private generateSearchSuggestions(query: string): string[] {
    if (!query || query.length < 2) return []

    const suggestions = new Set<string>()
    const allText = Array.from(this.resources.values()).flatMap(resource => [
      resource.title,
      resource.description,
      ...resource.tags,
      ...resource.keywords
    ])

    // Find partial matches
    allText.forEach(text => {
      if (text.toLowerCase().includes(query.toLowerCase()) && text.length > query.length) {
        suggestions.add(text)
      }
    })

    // Add popular search terms
    this.searchHistory.forEach(term => {
      if (term.toLowerCase().includes(query.toLowerCase()) && term !== query) {
        suggestions.add(term)
      }
    })

    return Array.from(suggestions).slice(0, 5)
  }

  private getCurrentUserStep(): number | null {
    // This would integrate with step work service
    // For now, return a mock value
    return 4
  }

  private addToSearchHistory(query: string): void {
    this.searchHistory = this.searchHistory.filter(term => term !== query)
    this.searchHistory.push(query)
    
    if (this.searchHistory.length > 50) {
      this.searchHistory = this.searchHistory.slice(-50)
    }
    
    this.saveSearchHistory()
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear()
    
    Array.from(this.resources.values()).forEach(resource => {
      const words = [
        resource.title,
        resource.description,
        resource.content,
        ...resource.tags,
        ...resource.keywords
      ].join(' ').toLowerCase().split(/\W+/)

      words.forEach(word => {
        if (word.length > 2) {
          if (!this.searchIndex.has(word)) {
            this.searchIndex.set(word, new Set())
          }
          this.searchIndex.get(word)!.add(resource.id)
        }
      })
    })
  }

  private updateSearchIndex(resource: RecoveryResource): void {
    const words = [
      resource.title,
      resource.description,
      resource.content,
      ...resource.tags,
      ...resource.keywords
    ].join(' ').toLowerCase().split(/\W+/)

    words.forEach(word => {
      if (word.length > 2) {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set())
        }
        this.searchIndex.get(word)!.add(resource.id)
      }
    })
  }

  private initializeDefaultContent(): void {
    // Initialize default categories
    const defaultCategories: ResourceCategory[] = [
      {
        id: 'step-work',
        name: 'Step Work',
        description: 'Resources for working through the 12 Steps',
        icon: '📋',
        color: '#667eea'
      },
      {
        id: 'daily-practice',
        name: 'Daily Practice',
        description: 'Daily reflections, prayers, and meditations',
        icon: '🌅',
        color: '#10b981'
      },
      {
        id: 'sponsorship',
        name: 'Sponsorship',
        description: 'Guidance on sponsorship and being sponsored',
        icon: '🤝',
        color: '#f59e0b'
      },
      {
        id: 'recovery-stories',
        name: 'Recovery Stories',
        description: 'Personal stories of recovery and hope',
        icon: '📖',
        color: '#ef4444'
      },
      {
        id: 'newcomer',
        name: 'For Newcomers',
        description: 'Resources specifically for those new to AA',
        icon: '🌱',
        color: '#8b5cf6'
      },
      {
        id: 'relationships',
        name: 'Relationships',
        description: 'Rebuilding and maintaining healthy relationships',
        icon: '💙',
        color: '#06b6d4'
      }
    ]

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category)
    })

    // Initialize some default resources if none exist
    if (this.resources.size === 0) {
      this.initializeDefaultResources()
    }
  }

  private initializeDefaultResources(): void {
    const defaultResources = [
      {
        title: 'Understanding Step 1: Powerlessness',
        description: 'A deep dive into admitting powerlessness over alcohol and unmanageability of life',
        content: 'Step 1 is the foundation of recovery. It requires us to admit that we are powerless over alcohol and that our lives have become unmanageable...',
        category: this.categories.get('step-work')!,
        type: 'article' as ResourceType,
        source: 'AA Literature',
        tags: ['step-1', 'powerlessness', 'acceptance', 'foundation'],
        difficulty: 'beginner' as const,
        estimatedReadTime: 15,
        relatedSteps: [1],
        keywords: ['powerless', 'unmanageable', 'admit', 'foundation'],
        isBookmarked: false,
        readingProgress: 0,
        personalNotes: '',
        rating: 0,
        accessCount: 0,
        lastAccessed: null
      },
      {
        title: 'Daily Reflection: One Day at a Time',
        description: 'A meditation on taking recovery one day at a time',
        content: 'Today I will focus only on today. I will not burden myself with tomorrow\'s worries or yesterday\'s regrets...',
        category: this.categories.get('daily-practice')!,
        type: 'meditation' as ResourceType,
        source: 'Daily Reflections',
        tags: ['daily', 'meditation', 'present-moment', 'serenity'],
        difficulty: 'beginner' as const,
        estimatedReadTime: 5,
        relatedSteps: [11],
        keywords: ['today', 'present', 'moment', 'peace'],
        isBookmarked: false,
        readingProgress: 0,
        personalNotes: '',
        rating: 0,
        accessCount: 0,
        lastAccessed: null
      },
      {
        title: 'Finding a Sponsor: What to Look For',
        description: 'Guidance on choosing the right sponsor for your recovery journey',
        content: 'A sponsor is someone who has what you want in recovery. Look for someone with solid sobriety time...',
        category: this.categories.get('sponsorship')!,
        type: 'article' as ResourceType,
        source: 'AA Guidelines',
        tags: ['sponsor', 'mentorship', 'guidance', 'relationship'],
        difficulty: 'beginner' as const,
        estimatedReadTime: 10,
        relatedSteps: [2, 5],
        keywords: ['sponsor', 'mentor', 'guidance', 'choose'],
        isBookmarked: false,
        readingProgress: 0,
        personalNotes: '',
        rating: 0,
        accessCount: 0,
        lastAccessed: null
      }
    ]

    defaultResources.forEach(resource => {
      this.saveResource(resource)
    })
  }

  private loadData(): void {
    // Load resources
    try {
      const resourcesData = localStorage.getItem(this.STORAGE_KEYS.resources)
      if (resourcesData) {
        const parsed = JSON.parse(resourcesData)
        parsed.forEach((data: any) => {
          const resource: RecoveryResource = {
            ...data,
            dateAdded: new Date(data.dateAdded),
            lastUpdated: new Date(data.lastUpdated),
            lastAccessed: data.lastAccessed ? new Date(data.lastAccessed) : null
          }
          this.resources.set(resource.id, resource)
        })
      }
    } catch (error) {
      console.error('Failed to load resources:', error)
    }

    // Load categories
    try {
      const categoriesData = localStorage.getItem(this.STORAGE_KEYS.categories)
      if (categoriesData) {
        const parsed = JSON.parse(categoriesData)
        parsed.forEach((category: ResourceCategory) => {
          this.categories.set(category.id, category)
        })
      }
    } catch (error) {
      console.error('Failed to load categories:', error)
    }

    // Load search history
    try {
      const historyData = localStorage.getItem(this.STORAGE_KEYS.searchHistory)
      if (historyData) {
        this.searchHistory = JSON.parse(historyData)
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }

    // Load user preferences
    try {
      const prefsData = localStorage.getItem(this.STORAGE_KEYS.userPreferences)
      if (prefsData) {
        this.userPreferences = JSON.parse(prefsData)
      } else {
        this.userPreferences = {
          favoriteCategories: [],
          preferredTypes: [],
          readingLevel: 'beginner',
          interests: []
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      this.userPreferences = {
        favoriteCategories: [],
        preferredTypes: [],
        readingLevel: 'beginner',
        interests: []
      }
    }
  }

  private saveData(): void {
    try {
      const resourcesArray = Array.from(this.resources.values())
      localStorage.setItem(this.STORAGE_KEYS.resources, JSON.stringify(resourcesArray))
      
      const categoriesArray = Array.from(this.categories.values())
      localStorage.setItem(this.STORAGE_KEYS.categories, JSON.stringify(categoriesArray))
    } catch (error) {
      console.error('Failed to save data:', error)
    }
  }

  private saveSearchHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.searchHistory, JSON.stringify(this.searchHistory))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  private saveUserPreferences(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.userPreferences, JSON.stringify(this.userPreferences))
    } catch (error) {
      console.error('Failed to save user preferences:', error)
    }
  }
}

export default new RecoveryResourceLibraryService()