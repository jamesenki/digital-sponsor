import React, { useState, useEffect, useCallback } from 'react'
import recoveryResourceLibraryService, {
  type RecoveryResource,
  type SearchFilters,
  type SearchResult,
  type PersonalizedRecommendation,
  type ResourceCategory,
  type ResourceType
} from '@/services/recoveryResourceLibraryService'

interface RecoveryResourceLibraryProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Enhanced Recovery Resource Library Component
 * 
 * Advanced resource search and discovery with personalized recommendations
 */
export default function RecoveryResourceLibrary({ isOpen, onClose }: RecoveryResourceLibraryProps): JSX.Element | null {
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([])
  const [categories, setCategories] = useState<ResourceCategory[]>([])
  const [selectedResource, setSelectedResource] = useState<RecoveryResource | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'recommendations' | 'bookmarks' | 'categories'>('search')
  const [isLoading, setIsLoading] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  useEffect(() => {
    if (isOpen) {
      initializeData()
    }
  }, [isOpen])

  const initializeData = async () => {
    setIsLoading(true)
    try {
      // Load initial data
      const initialSearch = await recoveryResourceLibraryService.search({})
      setSearchResults(initialSearch)
      
      const recs = recoveryResourceLibraryService.getPersonalizedRecommendations()
      setRecommendations(recs)
      
      const cats = recoveryResourceLibraryService.getCategories()
      setCategories(cats)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && Object.keys(searchFilters).length === 0) {
      return
    }

    setIsLoading(true)
    try {
      const filters: SearchFilters = {
        ...searchFilters,
        query: searchQuery.trim() || undefined
      }
      
      const results = await recoveryResourceLibraryService.search(filters)
      setSearchResults(results)
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, searchFilters])

  const handleResourceClick = (resource: RecoveryResource) => {
    const fullResource = recoveryResourceLibraryService.getResource(resource.id)
    setSelectedResource(fullResource)
  }

  const handleBookmarkToggle = (resourceId: string) => {
    recoveryResourceLibraryService.toggleBookmark(resourceId)
    // Refresh current view
    if (activeTab === 'bookmarks') {
      loadBookmarks()
    } else if (searchResults) {
      handleSearch()
    }
  }

  const handleRateResource = (resourceId: string, rating: number) => {
    recoveryResourceLibraryService.rateResource(resourceId, rating)
    if (selectedResource && selectedResource.id === resourceId) {
      const updated = recoveryResourceLibraryService.getResource(resourceId)
      setSelectedResource(updated)
    }
  }

  const loadBookmarks = async () => {
    setIsLoading(true)
    try {
      const results = await recoveryResourceLibraryService.search({ onlyBookmarked: true })
      setSearchResults(results)
    } finally {
      setIsLoading(false)
    }
  }

  const loadByCategory = async (categoryId: string) => {
    setIsLoading(true)
    try {
      const results = await recoveryResourceLibraryService.search({ categories: [categoryId] })
      setSearchResults(results)
      setActiveTab('search')
    } finally {
      setIsLoading(false)
    }
  }

  const updateReadingProgress = (resourceId: string, progress: number) => {
    recoveryResourceLibraryService.updateReadingProgress(resourceId, progress)
  }

  const formatReadingTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600'
      case 'intermediate': return 'text-yellow-600'
      case 'advanced': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTypeIcon = (type: ResourceType): string => {
    const icons = {
      article: '📄',
      meditation: '🧘',
      prayer: '🙏',
      worksheet: '📝',
      reflection: '💭',
      story: '📖',
      quote: '💬',
      exercise: '🏋️',
      audio: '🎵',
      video: '🎥'
    }
    return icons[type] || '📄'
  }

  if (!isOpen) return null

  return (
    <div className="resource-library-overlay">
      <div className="resource-library" role="dialog" aria-labelledby="library-title">
        <header className="library-header">
          <h2 id="library-title">📚 Recovery Resource Library</h2>
          <button 
            onClick={onClose} 
            className="close-button"
            aria-label="Close resource library"
          >
            ✕
          </button>
        </header>

        <nav className="library-tabs" role="tablist">
          {[
            { id: 'search', label: '🔍 Search', action: () => setActiveTab('search') },
            { id: 'recommendations', label: '⭐ For You', action: () => setActiveTab('recommendations') },
            { id: 'bookmarks', label: '🔖 Bookmarks', action: () => { setActiveTab('bookmarks'); loadBookmarks() } },
            { id: 'categories', label: '📂 Categories', action: () => setActiveTab('categories') }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="library-content">
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="search-tab">
              <div className="search-section">
                <div className="search-bar">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search resources, topics, or keywords..."
                    className="search-input"
                    aria-label="Search resources"
                  />
                  <button 
                    onClick={handleSearch}
                    className="search-button"
                    disabled={isLoading}
                    aria-label="Search"
                  >
                    {isLoading ? '⏳' : '🔍'}
                  </button>
                </div>

                <div className="search-controls">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="filter-toggle"
                  >
                    {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
                  </button>
                  
                  {searchResults && (
                    <span className="results-count">
                      {searchResults.totalCount} resources
                      {searchResults.searchTime && (
                        <span className="search-time">
                          ({searchResults.searchTime.toFixed(1)}ms)
                        </span>
                      )}
                    </span>
                  )}
                </div>

                {showAdvancedFilters && (
                  <div className="advanced-filters">
                    <div className="filter-row">
                      <label className="filter-label">Type:</label>
                      <div className="filter-options">
                        {(['article', 'meditation', 'prayer', 'worksheet'] as ResourceType[]).map(type => (
                          <label key={type} className="filter-checkbox">
                            <input
                              type="checkbox"
                              checked={searchFilters.types?.includes(type) || false}
                              onChange={(e) => {
                                const types = searchFilters.types || []
                                if (e.target.checked) {
                                  setSearchFilters({ ...searchFilters, types: [...types, type] })
                                } else {
                                  setSearchFilters({ ...searchFilters, types: types.filter(t => t !== type) })
                                }
                              }}
                            />
                            {getTypeIcon(type)} {type}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-row">
                      <label className="filter-label">Steps:</label>
                      <div className="filter-options">
                        {[1, 2, 3, 4, 5, 6].map(step => (
                          <label key={step} className="filter-checkbox">
                            <input
                              type="checkbox"
                              checked={searchFilters.steps?.includes(step) || false}
                              onChange={(e) => {
                                const steps = searchFilters.steps || []
                                if (e.target.checked) {
                                  setSearchFilters({ ...searchFilters, steps: [...steps, step] })
                                } else {
                                  setSearchFilters({ ...searchFilters, steps: steps.filter(s => s !== step) })
                                }
                              }}
                            />
                            Step {step}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="filter-row">
                      <label className="filter-label">Difficulty:</label>
                      <div className="filter-options">
                        {(['beginner', 'intermediate', 'advanced'] as const).map(difficulty => (
                          <label key={difficulty} className="filter-checkbox">
                            <input
                              type="checkbox"
                              checked={searchFilters.difficulty?.includes(difficulty) || false}
                              onChange={(e) => {
                                const diff = searchFilters.difficulty || []
                                if (e.target.checked) {
                                  setSearchFilters({ ...searchFilters, difficulty: [...diff, difficulty] })
                                } else {
                                  setSearchFilters({ ...searchFilters, difficulty: diff.filter(d => d !== difficulty) })
                                }
                              }}
                            />
                            <span className={getDifficultyColor(difficulty)}>
                              {difficulty}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="search-results">
                  {searchResults.resources.length === 0 ? (
                    <div className="no-results">
                      <p>No resources found. Try adjusting your search terms or filters.</p>
                    </div>
                  ) : (
                    <div className="resource-grid">
                      {searchResults.resources.map(resource => (
                        <ResourceCard
                          key={resource.id}
                          resource={resource}
                          onResourceClick={handleResourceClick}
                          onBookmarkToggle={handleBookmarkToggle}
                          formatReadingTime={formatReadingTime}
                          getDifficultyColor={getDifficultyColor}
                          getTypeIcon={getTypeIcon}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="recommendations-tab">
              <h3>Personalized Recommendations</h3>
              {recommendations.length === 0 ? (
                <p>No recommendations available yet. Start reading resources to get personalized suggestions!</p>
              ) : (
                <div className="recommendations-list">
                  {recommendations.map(rec => (
                    <div key={rec.resource.id} className="recommendation-card">
                      <div className="recommendation-reason">{rec.reason}</div>
                      <ResourceCard
                        resource={rec.resource}
                        onResourceClick={handleResourceClick}
                        onBookmarkToggle={handleBookmarkToggle}
                        formatReadingTime={formatReadingTime}
                        getDifficultyColor={getDifficultyColor}
                        getTypeIcon={getTypeIcon}
                        showCompact={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="categories-tab">
              <h3>Browse by Category</h3>
              <div className="categories-grid">
                {categories.map(category => (
                  <div 
                    key={category.id} 
                    className="category-card"
                    onClick={() => loadByCategory(category.id)}
                    style={{ borderColor: category.color }}
                  >
                    <div className="category-icon" style={{ color: category.color }}>
                      {category.icon}
                    </div>
                    <h4 className="category-name">{category.name}</h4>
                    <p className="category-description">{category.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Resource Detail Modal */}
        {selectedResource && (
          <ResourceDetailModal
            resource={selectedResource}
            onClose={() => setSelectedResource(null)}
            onBookmarkToggle={handleBookmarkToggle}
            onRateResource={handleRateResource}
            onProgressUpdate={updateReadingProgress}
            formatReadingTime={formatReadingTime}
            getDifficultyColor={getDifficultyColor}
            getTypeIcon={getTypeIcon}
          />
        )}
      </div>
    </div>
  )
}

// Resource Card Component
interface ResourceCardProps {
  resource: RecoveryResource
  onResourceClick: (resource: RecoveryResource) => void
  onBookmarkToggle: (resourceId: string) => void
  formatReadingTime: (minutes: number) => string
  getDifficultyColor: (difficulty: string) => string
  getTypeIcon: (type: ResourceType) => string
  showCompact?: boolean
}

function ResourceCard({ 
  resource, 
  onResourceClick, 
  onBookmarkToggle, 
  formatReadingTime, 
  getDifficultyColor, 
  getTypeIcon,
  showCompact = false 
}: ResourceCardProps) {
  return (
    <div className={`resource-card ${showCompact ? 'compact' : ''}`}>
      <div className="resource-header">
        <div className="resource-type">
          {getTypeIcon(resource.type)} {resource.type}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onBookmarkToggle(resource.id)
          }}
          className={`bookmark-button ${resource.isBookmarked ? 'bookmarked' : ''}`}
          aria-label={resource.isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {resource.isBookmarked ? '🔖' : '🔗'}
        </button>
      </div>

      <h4 className="resource-title" onClick={() => onResourceClick(resource)}>
        {resource.title}
      </h4>
      
      <p className="resource-description">{resource.description}</p>

      <div className="resource-meta">
        <span className="reading-time">⏱️ {formatReadingTime(resource.estimatedReadTime)}</span>
        <span className={`difficulty ${getDifficultyColor(resource.difficulty)}`}>
          {resource.difficulty}
        </span>
        {resource.rating > 0 && (
          <span className="rating">
            {'⭐'.repeat(resource.rating)}
          </span>
        )}
      </div>

      {resource.readingProgress > 0 && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${resource.readingProgress}%` }}
          />
          <span className="progress-text">{resource.readingProgress}% complete</span>
        </div>
      )}

      <div className="resource-tags">
        {resource.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">#{tag}</span>
        ))}
      </div>
    </div>
  )
}

// Resource Detail Modal Component
interface ResourceDetailModalProps {
  resource: RecoveryResource
  onClose: () => void
  onBookmarkToggle: (resourceId: string) => void
  onRateResource: (resourceId: string, rating: number) => void
  onProgressUpdate: (resourceId: string, progress: number) => void
  formatReadingTime: (minutes: number) => string
  getDifficultyColor: (difficulty: string) => string
  getTypeIcon: (type: ResourceType) => string
}

function ResourceDetailModal({ 
  resource, 
  onClose, 
  onBookmarkToggle, 
  onRateResource, 
  onProgressUpdate,
  formatReadingTime, 
  getDifficultyColor, 
  getTypeIcon 
}: ResourceDetailModalProps) {
  const [personalNote, setPersonalNote] = useState(resource.personalNotes || '')
  const [isReading, setIsReading] = useState(false)

  const handleSaveNote = () => {
    recoveryResourceLibraryService.addPersonalNote(resource.id, personalNote)
  }

  const simulateReading = () => {
    setIsReading(true)
    const interval = setInterval(() => {
      onProgressUpdate(resource.id, Math.min(100, resource.readingProgress + 10))
      if (resource.readingProgress >= 100) {
        clearInterval(interval)
        setIsReading(false)
      }
    }, 1000)
  }

  return (
    <div className="resource-modal-overlay" onClick={onClose}>
      <div className="resource-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title-section">
            <h3>{resource.title}</h3>
            <div className="resource-meta-line">
              <span>{getTypeIcon(resource.type)} {resource.type}</span>
              <span>⏱️ {formatReadingTime(resource.estimatedReadTime)}</span>
              <span className={getDifficultyColor(resource.difficulty)}>
                {resource.difficulty}
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <button
              onClick={() => onBookmarkToggle(resource.id)}
              className={`bookmark-button ${resource.isBookmarked ? 'bookmarked' : ''}`}
            >
              {resource.isBookmarked ? '🔖 Bookmarked' : '🔗 Bookmark'}
            </button>
            <button onClick={onClose} className="close-button">✕</button>
          </div>
        </header>

        <div className="modal-content">
          <div className="resource-content">
            <p className="resource-description">{resource.description}</p>
            <div className="content-text">{resource.content}</div>
          </div>

          <div className="resource-actions">
            <div className="rating-section">
              <label>Rate this resource:</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => onRateResource(resource.id, star)}
                    className={`star ${star <= resource.rating ? 'filled' : ''}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="progress-section">
              <label>Reading Progress: {resource.readingProgress}%</label>
              <div className="progress-bar large">
                <div 
                  className="progress-fill" 
                  style={{ width: `${resource.readingProgress}%` }}
                />
              </div>
              <button 
                onClick={simulateReading}
                disabled={isReading || resource.readingProgress >= 100}
                className="simulate-read-button"
              >
                {isReading ? 'Reading...' : 'Mark as Read'}
              </button>
            </div>

            <div className="notes-section">
              <label>Personal Notes:</label>
              <textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                placeholder="Add your personal reflections or notes..."
                className="notes-textarea"
              />
              <button onClick={handleSaveNote} className="save-note-button">
                Save Note
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// CSS styles would be added here or in a separate CSS file
const styles = `
.resource-library-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.resource-library {
  background: var(--bg-color);
  border-radius: 12px;
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
}

.library-tabs {
  display: flex;
  background: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  background: none;
  border: none;
  padding: 1rem 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-button:hover {
  background: var(--hover-bg);
  color: var(--text-color);
}

.tab-button.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  background: var(--bg-color);
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.search-section {
  margin-bottom: 2rem;
}

.search-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-color);
}

.search-button {
  padding: 0.75rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filter-toggle {
  background: none;
  border: 1px solid var(--border-color);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-color);
}

.results-count {
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.search-time {
  color: var(--text-muted);
  margin-left: 0.5rem;
}

.advanced-filters {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.filter-row {
  margin-bottom: 1rem;
}

.filter-label {
  font-weight: bold;
  margin-bottom: 0.5rem;
  display: block;
  color: var(--text-color);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-color);
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.resource-card {
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.resource-card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--primary-color);
}

.resource-card.compact {
  padding: 0.75rem;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.resource-type {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: bold;
}

.bookmark-button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.bookmark-button:hover,
.bookmark-button.bookmarked {
  opacity: 1;
}

.resource-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.125rem;
  color: var(--text-color);
  cursor: pointer;
  line-height: 1.4;
}

.resource-title:hover {
  color: var(--primary-color);
}

.resource-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.resource-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
}

.reading-time,
.difficulty,
.rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.progress-bar {
  background: var(--border-color);
  border-radius: 4px;
  height: 6px;
  margin-bottom: 0.75rem;
  position: relative;
  overflow: hidden;
}

.progress-bar.large {
  height: 8px;
  margin: 0.5rem 0;
}

.progress-fill {
  background: var(--primary-color);
  height: 100%;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.resource-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--primary-color);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.category-card {
  background: var(--surface-color);
  border: 2px solid var(--border-color);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.category-icon {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.category-name {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.category-description {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin: 0;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.recommendation-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background: var(--surface-color);
}

.recommendation-reason {
  font-size: 0.875rem;
  color: var(--primary-color);
  font-weight: bold;
  margin-bottom: 1rem;
}

.resource-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.resource-modal {
  background: var(--bg-color);
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface-color);
}

.modal-title-section h3 {
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.resource-meta-line {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.modal-content {
  overflow-y: auto;
  max-height: calc(90vh - 120px);
}

.resource-content {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.content-text {
  color: var(--text-color);
  line-height: 1.6;
  margin-top: 1rem;
}

.resource-actions {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rating-section,
.progress-section,
.notes-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.rating-section label,
.progress-section label,
.notes-section label {
  font-weight: bold;
  color: var(--text-color);
}

.star-rating {
  display: flex;
  gap: 0.25rem;
}

.star {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  opacity: 0.3;
  transition: opacity 0.2s;
}

.star.filled,
.star:hover {
  opacity: 1;
}

.simulate-read-button,
.save-note-button {
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;
}

.simulate-read-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.notes-textarea {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 0.75rem;
  color: var(--text-color);
  min-height: 80px;
  resize: vertical;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .resource-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .filter-options {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .modal-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .modal-actions {
    width: 100%;
    justify-content: space-between;
  }
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
}