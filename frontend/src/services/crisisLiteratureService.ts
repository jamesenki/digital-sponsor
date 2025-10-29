/**
 * Crisis Literature Service
 * 
 * Provides immediate access to crisis-specific AA literature passages
 * Focused on emergency support, relapse prevention, and crisis intervention
 */

export interface CrisisLiteraturePassage {
  id: string
  title: string
  passage: string
  source: string
  page: string
  category: 'suicide_prevention' | 'relapse_prevention' | 'fear_relief' | 'anger_management' | 'despair_help' | 'hope_restoration' | 'immediate_comfort'
  keywords: string[]
  useCase: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
}

export interface CrisisSearchResult {
  passages: CrisisLiteraturePassage[]
  totalFound: number
  searchTime: number
  suggestions: string[]
}

export class CrisisLiteratureService {
  private crisisPassages: CrisisLiteraturePassage[] = [
    // Suicide Prevention & Crisis
    {
      id: 'crisis_001',
      title: 'Just for Today',
      passage: 'Just for today I will try to live through this day only, and not tackle my whole life problem at once. I can do something for twelve hours that would appall me if I felt that I had to keep it up for a lifetime.',
      source: 'AA Literature',
      page: 'One Day at a Time',
      category: 'suicide_prevention',
      keywords: ['suicide', 'crisis', 'one day', 'overwhelmed', 'despair'],
      useCase: 'When feeling suicidal or overwhelmed by life',
      priority: 'urgent'
    },
    {
      id: 'crisis_002',
      title: 'Acceptance is the Answer',
      passage: 'And acceptance is the answer to all my problems today. When I am disturbed, it is because I find some person, place, thing, or situation—some fact of my life—unacceptable to me, and I can find no serenity until I accept that person, place, thing, or situation as being exactly the way it is supposed to be at this moment.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 417',
      category: 'despair_help',
      keywords: ['acceptance', 'disturbed', 'serenity', 'problems', 'despair'],
      useCase: 'When struggling with accepting difficult circumstances',
      priority: 'urgent'
    },
    {
      id: 'crisis_003',
      title: 'This Too Shall Pass',
      passage: 'We have ceased fighting anything or anyone—even alcohol. For by this time sanity will have returned. We will seldom be interested in liquor. If tempted, we recoil from it as from a hot flame.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 84-85',
      category: 'relapse_prevention',
      keywords: ['relapse', 'tempted', 'fighting', 'sanity', 'recovery'],
      useCase: 'When facing strong urges to drink',
      priority: 'urgent'
    },
    {
      id: 'crisis_004',
      title: 'Fear and Faith',
      passage: 'Perhaps there is a better way—we think so. For we are now on a different basis; the basis of trusting and relying upon God. We trust infinite God rather than our finite selves.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 68',
      category: 'fear_relief',
      keywords: ['fear', 'trust', 'God', 'faith', 'finite', 'infinite'],
      useCase: 'When paralyzed by fear or anxiety',
      priority: 'high'
    },
    {
      id: 'crisis_005',
      title: 'Resentment Prayer',
      passage: 'If you have a resentment you want to be free of, if you will pray for the person or the thing that you resent, you will be free. If you will ask in prayer for everything you want for yourself to be given to them, you will be free.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 552',
      category: 'anger_management',
      keywords: ['resentment', 'anger', 'prayer', 'free', 'forgiveness'],
      useCase: 'When consumed by anger or resentment',
      priority: 'high'
    },
    {
      id: 'crisis_006',
      title: 'First Step Relief',
      passage: 'We learned that we had to fully concede to our innermost selves that we were alcoholics. This is the first step in recovery. The delusion that we are like other people, or presently may be, has to be smashed.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 30',
      category: 'hope_restoration',
      keywords: ['first step', 'concede', 'recovery', 'delusion', 'hope'],
      useCase: 'When struggling with Step 1 or denial',
      priority: 'high'
    },
    {
      id: 'crisis_007',
      title: 'Higher Power Help',
      passage: 'Came to believe that a Power greater than ourselves could restore us to sanity. Lack of power, that was our dilemma. We had to find a power by which we could live, and it had to be a Power greater than ourselves.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 45',
      category: 'hope_restoration',
      keywords: ['higher power', 'sanity', 'power', 'restore', 'dilemma'],
      useCase: 'When feeling powerless or hopeless',
      priority: 'high'
    },
    {
      id: 'crisis_008',
      title: 'Serenity Prayer',
      passage: 'God, grant me the serenity to accept the things I cannot change, the courage to change the things I can, and the wisdom to know the difference.',
      source: 'AA Serenity Prayer',
      page: 'Traditional Prayer',
      category: 'immediate_comfort',
      keywords: ['serenity', 'acceptance', 'courage', 'wisdom', 'prayer'],
      useCase: 'For immediate comfort in any crisis',
      priority: 'urgent'
    },
    {
      id: 'crisis_009',
      title: 'Hope and Help',
      passage: 'Remember that we deal with alcohol—cunning, baffling, powerful! Without help it is too much for us. But there is One who has all power—that One is God. May you find Him now!',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 58-59',
      category: 'relapse_prevention',
      keywords: ['alcohol', 'cunning', 'powerful', 'help', 'God', 'find'],
      useCase: 'When feeling defeated by addiction',
      priority: 'urgent'
    },
    {
      id: 'crisis_010',
      title: 'Meeting Help',
      passage: 'Rarely have we seen a person fail who has thoroughly followed our path. Those who do not recover are people who cannot or will not give themselves completely to this simple program.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 58',
      category: 'hope_restoration',
      keywords: ['fail', 'recover', 'path', 'program', 'completely', 'simple'],
      useCase: 'When doubting the program works',
      priority: 'medium'
    },
    {
      id: 'crisis_011',
      title: 'Immediate Relief',
      passage: 'We asked His protection and care with complete abandon. Here was a power by which we could live.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 59',
      category: 'immediate_comfort',
      keywords: ['protection', 'care', 'abandon', 'power', 'live'],
      useCase: 'For immediate spiritual comfort',
      priority: 'high'
    },
    {
      id: 'crisis_012',
      title: 'Fellowship Support',
      passage: 'We are people who normally would not mix. But there exists among us a fellowship, a friendliness, and an understanding which is indescribably wonderful.',
      source: 'Alcoholics Anonymous (Big Book)',
      page: 'Page 17',
      category: 'immediate_comfort',
      keywords: ['fellowship', 'friendliness', 'understanding', 'wonderful', 'support'],
      useCase: 'When feeling isolated or alone',
      priority: 'medium'
    }
  ]

