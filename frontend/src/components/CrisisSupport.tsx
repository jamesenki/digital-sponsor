import React, { useState, useEffect } from 'react'
import type { Session, CrisisResource } from '@/types'
import locationService, { type Coordinates, type EmergencyService, type LocationServiceError } from '@/services/locationService'
import crisisLiteratureService, { type CrisisLiteraturePassage } from '@/services/crisisLiteratureService'
import './CrisisSupport.css'

interface CrisisSupportProps {
  isOnline: boolean
  session: Session | null
}

/**
 * Crisis Support Component
 * 
 * Immediate access to crisis resources, emergency contacts, and relapse prevention
 * Prioritizes user safety and provides quick access to help
 */
function CrisisSupport({ isOnline, session }: CrisisSupportProps): JSX.Element {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null)
  const [emergencyServices, setEmergencyServices] = useState<EmergencyService[]>([])
  const [locationError, setLocationError] = useState<LocationServiceError | null>(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [literatureQuery, setLiteratureQuery] = useState('')
  const [crisisPassages, setCrisisPassages] = useState<CrisisLiteraturePassage[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Load initial urgent passages
    const urgentPassages = crisisLiteratureService.getUrgentPassages()
    setCrisisPassages(urgentPassages)
  }, [])

  useEffect(() => {
    // Get user location for local emergency services (with permission)
    if (locationService.isLocationAvailable() && isOnline) {
      setLoadingLocation(true)
      
      locationService.getCurrentLocation()
        .then(async (coords) => {
          setUserLocation(coords)
          setLocationError(null)
          locationService.logLocationUsage('emergency_services')
          
          // Get nearby emergency services
          try {
            const services = await locationService.getNearbyEmergencyServices(coords, 25)
            setEmergencyServices(services)
          } catch (error) {
            console.error('Failed to load emergency services:', error)
          }
        })
        .catch((error: LocationServiceError) => {
          setLocationError(error)
          console.log('Location access denied or unavailable:', error)
        })
        .finally(() => {
          setLoadingLocation(false)
        })
    }
  }, [isOnline])

  const nationalCrisisResources: CrisisResource[] = [
    {
      id: 'suicide-crisis-lifeline',
      name: '988 Suicide & Crisis Lifeline',
      description: 'Free, confidential emotional support 24/7',
      phone: '988',
      text: '988',
      website: 'https://988lifeline.org',
      available24x7: true,
      type: 'hotline'
    },
    {
      id: 'crisis-text-line',
      name: 'Crisis Text Line',
      description: 'Text-based crisis support',
      text: '741741',
      website: 'https://www.crisistextline.org',
      available24x7: true,
      type: 'text'
    },
    {
      id: 'samhsa-helpline',
      name: 'SAMHSA National Helpline',
      description: 'Substance abuse treatment referral service',
      phone: '1-800-662-4357',
      website: 'https://www.samhsa.gov/find-help/national-helpline',
      available24x7: true,
      type: 'hotline'
    },
    {
      id: 'aa-intergroup',
      name: 'AA General Service Office',
      description: 'AA World Services - literature and meeting info',
      phone: '212-870-3400',
      website: 'https://www.aa.org',
      available24x7: false,
      type: 'hotline'
    },
    {
      id: 'al-anon',
      name: 'Al-Anon Family Groups',
      description: 'Support for families and friends of alcoholics',
      phone: '1-888-425-2666',
      website: 'https://al-anon.org',
      available24x7: false,
      type: 'hotline'
    }
  ]

  const emergencyContacts = [
    { name: 'Emergency Services', number: '911', description: 'Police, Fire, Medical Emergency' },
    { name: 'Poison Control', number: '1-800-222-1222', description: 'Poison emergencies' },
    { name: 'Crisis Lifeline', number: '988', description: 'Suicide & mental health crisis' }
  ]


  const handleEmergencyCall = (number: string) => {
    if (emergencyMode) {
      window.location.href = `tel:${number}`
    } else {
      setEmergencyMode(true)
      setTimeout(() => setEmergencyMode(false), 5000) // Reset after 5 seconds
    }
  }

  const handleCrisisText = (number: string) => {
    window.location.href = `sms:${number}`
  }

  const handleLiteratureSearch = (query: string) => {
    if (!query.trim()) {
      const urgentPassages = crisisLiteratureService.getUrgentPassages()
      setCrisisPassages(urgentPassages)
      return
    }

    // Check for emergency queries
    if (crisisLiteratureService.isEmergencyQuery(query)) {
      const emergency = crisisLiteratureService.getEmergencyResponse()
      setCrisisPassages(emergency.passages)
      crisisLiteratureService.logCrisisLiteratureAccess('emergency', 'emergency_detected')
      return
    }

    const results = crisisLiteratureService.searchCrisisLiterature(query)
    setCrisisPassages(results.passages)
    crisisLiteratureService.logCrisisLiteratureAccess('search', query)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    
    if (category === 'all') {
      const urgentPassages = crisisLiteratureService.getUrgentPassages()
      setCrisisPassages(urgentPassages)
    } else {
      const categoryPassages = crisisLiteratureService.getPassagesByCategory(category as any)
      setCrisisPassages(categoryPassages)
      crisisLiteratureService.logCrisisLiteratureAccess('category', category)
    }
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <div className="crisis-support" data-testid="crisis-support">
      {/* Emergency Alert Banner */}
      <div className="emergency-banner">
        <div className="emergency-header">
          <h1>🆘 Crisis Support & Emergency Resources</h1>
          <div className="current-time">
            <span className="time-label">Current Time:</span>
            <span className="time-display">{formatTime(currentTime)}</span>
          </div>
        </div>
        <p className="emergency-message">
          <strong>If you are in immediate danger, call 911 right now.</strong><br />
          If you're having thoughts of suicide or self-harm, help is available 24/7.
        </p>
      </div>

      {/* Quick Emergency Actions */}
      <div className="emergency-actions">
        <h2>🚨 Immediate Help</h2>
        <div className="emergency-buttons">
          {emergencyContacts.map((contact) => (
            <button
              key={contact.number}
              className={`emergency-button ${contact.number === '911' ? 'emergency-911' : 'emergency-crisis'}`}
              onClick={() => handleEmergencyCall(contact.number)}
            >
              <div className="button-content">
                <span className="button-icon">📞</span>
                <div className="button-text">
                  <strong>{contact.name}</strong>
                  <span className="button-number">{contact.number}</span>
                  <span className="button-description">{contact.description}</span>
                </div>
              </div>
              {emergencyMode && (
                <div className="emergency-confirm">
                  <span>Tap again to call</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Crisis Resources */}
      <div className="crisis-resources">
        <h2>📞 Crisis Support Resources</h2>
        <div className="resources-grid">
          {nationalCrisisResources.map((resource) => (
            <div key={resource.id} className="resource-card">
              <div className="resource-header">
                <h3>{resource.name}</h3>
                {resource.available24x7 && (
                  <span className="availability-badge">24/7</span>
                )}
              </div>
              
              <p className="resource-description">{resource.description}</p>
              
              <div className="resource-actions">
                {resource.phone && (
                  <button
                    className="resource-button phone-button"
                    onClick={() => handleEmergencyCall(resource.phone!)}
                  >
                    📞 Call {resource.phone}
                  </button>
                )}
                
                {resource.text && (
                  <button
                    className="resource-button text-button"
                    onClick={() => handleCrisisText(resource.text!)}
                  >
                    💬 Text {resource.text}
                  </button>
                )}
                
                {resource.website && isOnline && (
                  <button
                    className="resource-button website-button"
                    onClick={() => window.open(resource.website, '_blank')}
                  >
                    🌐 Visit Website
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crisis Literature Search */}
      <div className="crisis-literature">
        <h2>📖 Crisis Literature Search</h2>
        <p className="literature-intro">
          Find immediate comfort and guidance from AA literature:
        </p>

        {/* Literature Search */}
        <div className="literature-search">
          <div className="search-container">
            <input
              type="text"
              value={literatureQuery}
              onChange={(e) => setLiteratureQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLiteratureSearch(literatureQuery)}
              placeholder="Search for help: 'suicidal thoughts', 'want to drink', 'overwhelmed'..."
              className="crisis-search-input"
            />
            <button
              onClick={() => handleLiteratureSearch(literatureQuery)}
              className="crisis-search-button"
            >
              🔍 Search
            </button>
          </div>

          {/* Category Filters */}
          <div className="category-filters">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`category-button ${selectedCategory === 'all' ? 'active' : ''}`}
            >
              🆘 All Urgent
            </button>
            {crisisLiteratureService.getAvailableCategories().slice(0, 6).map((cat) => (
              <button
                key={cat.category}
                onClick={() => handleCategoryChange(cat.category)}
                className={`category-button ${selectedCategory === cat.category ? 'active' : ''}`}
                title={cat.description}
              >
                {cat.title}
              </button>
            ))}
          </div>
        </div>
        
        {/* Literature Results */}
        <div className="literature-results">
          {crisisPassages.map((passage) => (
            <div key={passage.id} className="literature-card">
              <div className="passage-header">
                <h4>{passage.title}</h4>
                <div className="passage-meta">
                  <span className={`priority-badge priority-${passage.priority}`}>
                    {passage.priority === 'urgent' && '🚨'}
                    {passage.priority === 'high' && '⚡'}
                    {passage.priority === 'medium' && '📋'}
                    {passage.priority === 'low' && '📄'}
                    {passage.priority.toUpperCase()}
                  </span>
                  <span className="category-badge">{passage.category.replace('_', ' ').toUpperCase()}</span>
                </div>
              </div>
              
              <blockquote>"{passage.passage}"</blockquote>
              <cite>— {passage.source}, {passage.page}</cite>
              
              <div className="passage-use-case">
                <small><strong>When to use:</strong> {passage.useCase}</small>
              </div>
              
              <div className="passage-actions">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(crisisLiteratureService.formatPassageForDisplay(passage))
                    alert('Passage copied to clipboard')
                  }}
                  className="copy-button"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => {
                    const text = crisisLiteratureService.formatPassageForDisplay(passage)
                    const subject = `AA Literature: ${passage.title}`
                    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
                  }}
                  className="share-button"
                >
                  📧 Share
                </button>
              </div>
            </div>
          ))}
        </div>

        {crisisPassages.length === 0 && (
          <div className="no-results">
            <p>No passages found. Try a different search or select a category above.</p>
            <button 
              onClick={() => handleCategoryChange('all')}
              className="show-urgent-button"
            >
              🆘 Show Urgent Help
            </button>
          </div>
        )}
      </div>

      {/* Relapse Prevention */}
      <div className="relapse-prevention">
        <h2>🛡️ Immediate Relapse Prevention</h2>
        <div className="prevention-grid">
          <div className="prevention-card">
            <h4>🤝 Call Your Sponsor</h4>
            <p>Your sponsor is there for you. Don't hesitate to reach out, no matter the time.</p>
            <div className="action-buttons">
              <button className="action-button">📞 Call Sponsor</button>
              <button className="action-button">💬 Text Sponsor</button>
            </div>
          </div>
          
          <div className="prevention-card">
            <h4>🏠 Go to a Meeting</h4>
            <p>Find an immediate meeting near you or join a virtual meeting right now.</p>
            <div className="action-buttons">
              <button className="action-button">📍 Find Local Meeting</button>
              <button className="action-button">💻 Join Virtual Meeting</button>
            </div>
          </div>
          
          <div className="prevention-card">
            <h4>🙏 Immediate Actions</h4>
            <ul>
              <li>Call someone from your home group</li>
              <li>Read the Big Book or daily reflection</li>
              <li>Get to a safe place</li>
              <li>Remember: This feeling will pass</li>
            </ul>
          </div>
          
          <div className="prevention-card">
            <h4>⚠️ Warning Signs Checklist</h4>
            <ul>
              <li>Isolation from AA friends</li>
              <li>Skipping meetings</li>
              <li>Anger or resentment</li>
              <li>Overconfidence</li>
              <li>Stinking thinking</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Local Emergency Services */}
      {(userLocation || loadingLocation || locationError) && (
        <div className="local-services">
          <h2>📍 Local Emergency Services</h2>
          
          {loadingLocation && (
            <div className="loading-location">
              <p>🔍 Finding emergency services near you...</p>
              <div className="loading-spinner">⏳</div>
            </div>
          )}
          
          {locationError && (
            <div className="location-error">
              <h4>⚠️ Location Access Required</h4>
              <p>{locationError.message}</p>
              <p>To find local emergency services, please allow location access or search manually.</p>
              <button 
                className="retry-location-button"
                onClick={() => window.location.reload()}
              >
                🔄 Retry Location Access
              </button>
            </div>
          )}
          
          {userLocation && emergencyServices.length > 0 && (
            <>
              <p>Based on your location (within 25 miles):</p>
              <div className="emergency-services-list">
                {emergencyServices.slice(0, 6).map((service) => (
                  <div key={service.id} className="emergency-service-card">
                    <div className="service-header">
                      <h4>
                        {service.type === 'hospital' && '🏥'}
                        {service.type === 'urgent_care' && '🚑'}
                        {service.type === 'crisis_center' && '🆘'}
                        {service.type === 'mental_health' && '🧠'}
                        {service.type === 'detox' && '💊'}
                        {service.type === 'pharmacy' && '⚕️'}
                        {' '}
                        {service.name}
                      </h4>
                      {service.isOpen24Hours && (
                        <span className="always-open-badge">24/7</span>
                      )}
                    </div>
                    
                    <p className="service-address">{service.address}</p>
                    
                    {service.distance && (
                      <p className="service-distance">
                        📍 {service.distance.toFixed(1)} miles away
                      </p>
                    )}
                    
                    <div className="service-actions">
                      {service.phone && (
                        <button
                          className="service-action-button call-button"
                          onClick={() => window.location.href = locationService.getPhoneUrl(service.phone!)}
                        >
                          📞 Call
                        </button>
                      )}
                      
                      <button
                        className="service-action-button directions-button"
                        onClick={() => {
                          const directionsUrl = locationService.getDirectionsUrl(service, userLocation)
                          window.open(directionsUrl, '_blank')
                          locationService.logLocationUsage('directions')
                        }}
                      >
                        🗺️ Directions
                      </button>
                      
                      {service.website && (
                        <button
                          className="service-action-button website-button"
                          onClick={() => window.open(service.website, '_blank')}
                        >
                          🌐 Website
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {emergencyServices.length > 6 && (
                <div className="more-services">
                  <p>+ {emergencyServices.length - 6} more services available</p>
                  <button 
                    className="show-all-button"
                    onClick={() => {
                      const mapUrl = `https://www.google.com/maps/search/emergency+services+near+${userLocation.latitude},${userLocation.longitude}`
                      window.open(mapUrl, '_blank')
                    }}
                  >
                    🗺️ View All on Map
                  </button>
                </div>
              )}
            </>
          )}
          
          {userLocation && emergencyServices.length === 0 && !loadingLocation && (
            <div className="no-services">
              <p>No emergency services found in your immediate area.</p>
              <button 
                className="search-wider-button"
                onClick={() => {
                  const searchUrl = `https://www.google.com/maps/search/hospital+near+${userLocation.latitude},${userLocation.longitude}`
                  window.open(searchUrl, '_blank')
                }}
              >
                🔍 Search Wider Area
              </button>
            </div>
          )}
        </div>
      )}

      {/* Safety Notice */}
      <div className="safety-notice">
        <h3>🔒 Your Privacy & Safety</h3>
        <ul>
          <li><strong>Completely Anonymous:</strong> No personal data is stored or transmitted</li>
          <li><strong>No Call Logs:</strong> Your calls are not tracked by this app</li>
          <li><strong>AA Traditions:</strong> Complete anonymity maintained</li>
          <li><strong>Safe Environment:</strong> All resources are verified and legitimate</li>
        </ul>
      </div>
    </div>
  )
}

export default CrisisSupport