import React from 'react'
import type { Session } from '@/types'

interface MeetingsPageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * MeetingsPage Component - Placeholder
 * 
 * Will contain meeting finder and virtual meeting support
 */
export default function MeetingsPage({ isOnline, session }: MeetingsPageProps): JSX.Element {
  return (
    <div className="meetings-page" data-testid="meetings-page">
      <div className="meetings-header">
        <h1>🏛️ Meetings</h1>
        <p>Find AA meetings near you or join virtual meetings</p>
      </div>
      
      <div className="meeting-search" data-testid="meeting-search">
        <div className="search-container">
          <input 
            type="text"
            placeholder="Enter city, state, or ZIP code..."
            disabled={!isOnline}
            data-testid="location-search"
          />
          <button 
            disabled={!isOnline}
            data-testid="search-meetings"
          >
            🔍 Find Meetings
          </button>
        </div>
      </div>
      
      <div className="meeting-types">
        <h2>📅 Meeting Types</h2>
        <div className="types-grid">
          <div className="type-card">
            <h3>🌐 Virtual Meetings</h3>
            <p>Online meetings via video conference</p>
            <span className="availability">Available 24/7</span>
          </div>
          
          <div className="type-card">
            <h3>🏢 In-Person Meetings</h3>
            <p>Traditional face-to-face meetings</p>
            <span className="availability">Location-based</span>
          </div>
          
          <div className="type-card">
            <h3>📞 Phone Meetings</h3>
            <p>Audio-only conference calls</p>
            <span className="availability">Call-in numbers</span>
          </div>
          
          <div className="type-card">
            <h3>📝 Special Interest</h3>
            <p>LGBTQ+, Young People, Women, etc.</p>
            <span className="availability">Various times</span>
          </div>
        </div>
      </div>
      
      <div className="quick-access">
        <h2>⚡ Quick Access</h2>
        <div className="quick-buttons">
          <button className="quick-btn" disabled={!isOnline}>
            📱 Meeting Guide App
          </button>
          <button className="quick-btn" disabled={!isOnline}>
            🌐 AA Intergroup
          </button>
          <button className="quick-btn" disabled={!isOnline}>
            📞 Local AA Hotline
          </button>
        </div>
      </div>
      
      <div className="meeting-disclaimer">
        <p>
          <strong>Important:</strong> Digital Sponsor is not affiliated with AA World Services. 
          Meeting information is provided as a service. Please verify meeting details before attending.
        </p>
      </div>
      
      {!isOnline && (
        <div className="offline-notice">
          <p>📵 Offline mode - Meeting search unavailable. Try refreshing when online.</p>
        </div>
      )}
    </div>
  )
}