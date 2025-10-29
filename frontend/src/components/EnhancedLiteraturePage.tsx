import React, { useState, useEffect } from 'react'
import type { Session } from '@/types'
import enhancedLiteratureService, { 
  type LiteratureItem, 
  type LiteratureSearchFilters, 
  type LiteratureSearchResult,
  type ReadingProgress,
  type Bookmark,
  type DailyReflection
} from '@/services/enhancedLiteratureService'
import './EnhancedLiteraturePage.css'

interface EnhancedLiteraturePageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * Enhanced Literature Page Component
 * 
 * Comprehensive AA literature search, reading, and study system
 * Features: Advanced search, reading progress, bookmarks, notes, daily reflections
 */
export default function EnhancedLiteraturePage({ isOnline, session }: EnhancedLiteraturePageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<'browse' | 'reading' | 'daily' | 'bookmarks' | 'stats'>('browse')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<LiteratureSearchFilters>({
    sortBy: 'relevance',
    sortOrder: 'desc',
    pageSize: 12
  })
  const [searchResult, setSearchResult] = useState<LiteratureSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<LiteratureItem | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [readingProgress, setReadingProgress] = useState<{ [key: string]: ReadingProgress }>({})
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [dailyReflection, setDailyReflection] = useState<DailyReflection | null>(null)
  const [recommendations, setRecommendations] = useState<LiteratureItem[]>([])
  const [readingStats, setReadingStats] = useState({
    totalItemsRead: 0,
    totalPagesRead: 0,
    totalTimeSpent: 0,
    completionRate: 0,
    favoriteCategories: [] as string[],
    readingStreak: 0
  })

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // Load initial search results
      await performSearch()
      
      // Load reading progress for recent items
      loadReadingProgress()
      
      // Load bookmarks
      loadBookmarks()
      
      // Load daily reflection
      loadDailyReflection()
      
      // Load recommendations
      loadRecommendations()
      
      // Load reading stats
      loadReadingStats()
      
    } catch (error) {
      console.error('Failed to load literature data:', error)
    }
  }

  const performSearch = async () => {
    setIsSearching(true)
    try {
      const filters: LiteratureSearchFilters = {
        ...searchFilters,
        query: searchQuery.trim() || undefined
      }
      
      const result = await enhancedLiteratureService.searchLiterature(filters)
      setSearchResult(result)
    } catch (error) {
      console.error('Literature search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const loadReadingProgress = () => {
    // Load reading progress for displayed items
    const progress: { [key: string]: ReadingProgress } = {}
    
    // Get progress for all items in search results
    searchResult?.items.forEach(item => {
      const itemProgress = enhancedLiteratureService.getReadingProgress(item.id)
      if (itemProgress) {
        progress[item.id] = itemProgress
      }
    })
    
    setReadingProgress(progress)
  }

  const loadBookmarks = () => {
    const allBookmarks = enhancedLiteratureService.getBookmarks()
    setBookmarks(allBookmarks)
  }

  const loadDailyReflection = () => {
    const reflection = enhancedLiteratureService.getDailyReflection()
    setDailyReflection(reflection)
  }

  const loadRecommendations = () => {
    const recs = enhancedLiteratureService.getRecommendations(6)
    setRecommendations(recs)
  }

  const loadReadingStats = () => {
    const stats = enhancedLiteratureService.getReadingStats()
    setReadingStats(stats)
  }

  const handleSearch = () => {
    performSearch()
  }

  const handleFilterChange = (newFilters: Partial<LiteratureSearchFilters>) => {
    setSearchFilters(prev => ({ ...prev, ...newFilters }))
  }

  const handleApplyFilters = () => {
    performSearch()
    setShowFilters(false)
  }

  const handleItemClick = async (item: LiteratureItem) => {
    setSelectedItem(item)
    
    // Update reading progress (mark as started)
    enhancedLiteratureService.updateReadingProgress(item.id, 1, 0)
    loadReadingProgress()
  }

  const handleAddBookmark = (item: LiteratureItem, pageNumber: number = 1) => {
    const bookmarkId = enhancedLiteratureService.addBookmark({
      literatureId: item.id,
      pageNumber,
      content: item.description,
      title: `${item.title} - Page ${pageNumber}`,
      tags: ['manual'],
      color: 'yellow'
    })
    
    if (bookmarkId) {
      loadBookmarks()
      alert('📖 Bookmark added!')
    }
  }

  const handleRemoveBookmark = (bookmarkId: string) => {
    enhancedLiteratureService.removeBookmark(bookmarkId)
    loadBookmarks()
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'var(--success-color)'
      case 'intermediate': return 'var(--warning-color)'
      case 'advanced': return 'var(--crisis-color)'
      default: return 'var(--text-light)'
    }
  }

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'book': return '📚'
      case 'pamphlet': return '📄'
      case 'reflection': return '🌅'
      case 'tradition': return '🏛️'
      case 'step': return '🪜'
      case 'story': return '📖'
      default: return '📝'
    }
  }

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const renderLiteratureCard = (item: LiteratureItem) => {
    const progress = readingProgress[item.id]
    const totalReadingTime = item.content.reduce((sum, c) => sum + c.readingTime, 0)
    
    return (
      <div key={item.id} className="literature-card" onClick={() => handleItemClick(item)}>
        <div className="card-header">
          <div className="item-type">
            <span className="type-icon">{getTypeIcon(item.type)}</span>
            <span className="type-label">{item.type}</span>
          </div>
          <div className="difficulty-badge" style={{ color: getDifficultyColor(item.difficulty) }}>
            {item.difficulty}
          </div>
        </div>
        
        <h3 className="item-title">{item.title}</h3>
        <p className="item-description">{item.description}</p>
        
        <div className="item-meta">
          <div className="meta-row">
            <span className="category">{item.category}</span>
            <span className="page-count">{item.pageCount} pages</span>
          </div>
          <div className="meta-row">
            <span className="reading-time">⏱️ {formatReadingTime(totalReadingTime)}</span>
            {item.isOfflineAvailable && <span className="offline-badge">📱 Offline</span>}
          </div>
        </div>
        
        {progress && (
          <div className="progress-section">
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${progress.progressPercentage}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.progressPercentage}% • Page {progress.currentPage}/{progress.totalPages}
            </span>
          </div>
        )}
        
        <div className="item-tags">
          {item.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
          {item.tags.length > 3 && (
            <span className="tag more">+{item.tags.length - 3}</span>
          )}
        </div>
        
        <div className="card-actions">
          <button 
            className="read-button"
            onClick={(e) => {
              e.stopPropagation()
              handleItemClick(item)
            }}
          >
            {progress?.progressPercentage > 0 ? '📖 Continue Reading' : '📚 Start Reading'}
          </button>
          <button 
            className="bookmark-button"
            onClick={(e) => {
              e.stopPropagation()
              handleAddBookmark(item)
            }}
          >
            🔖
          </button>
        </div>
      </div>
    )
  }

  const renderBookmarkCard = (bookmark: Bookmark) => {
    return (
      <div key={bookmark.id} className="bookmark-card">
        <div className="bookmark-header">
          <h4>{bookmark.title}</h4>
          <button 
            className="remove-bookmark"
            onClick={() => handleRemoveBookmark(bookmark.id)}
          >
            ✕
          </button>
        </div>
        <p className="bookmark-content">{bookmark.content}</p>
        <div className="bookmark-meta">
          <span className="page-number">Page {bookmark.pageNumber}</span>
          <span className="bookmark-date">
            {bookmark.createdDate.toLocaleDateString()}
          </span>
        </div>
        <div className="bookmark-tags">
          {bookmark.tags.map((tag, index) => (
            <span key={index} className="bookmark-tag">{tag}</span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="enhanced-literature-page" data-testid="enhanced-literature-page">
      {/* Header */}
      <div className="literature-header">
        <h1>📚 AA Literature Library</h1>
        <p>Comprehensive collection of AA literature with advanced study tools</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('browse')}
          className={`tab-button ${activeTab === 'browse' ? 'active' : ''}`}
        >
          🔍 Browse & Search
        </button>
        <button
          onClick={() => setActiveTab('reading')}
          className={`tab-button ${activeTab === 'reading' ? 'active' : ''}`}
        >
          📖 My Reading
        </button>
        <button
          onClick={() => setActiveTab('daily')}
          className={`tab-button ${activeTab === 'daily' ? 'active' : ''}`}
        >
          🌅 Daily Reflection
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`tab-button ${activeTab === 'bookmarks' ? 'active' : ''}`}
        >
          🔖 Bookmarks ({bookmarks.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
        >
          📊 Reading Stats
        </button>
      </div>

      {/* Browse & Search Tab */}
      {activeTab === 'browse' && (
        <div className="browse-content">
          {/* Search Section */}
          <div className="search-section">
            <div className="search-container">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search literature by title, content, or topic..."
                className="search-input"
                disabled={!isOnline}
              />
              <button
                onClick={handleSearch}
                disabled={!isOnline || isSearching}
                className="search-button"
              >
                {isSearching ? '⏳' : '🔍'} Search
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="filters-button"
              >
                🔧 Filters
              </button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="filters-panel">
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Sort By:</label>
                    <select
                      value={searchFilters.sortBy}
                      onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                    >
                      <option value="relevance">Relevance</option>
                      <option value="title">Title</option>
                      <option value="date">Date</option>
                      <option value="reading_time">Reading Time</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Type:</label>
                    <select
                      value={searchFilters.types?.[0] || 'all'}
                      onChange={(e) => {
                        const value = e.target.value
                        handleFilterChange({ 
                          types: value === 'all' ? undefined : [value] 
                        })
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="book">Books</option>
                      <option value="pamphlet">Pamphlets</option>
                      <option value="reflection">Reflections</option>
                      <option value="step">Steps</option>
                      <option value="tradition">Traditions</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Difficulty:</label>
                    <select
                      value={searchFilters.difficulty?.[0] || 'all'}
                      onChange={(e) => {
                        const value = e.target.value
                        handleFilterChange({ 
                          difficulty: value === 'all' ? undefined : [value] 
                        })
                      }}
                    >
                      <option value="all">All Levels</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={searchFilters.onlyOfflineAvailable || false}
                        onChange={(e) => handleFilterChange({ 
                          onlyOfflineAvailable: e.target.checked 
                        })}
                      />
                      Offline Available Only
                    </label>
                  </div>
                </div>

                <div className="filters-actions">
                  <button onClick={handleApplyFilters} className="apply-filters-button">
                    ✅ Apply Filters
                  </button>
                  <button 
                    onClick={() => {
                      setSearchFilters({ sortBy: 'relevance', sortOrder: 'desc', pageSize: 12 })
                      setShowFilters(false)
                    }}
                    className="clear-filters-button"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResult && (
            <div className="search-results">
              <div className="results-header">
                <h3>
                  Found {searchResult.totalFound} items
                  {searchQuery && ` for "${searchQuery}"`}
                  <span className="search-time">({searchResult.searchTime}ms)</span>
                </h3>
              </div>

              <div className="literature-grid">
                {searchResult.items.map(item => renderLiteratureCard(item))}
              </div>

              {searchResult.suggestions && searchResult.suggestions.length > 0 && (
                <div className="search-suggestions">
                  <h4>Suggestions:</h4>
                  <ul>
                    {searchResult.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="recommendations-section">
              <h3>📋 Recommended for You</h3>
              <div className="recommendations-grid">
                {recommendations.slice(0, 4).map(item => renderLiteratureCard(item))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Reading Tab */}
      {activeTab === 'reading' && (
        <div className="reading-content">
          <h3>📖 Your Reading Progress</h3>
          
          {Object.keys(readingProgress).length === 0 ? (
            <div className="no-reading">
              <p>No reading progress yet.</p>
              <p>Start reading any literature item to track your progress!</p>
            </div>
          ) : (
            <div className="reading-progress-list">
              {Object.values(readingProgress).map(progress => {
                // Get the literature item for this progress
                const items = searchResult?.items || []
                const item = items.find(i => i.id === progress.literatureId)
                
                if (!item) return null

                return (
                  <div key={progress.literatureId} className="progress-item">
                    <div className="progress-header">
                      <h4>{item.title}</h4>
                      <span className="completion-badge">
                        {progress.isCompleted ? '✅ Completed' : '📖 In Progress'}
                      </span>
                    </div>
                    
                    <div className="progress-details">
                      <div className="progress-bar-large">
                        <div 
                          className="progress-fill"
                          style={{ width: `${progress.progressPercentage}%` }}
                        />
                        <span className="progress-percentage">{progress.progressPercentage}%</span>
                      </div>
                      
                      <div className="progress-stats">
                        <span>Page {progress.currentPage} of {progress.totalPages}</span>
                        <span>Time spent: {formatReadingTime(progress.timeSpent)}</span>
                        <span>Last read: {progress.lastReadDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="progress-actions">
                      <button 
                        onClick={() => handleItemClick(item)}
                        className="continue-reading-button"
                      >
                        📖 Continue Reading
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Daily Reflection Tab */}
      {activeTab === 'daily' && (
        <div className="daily-content">
          {dailyReflection && (
            <div className="daily-reflection">
              <div className="reflection-header">
                <h3>🌅 Today's Reflection</h3>
                <span className="reflection-date">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              <div className="reflection-card">
                <h4>{dailyReflection.title}</h4>
                <blockquote>{dailyReflection.content}</blockquote>
                
                {dailyReflection.bigBookReference && (
                  <cite>— {dailyReflection.bigBookReference}</cite>
                )}
                
                {dailyReflection.suggestedActions.length > 0 && (
                  <div className="suggested-actions">
                    <h5>💡 Suggested Actions:</h5>
                    <ul>
                      {dailyReflection.suggestedActions.map((action, index) => (
                        <li key={index}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {dailyReflection.reflectionQuestions.length > 0 && (
                  <div className="reflection-questions">
                    <h5>🤔 Reflection Questions:</h5>
                    <ul>
                      {dailyReflection.reflectionQuestions.map((question, index) => (
                        <li key={index}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bookmarks Tab */}
      {activeTab === 'bookmarks' && (
        <div className="bookmarks-content">
          <h3>🔖 Your Bookmarks ({bookmarks.length})</h3>
          
          {bookmarks.length === 0 ? (
            <div className="no-bookmarks">
              <p>No bookmarks saved yet.</p>
              <p>Bookmark pages while reading to save important passages!</p>
            </div>
          ) : (
            <div className="bookmarks-grid">
              {bookmarks.map(bookmark => renderBookmarkCard(bookmark))}
            </div>
          )}
        </div>
      )}

      {/* Reading Stats Tab */}
      {activeTab === 'stats' && (
        <div className="stats-content">
          <h3>📊 Your Reading Statistics</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{readingStats.totalItemsRead}</div>
              <div className="stat-label">Items Completed</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{readingStats.totalPagesRead}</div>
              <div className="stat-label">Pages Read</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{formatReadingTime(readingStats.totalTimeSpent)}</div>
              <div className="stat-label">Time Spent Reading</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{readingStats.completionRate}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
            
            <div className="stat-card">
              <div className="stat-number">{readingStats.readingStreak}</div>
              <div className="stat-label">Day Reading Streak</div>
            </div>
          </div>
          
          {readingStats.favoriteCategories.length > 0 && (
            <div className="favorite-categories">
              <h4>📈 Your Favorite Categories</h4>
              <div className="categories-list">
                {readingStats.favoriteCategories.map((category, index) => (
                  <span key={index} className="category-badge">{category}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="offline-notice">
          <p>📵 You're offline. Showing cached literature and offline-available content.</p>
        </div>
      )}
    </div>
  )
}