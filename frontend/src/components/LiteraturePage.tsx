import React from 'react'
import type { Session } from '@/types'
import './LiteraturePage.css'

interface LiteraturePageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * LiteraturePage Component - Placeholder
 * 
 * Will contain browseable AA literature and search functionality
 */
export default function LiteraturePage({ isOnline, session }: LiteraturePageProps): JSX.Element {
  return (
    <div className="literature-page" data-testid="literature-page">
      <div className="literature-header">
        <h1>📚 AA Literature</h1>
        <p>Browse and search AA-approved literature</p>
      </div>
      
      <div className="search-section">
        <div className="search-container">
          <input 
            type="text"
            placeholder="Search literature..."
            disabled={!isOnline}
            data-testid="literature-search"
          />
          <button 
            disabled={!isOnline}
            data-testid="search-button"
          >
            🔍 Search
          </button>
        </div>
      </div>
      
      <div className="literature-categories" data-testid="literature-categories">
        <div className="category-grid">
          <div className="category-card">
            <h3>📖 Big Book</h3>
            <p>Alcoholics Anonymous - The basic text</p>
          </div>
          
          <div className="category-card">
            <h3>🔢 Twelve Steps and Twelve Traditions</h3>
            <p>Detailed exploration of the Steps and Traditions</p>
          </div>
          
          <div className="category-card">
            <h3>📋 Daily Reflections</h3>
            <p>365 daily meditations for AA members</p>
          </div>
          
          <div className="category-card">
            <h3>📝 Pamphlets</h3>
            <p>Short guides on specific topics</p>
          </div>
        </div>
      </div>
      
      {!isOnline && (
        <div className="offline-notice">
          <p>📵 Offline mode - Cached content available</p>
        </div>
      )}
    </div>
  )
}