  /**
   * Search crisis-specific literature by keywords
   */
  searchCrisisLiterature(query: string): CrisisSearchResult {
    const startTime = Date.now()
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2)
    
    if (searchTerms.length === 0) {
      return {
        passages: this.getUrgentPassages(),
        totalFound: 0,
        searchTime: Date.now() - startTime,
        suggestions: this.getSearchSuggestions()
      }
    }

    const scoredPassages = this.crisisPassages.map(passage => {
      let score = 0
      const searchableText = [
        passage.title,
        passage.passage,
        passage.useCase,
        ...passage.keywords
      ].join(' ').toLowerCase()

      // Exact phrase match gets highest score
      if (searchableText.includes(query.toLowerCase())) {
        score += 10
      }

      // Individual term matches
      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          score += 1
        }
        
        // Higher score for keyword matches
        if (passage.keywords.some(keyword => keyword.includes(term))) {
          score += 3
        }
        
        // Higher score for use case matches
        if (passage.useCase.toLowerCase().includes(term)) {
          score += 2
        }
      })

      // Priority boost
      switch (passage.priority) {
        case 'urgent':
          score += 5
          break
        case 'high':
          score += 3
          break
        case 'medium':
          score += 1
          break
      }

      return { passage, score }
    })

    const results = scoredPassages
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.passage)

    return {
      passages: results.length > 0 ? results : this.getUrgentPassages(),
      totalFound: results.length,
      searchTime: Date.now() - startTime,
      suggestions: results.length === 0 ? this.getSearchSuggestions() : []
    }
  }

  /**
   * Get passages by crisis category
   */
  getPassagesByCategory(category: CrisisLiteraturePassage['category']): CrisisLiteraturePassage[] {
    return this.crisisPassages
      .filter(passage => passage.category === category)
      .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority))
  }

  /**
   * Get urgent/immediate help passages
   */
  getUrgentPassages(): CrisisLiteraturePassage[] {
    return this.crisisPassages
      .filter(passage => passage.priority === 'urgent')
      .slice(0, 4)
  }

  /**
   * Get suicide prevention specific passages
   */
  getSuicidePreventionPassages(): CrisisLiteraturePassage[] {
    return this.getPassagesByCategory('suicide_prevention')
      .concat(this.getPassagesByCategory('despair_help'))
      .concat(this.getPassagesByCategory('immediate_comfort'))
      .slice(0, 6)
  }

  /**
   * Get relapse prevention passages
   */
  getRelapsePreventionPassages(): CrisisLiteraturePassage[] {
    return this.getPassagesByCategory('relapse_prevention')
      .concat(this.getPassagesByCategory('hope_restoration'))
      .slice(0, 5)
  }

  /**
   * Get fear and anxiety relief passages
   */
  getFearReliefPassages(): CrisisLiteraturePassage[] {
    return this.getPassagesByCategory('fear_relief')
      .concat(this.getPassagesByCategory('immediate_comfort'))
      .slice(0, 4)
  }

  /**
   * Get anger management passages
   */
  getAngerManagementPassages(): CrisisLiteraturePassage[] {
    return this.getPassagesByCategory('anger_management')
      .concat(this.getPassagesByCategory('hope_restoration'))
      .slice(0, 4)
  }

  /**
   * Get all available crisis categories
   */
  getAvailableCategories(): Array<{ category: CrisisLiteraturePassage['category']; title: string; description: string }> {
    return [
      {
        category: 'suicide_prevention',
        title: 'Suicide Prevention',
        description: 'Immediate help for suicidal thoughts'
      },
      {
        category: 'relapse_prevention',
        title: 'Relapse Prevention',
        description: 'When facing urges to drink'
      },
      {
        category: 'fear_relief',
        title: 'Fear & Anxiety Relief',
        description: 'Comfort for overwhelming fear'
      },
      {
        category: 'anger_management',
        title: 'Anger Management',
        description: 'Help with resentment and anger'
      },
      {
        category: 'despair_help',
        title: 'Despair Help',
        description: 'When feeling hopeless'
      },
      {
        category: 'hope_restoration',
        title: 'Hope Restoration',
        description: 'Rebuilding faith and hope'
      },
      {
        category: 'immediate_comfort',
        title: 'Immediate Comfort',
        description: 'Quick spiritual relief'
      }
    ]
  }

  /**
   * Get search suggestions for crisis situations
   */
  private getSearchSuggestions(): string[] {
    return [
      'suicidal thoughts',
      'want to drink',
      'overwhelming fear',
      'angry and resentful',
      'feeling hopeless',
      'need immediate help',
      'spiritual comfort',
      'acceptance prayer',
      'higher power help',
      'just for today'
    ]
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: CrisisLiteraturePassage['priority']): number {
    switch (priority) {
      case 'urgent': return 1
      case 'high': return 2
      case 'medium': return 3
      case 'low': return 4
      default: return 5
    }
  }

  /**
   * Format passage for display
   */
  formatPassageForDisplay(passage: CrisisLiteraturePassage): string {
    return `"${passage.passage}"\n\n— ${passage.source}, ${passage.page}`
  }

  /**
   * Generate crisis-specific search URL for literature API
   */
  generateLiteratureSearchUrl(query: string): string {
    // This would integrate with the main literature search API
    // For now, return a formatted query
    const crisisKeywords = ['crisis', 'emergency', 'immediate', 'urgent']
    const enhancedQuery = `${query} ${crisisKeywords.join(' OR ')}`
    return `/api/literature/search?q=${encodeURIComponent(enhancedQuery)}&type=crisis`
  }

  /**
   * Log crisis literature usage (anonymous)
   */
  logCrisisLiteratureAccess(category: string, passageId?: string): void {
    console.log(`📖 Crisis literature accessed: ${category}`)
    
    // Anonymous usage tracking - no personal data
    if (passageId) {
      console.log(`Passage accessed: ${passageId}`)
    }
  }

  /**
   * Check if search query indicates immediate crisis
   */
  isEmergencyQuery(query: string): boolean {
    const emergencyKeywords = [
      'suicide', 'kill myself', 'end it all', 'want to die',
      'hurt myself', 'no hope', 'cant go on', 'give up',
      'overdose', 'self harm'
    ]
    
    const lowercaseQuery = query.toLowerCase()
    return emergencyKeywords.some(keyword => 
      lowercaseQuery.includes(keyword)
    )
  }

  /**
   * Get emergency response for crisis queries
   */
  getEmergencyResponse(): {
    message: string
    actions: Array<{ text: string; action: string }>
    passages: CrisisLiteraturePassage[]
  } {
    return {
      message: "⚠️ If you're having thoughts of suicide or self-harm, please reach out for immediate help:",
      actions: [
        { text: "Call 988 Crisis Lifeline", action: "tel:988" },
        { text: "Text Crisis Line (741741)", action: "sms:741741" },
        { text: "Call 911", action: "tel:911" },
        { text: "Go to Emergency Room", action: "directions" }
      ],
      passages: this.getSuicidePreventionPassages()
    }
  }
}

export default new CrisisLiteratureService()