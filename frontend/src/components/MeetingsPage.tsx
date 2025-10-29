import React, { useState, useEffect } from 'react'
import type { Session, Meeting } from '@/types'
import meetingFinderService, { type MeetingSearchFilters, type MeetingSearchResult } from '@/services/meetingFinderService'
import meetingNotificationService from '@/services/meetingNotificationService'
import locationService, { type Coordinates, type LocationServiceError } from '@/services/locationService'
import MeetingReminders from './MeetingReminders'
import './MeetingsPage.css'

interface MeetingsPageProps {
  isOnline: boolean
  session: Session | null
}

/**
 * Meetings Page Component
 * 
 * Complete AA meeting finder with location-based search,
 * virtual meeting support, and personal scheduling
 */
export default function MeetingsPage({ isOnline, session }: MeetingsPageProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [currentMeetings, setCurrentMeetings] = useState<Meeting[]>([])
  const [emergencyMeetings, setEmergencyMeetings] = useState<Meeting[]>([])
  const [favoriteMeetings, setFavoriteMeetings] = useState<Meeting[]>([])
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [searchResult, setSearchResult] = useState<MeetingSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [locationError, setLocationError] = useState<LocationServiceError | null>(null)
  const [searchFilters, setSearchFilters] = useState<MeetingSearchFilters>({
    radius: 25,
    meetingType: 'all',
    isVirtual: undefined,
    time: 'all'
  })
  const [activeTab, setActiveTab] = useState<'search' | 'current' | 'favorites' | 'reminders'>('search')
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Load initial data
  useEffect(() => {
    loadInitialData()
  }, [isOnline])

  const loadInitialData = async () => {
    try {
      // Load favorites
      const favorites = meetingFinderService.getFavoriteMeetings()
      setFavoriteMeetings(favorites)

      // Load emergency meetings
      const emergency = await meetingFinderService.getEmergencyMeetings()
      setEmergencyMeetings(emergency)

      // Get location if available
      if (isOnline && locationService.isLocationAvailable()) {
        try {
          const coords = await locationService.getCurrentLocation()
          setUserLocation(coords)
          setLocationError(null)
          
          // Load current meetings
          const current = await meetingFinderService.getCurrentMeetings(coords)
          setCurrentMeetings(current)
          
          // Perform initial search for nearby meetings
          performSearch({ location: coords, ...searchFilters })

        } catch (error) {
          setLocationError(error as LocationServiceError)
          console.log('Location not available:', error)
        }
      }

    } catch (error) {
      console.error('Failed to load meeting data:', error)
    }
  }

  const performSearch = async (filters: MeetingSearchFilters) => {
    setIsSearching(true)
    try {
      const result = await meetingFinderService.searchMeetings(filters)
      setSearchResult(result)
      setMeetings(result.meetings)
    } catch (error) {
      console.error('Meeting search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLocationSearch = () => {
    if (!searchQuery.trim()) {
      if (userLocation) {
        performSearch({ location: userLocation, ...searchFilters })
      }
      return
    }

    performSearch({ location: searchQuery, ...searchFilters })
  }

  const handleFilterChange = (newFilters: Partial<MeetingSearchFilters>) => {
    const updatedFilters = { ...searchFilters, ...newFilters }
    setSearchFilters(updatedFilters)
    
    if (userLocation || searchQuery) {
      performSearch({
        location: userLocation || searchQuery,
        ...updatedFilters
      })
    }
  }

  const handleJoinMeeting = async (meeting: Meeting) => {
    if (meeting.isVirtual) {
      const result = await meetingFinderService.joinVirtualMeeting(meeting)
      if (!result.success) {
        alert(`Failed to join meeting: ${result.error}`)
      }
    } else {
      const directionsUrl = meetingFinderService.getDirectionsToMeeting(meeting, userLocation || undefined)
      window.open(directionsUrl, '_blank')
    }
  }

  const handleToggleFavorite = (meeting: Meeting) => {
    const isFavorite = favoriteMeetings.some(m => m.id === meeting.id)
    
    if (isFavorite) {
      meetingFinderService.removeFavoriteMeeting(meeting.id)
      setFavoriteMeetings(favoriteMeetings.filter(m => m.id !== meeting.id))
      
      // Remove any associated reminders
      const reminders = meetingNotificationService.getRemindersForMeeting(meeting.id)
      reminders.forEach(reminder => {
        meetingNotificationService.removeReminder(reminder.id)
      })
    } else {
      meetingFinderService.saveFavoriteMeeting(meeting)
      setFavoriteMeetings([...favoriteMeetings, meeting])
      
      // Optionally suggest setting up reminders
      if (confirm(`Meeting added to favorites! Would you like to set up reminders for ${meeting.name}?`)) {
        meetingNotificationService.setupQuickReminders(meeting)
      }
    }
  }

  const formatTime = (timeString: string): string => {
    return timeString
  }

  const formatDistance = (meeting: Meeting): string => {
    if (!userLocation || meeting.isVirtual || !meeting.location.coordinates) {
      return ''
    }

    const distance = locationService.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      meeting.location.coordinates.lat,
      meeting.location.coordinates.lng
    )

    return `${distance.toFixed(1)} miles away`
  }

  const renderMeetingCard = (meeting: Meeting, showDistance = true) => {
    const isFavorite = favoriteMeetings.some(m => m.id === meeting.id)
    const distance = showDistance ? formatDistance(meeting) : ''

    return (
      <div key={meeting.id} className={`meeting-card ${meeting.isVirtual ? 'virtual' : 'in-person'}`}>
        <div className="meeting-header">
          <h4>{meeting.name}</h4>
          <button
            onClick={() => handleToggleFavorite(meeting)}
            className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        </div>

        <div className="meeting-details">
          <div className="meeting-time">
            <span className="day">{meeting.day}</span>
            <span className="time">{formatTime(meeting.time)}</span>
          </div>

          <div className="meeting-location">
            {meeting.isVirtual ? (
              <span className="virtual-indicator">🌐 Virtual Meeting</span>
            ) : (
              <>
                <span className="location-name">{meeting.location.name}</span>
                <span className="location-address">
                  {meeting.location.address}, {meeting.location.city}, {meeting.location.state}
                </span>
                {distance && <span className="distance">{distance}</span>}
              </>
            )}
          </div>

          <div className="meeting-meta">
            <span className={`meeting-type ${meeting.type}`}>
              {meeting.type === 'open' ? '🔓 Open' : '🔒 Closed'}
            </span>
            <div className="meeting-format">
              {meeting.format.map((format, index) => (
                <span key={index} className="format-tag">
                  {format.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {meeting.accessibility && meeting.accessibility.length > 0 && (
            <div className="accessibility">
              {meeting.accessibility.map((access, index) => (
                <span key={index} className="accessibility-tag">
                  ♿ {access.replace('_', ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="meeting-actions">
          <button
            onClick={() => handleJoinMeeting(meeting)}
            className={`join-button ${meeting.isVirtual ? 'virtual-join' : 'directions-button'}`}
          >
            {meeting.isVirtual ? '🔗 Join Meeting' : '🗺️ Get Directions'}
          </button>
          
          <button
            onClick={() => setSelectedMeeting(meeting)}
            className="details-button"
          >
            ℹ️ Details
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="meetings-page" data-testid="meetings-page">
      {/* Header */}
      <div className="meetings-header">
        <h1>🏛️ AA Meeting Finder</h1>
        <p>Find meetings near you, join virtual meetings, and never miss a meeting</p>
      </div>

      {/* Quick Access - Emergency Meetings */}
      {emergencyMeetings.length > 0 && (
        <div className="emergency-meetings-section">
          <h2>🆘 Emergency Meetings (24/7)</h2>
          <p>Crisis support meetings available right now</p>
          <div className="emergency-meetings-grid">
            {emergencyMeetings.map(meeting => (
              <div key={meeting.id} className="emergency-meeting-card">
                <h4>{meeting.name}</h4>
                <p>{meeting.day} • {meeting.time}</p>
                <button
                  onClick={() => handleJoinMeeting(meeting)}
                  className="emergency-join-button"
                >
                  🔗 Join Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Section */}
      <div className="search-section">
        <div className="search-container">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
            placeholder="Enter city, state, ZIP code, or use current location..."
            className="location-input"
            disabled={!isOnline}
          />
          <button
            onClick={handleLocationSearch}
            disabled={!isOnline || isSearching}
            className="search-button"
          >
            {isSearching ? '⏳ Searching...' : '🔍 Find Meetings'}
          </button>
        </div>

        {/* Search Filters */}
        <div className="search-filters">
          <div className="filter-group">
            <label>Radius:</label>
            <select
              value={searchFilters.radius}
              onChange={(e) => handleFilterChange({ radius: Number(e.target.value) })}
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type:</label>
            <select
              value={searchFilters.meetingType}
              onChange={(e) => handleFilterChange({ meetingType: e.target.value as any })}
            >
              <option value="all">All Meetings</option>
              <option value="open">Open Meetings</option>
              <option value="closed">Closed Meetings</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Format:</label>
            <select
              value={searchFilters.isVirtual === true ? 'virtual' : searchFilters.isVirtual === false ? 'in_person' : 'all'}
              onChange={(e) => {
                const value = e.target.value
                handleFilterChange({
                  isVirtual: value === 'virtual' ? true : value === 'in_person' ? false : undefined
                })
              }}
            >
              <option value="all">All Formats</option>
              <option value="in_person">In-Person Only</option>
              <option value="virtual">Virtual Only</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Time:</label>
            <select
              value={searchFilters.time}
              onChange={(e) => handleFilterChange({ time: e.target.value as any })}
            >
              <option value="all">Any Time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
        </div>

        {/* Location Status */}
        {locationError && (
          <div className="location-error">
            <p>⚠️ {locationError.message}</p>
            <p>Enter a location manually or allow location access for better results.</p>
          </div>
        )}

        {userLocation && (
          <div className="location-status">
            <p>📍 Using your current location for search</p>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('search')}
          className={`tab-button ${activeTab === 'search' ? 'active' : ''}`}
        >
          🔍 Search Results ({meetings.length})
        </button>
        <button
          onClick={() => setActiveTab('current')}
          className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
        >
          ⏰ Happening Now ({currentMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`tab-button ${activeTab === 'favorites' ? 'active' : ''}`}
        >
          ❤️ Favorites ({favoriteMeetings.length})
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`tab-button ${activeTab === 'reminders' ? 'active' : ''}`}
        >
          🔔 Reminders
        </button>
      </div>

      {/* Meeting Results */}
      <div className="meeting-results">
        {activeTab === 'search' && (
          <div className="search-results">
            {searchResult && (
              <div className="search-info">
                <p>
                  Found {searchResult.totalFound} meetings
                  {searchResult.searchLocation && ` near ${searchResult.searchLocation.address}`}
                  {searchResult.searchTime && ` (${searchResult.searchTime}ms)`}
                </p>
              </div>
            )}

            {meetings.length > 0 ? (
              <div className="meetings-grid">
                {meetings.map(meeting => renderMeetingCard(meeting))}
              </div>
            ) : !isSearching && (
              <div className="no-results">
                <p>No meetings found. Try adjusting your search filters or expanding the radius.</p>
                {searchResult?.suggestions && searchResult.suggestions.length > 0 && (
                  <div className="suggestions">
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
          </div>
        )}

        {activeTab === 'current' && (
          <div className="current-meetings">
            {currentMeetings.length > 0 ? (
              <>
                <h3>⏰ Starting Soon</h3>
                <div className="meetings-grid">
                  {currentMeetings.map(meeting => renderMeetingCard(meeting))}
                </div>
              </>
            ) : (
              <div className="no-current-meetings">
                <p>No meetings starting soon in your area.</p>
                <p>Check emergency meetings above for 24/7 support.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="favorite-meetings">
            {favoriteMeetings.length > 0 ? (
              <div className="meetings-grid">
                {favoriteMeetings.map(meeting => renderMeetingCard(meeting, false))}
              </div>
            ) : (
              <div className="no-favorites">
                <p>No favorite meetings yet.</p>
                <p>Heart (❤️) meetings to add them to your favorites.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reminders' && (
          <MeetingReminders isOnline={isOnline} />
        )}
      </div>

      {/* Meeting Details Modal */}
      {selectedMeeting && (
        <div className="meeting-modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="meeting-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedMeeting.name}</h3>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="close-modal-button"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-section">
                <h4>📅 When</h4>
                <p>{selectedMeeting.day} at {selectedMeeting.time}</p>
              </div>

              <div className="modal-section">
                <h4>📍 Where</h4>
                {selectedMeeting.isVirtual ? (
                  <div>
                    <p>🌐 Virtual Meeting</p>
                    <p>Platform: {selectedMeeting.virtualInfo?.platform}</p>
                    {selectedMeeting.virtualInfo?.meetingId && (
                      <p>Meeting ID: {selectedMeeting.virtualInfo.meetingId}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p>{selectedMeeting.location.name}</p>
                    <p>{selectedMeeting.location.address}</p>
                    <p>{selectedMeeting.location.city}, {selectedMeeting.location.state}</p>
                  </div>
                )}
              </div>

              <div className="modal-section">
                <h4>ℹ️ Details</h4>
                <p><strong>Type:</strong> {selectedMeeting.type === 'open' ? 'Open Meeting' : 'Closed Meeting'}</p>
                <p><strong>Format:</strong> {selectedMeeting.format.join(', ')}</p>
                {selectedMeeting.accessibility && selectedMeeting.accessibility.length > 0 && (
                  <p><strong>Accessibility:</strong> {selectedMeeting.accessibility.join(', ')}</p>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => handleJoinMeeting(selectedMeeting)}
                className="modal-join-button"
              >
                {selectedMeeting.isVirtual ? '🔗 Join Meeting' : '🗺️ Get Directions'}
              </button>
              <button
                onClick={() => handleToggleFavorite(selectedMeeting)}
                className="modal-favorite-button"
              >
                {favoriteMeetings.some(m => m.id === selectedMeeting.id) ? '💔 Remove Favorite' : '❤️ Add Favorite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Notice */}
      {!isOnline && (
        <div className="offline-notice">
          <p>🔌 You're offline. Connect to the internet to search for meetings.</p>
          <p>Emergency meetings and favorites are still available.</p>
        </div>
      )}
    </div>
  )
}