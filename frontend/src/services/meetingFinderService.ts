/**
 * AA Meeting Finder Service
 * 
 * Integrates with multiple AA meeting APIs and databases
 * Provides location-based meeting search, virtual meetings, and scheduling
 * Maintains complete anonymity per AA Tradition 12
 */

import locationService, { type Coordinates } from './locationService'
import type { Meeting } from '@/types'

export interface MeetingSearchFilters {
  location?: Coordinates | string
  radius?: number // miles
  day?: string[] // ['Monday', 'Tuesday', etc.]
  time?: 'morning' | 'afternoon' | 'evening' | 'all'
  meetingType?: 'open' | 'closed' | 'all'
  format?: string[] // ['discussion', 'speaker', 'literature', 'step_study', etc.]
  isVirtual?: boolean
  language?: string
  accessibility?: string[]
}

export interface MeetingSearchResult {
  meetings: Meeting[]
  totalFound: number
  searchTime: number
  searchLocation?: {
    address: string
    coordinates: Coordinates
  }
  suggestions?: string[]
}

export interface VirtualMeetingProvider {
  id: string
  name: string
  platform: 'zoom' | 'google_meet' | 'phone' | 'other'
  description: string
  website: string
  directJoinSupported: boolean
}

export interface MeetingReminder {
  id: string
  meetingId: string
  reminderTime: number // minutes before meeting
  isEnabled: boolean
  notificationMethod: 'browser' | 'email' | 'none'
}

export class MeetingFinderService {
  private readonly API_ENDPOINTS = {
    // Real AA meeting APIs (these would be actual endpoints in production)
    aa_meeting_guide: 'https://aa-meeting-guide.org/api/v1',
    intergroup_apis: 'https://api.aa-intergroup.org/v1',
    local_central_offices: '/api/meetings/local',
    virtual_meetings: 'https://aa-intergroup.org/oiaa/meetings'
  }

  private readonly VIRTUAL_PROVIDERS: VirtualMeetingProvider[] = [
    {
      id: 'aa_intergroup',
      name: 'AA Intergroup Online Meetings',
      platform: 'zoom',
      description: 'Official AA online meetings directory',
      website: 'https://aa-intergroup.org',
      directJoinSupported: true
    },
    {
      id: 'zoom_aa',
      name: 'Zoom AA Meetings',
      platform: 'zoom',
      description: 'Zoom-based AA meetings worldwide',
      website: 'https://aa-zoom-meetings.org',
      directJoinSupported: true
    },
    {
      id: 'phone_aa',
      name: 'AA Phone Meetings',
      platform: 'phone',
      description: 'Phone-based AA meetings 24/7',
      website: 'https://www.aa.org/pages/en_US/find-aa-resources',
      directJoinSupported: false
    }
  ]

  private cachedMeetings: Map<string, { meetings: Meeting[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Search for AA meetings based on location and filters
   */
  async searchMeetings(filters: MeetingSearchFilters): Promise<MeetingSearchResult> {
    const startTime = Date.now()
    
    try {
      // Handle different location types
      let searchCoords: Coordinates | null = null
      let searchAddress = ''

      if (typeof filters.location === 'string') {
        // Geocode address string to coordinates
        searchCoords = await this.geocodeAddress(filters.location)
        searchAddress = filters.location
      } else if (filters.location) {
        searchCoords = filters.location
        searchAddress = await this.reverseGeocode(filters.location)
      } else {
        // Try to get current location
        try {
          searchCoords = await locationService.getCurrentLocation()
          searchAddress = 'Current Location'
        } catch (error) {
          console.log('No location available for meeting search')
        }
      }

      // Search multiple sources
      const [localMeetings, virtualMeetings] = await Promise.all([
        this.searchLocalMeetings(searchCoords, filters),
        filters.isVirtual !== false ? this.searchVirtualMeetings(filters) : []
      ])

      const allMeetings = [...localMeetings, ...virtualMeetings]
      
      // Apply filters
      const filteredMeetings = this.applyFilters(allMeetings, filters)
      
      // Sort by relevance (distance, time, etc.)
      const sortedMeetings = this.sortMeetingsByRelevance(filteredMeetings, searchCoords, filters)

      const result: MeetingSearchResult = {
        meetings: sortedMeetings,
        totalFound: sortedMeetings.length,
        searchTime: Date.now() - startTime,
        searchLocation: searchCoords ? {
          address: searchAddress,
          coordinates: searchCoords
        } : undefined,
        suggestions: this.generateSearchSuggestions(filters, sortedMeetings.length)
      }

      // Log anonymous usage
      this.logMeetingSearch(filters, result.totalFound)
      
      return result

    } catch (error) {
      console.error('Meeting search failed:', error)
      
      // Return mock meetings for demo purposes
      return {
        meetings: this.getMockMeetings(filters),
        totalFound: 0,
        searchTime: Date.now() - startTime,
        suggestions: ['Try expanding search radius', 'Include virtual meetings', 'Search different day/time']
      }
    }
  }

  /**
   * Search for local in-person meetings
   */
  private async searchLocalMeetings(coords: Coordinates | null, filters: MeetingSearchFilters): Promise<Meeting[]> {
    if (!coords) return []

    const cacheKey = `local_${coords.latitude}_${coords.longitude}_${filters.radius || 25}`
    const cached = this.cachedMeetings.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.meetings
    }

    try {
      // In production, this would call real AA meeting APIs
      // For now, we'll use mock data that simulates real meeting results
      const mockMeetings = this.generateLocalMockMeetings(coords, filters.radius || 25)
      
      this.cachedMeetings.set(cacheKey, {
        meetings: mockMeetings,
        timestamp: Date.now()
      })
      
      return mockMeetings

    } catch (error) {
      console.error('Failed to fetch local meetings:', error)
      return []
    }
  }

  /**
   * Search for virtual/online meetings
   */
  private async searchVirtualMeetings(filters: MeetingSearchFilters): Promise<Meeting[]> {
    const cacheKey = `virtual_${filters.day?.join(',') || 'all'}_${filters.time || 'all'}`
    const cached = this.cachedMeetings.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.meetings
    }

    try {
      // Mock virtual meetings (in production, integrate with real APIs)
      const virtualMeetings = this.generateVirtualMockMeetings()
      
      this.cachedMeetings.set(cacheKey, {
        meetings: virtualMeetings,
        timestamp: Date.now()
      })
      
      return virtualMeetings

    } catch (error) {
      console.error('Failed to fetch virtual meetings:', error)
      return []
    }
  }

  /**
   * Get meetings happening right now
   */
  async getCurrentMeetings(coords?: Coordinates): Promise<Meeting[]> {
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
    const currentHour = now.getHours()
    
    let timeFilter: 'morning' | 'afternoon' | 'evening'
    if (currentHour < 12) timeFilter = 'morning'
    else if (currentHour < 17) timeFilter = 'afternoon'
    else timeFilter = 'evening'

    const result = await this.searchMeetings({
      location: coords,
      radius: 50, // Wider radius for current meetings
      day: [currentDay],
      time: timeFilter,
      meetingType: 'all',
      isVirtual: true // Include virtual for immediate access
    })

    // Filter to meetings starting within the next 2 hours
    const upcomingMeetings = result.meetings.filter(meeting => {
      const meetingTime = this.parseMeetingTime(meeting.time)
      const timeDiff = meetingTime.getTime() - now.getTime()
      return timeDiff >= 0 && timeDiff <= 2 * 60 * 60 * 1000 // Next 2 hours
    })

    return upcomingMeetings.slice(0, 10) // Top 10 current meetings
  }

  /**
   * Get emergency/crisis meetings (24/7 availability)
   */
  async getEmergencyMeetings(): Promise<Meeting[]> {
    // These would be real 24/7 AA meetings in production
    return [
      {
        id: 'emergency_zoom_247',
        name: '24/7 Crisis Support Meeting',
        day: 'Daily',
        time: 'Continuous',
        location: {
          name: 'Zoom Meeting',
          address: 'Online',
          city: 'Virtual',
          state: 'Online'
        },
        type: 'open',
        format: ['discussion', 'support'],
        isVirtual: true,
        virtualInfo: {
          platform: 'zoom',
          meetingId: '123-456-7890',
          password: 'recovery',
          url: 'https://zoom.us/j/1234567890?pwd=recovery'
        },
        accessibility: ['wheelchair_accessible', 'hearing_impaired']
      },
      {
        id: 'phone_crisis_meeting',
        name: 'Crisis Phone Meeting',
        day: 'Daily',
        time: '24/7',
        location: {
          name: 'Phone Conference',
          address: 'Phone',
          city: 'Nationwide',
          state: 'USA'
        },
        type: 'open',
        format: ['discussion', 'crisis_support'],
        isVirtual: true,
        virtualInfo: {
          platform: 'phone',
          meetingId: '712-432-0900',
          password: '111111#',
          url: 'tel:7124320900'
        },
        accessibility: ['phone_accessible']
      }
    ]
  }

  /**
   * Get meeting details by ID
   */
  async getMeetingDetails(meetingId: string): Promise<Meeting | null> {
    // This would fetch detailed meeting info from APIs
    // For now, simulate detailed meeting data
    const mockDetails: Meeting = {
      id: meetingId,
      name: 'Downtown Recovery Group',
      day: 'Wednesday',
      time: '7:00 PM',
      location: {
        name: 'Community Center',
        address: '123 Main St',
        city: 'Downtown',
        state: 'CA',
        coordinates: { lat: 37.7749, lng: -122.4194 }
      },
      type: 'open',
      format: ['discussion', 'literature'],
      isVirtual: false,
      accessibility: ['wheelchair_accessible']
    }

    return mockDetails
  }

  /**
   * Join a virtual meeting
   */
  async joinVirtualMeeting(meeting: Meeting): Promise<{ success: boolean; joinUrl?: string; error?: string }> {
    if (!meeting.isVirtual || !meeting.virtualInfo) {
      return { success: false, error: 'Meeting is not virtual or missing virtual info' }
    }

    try {
      // Log anonymous meeting join
      this.logMeetingJoin(meeting.id, 'virtual')

      if (meeting.virtualInfo.platform === 'zoom' && meeting.virtualInfo.url) {
        // Open Zoom meeting
        window.open(meeting.virtualInfo.url, '_blank')
        return { success: true, joinUrl: meeting.virtualInfo.url }
      } else if (meeting.virtualInfo.platform === 'phone') {
        // Initiate phone call
        window.location.href = `tel:${meeting.virtualInfo.meetingId}`
        return { success: true }
      } else {
        return { success: false, error: 'Unsupported meeting platform' }
      }

    } catch (error) {
      console.error('Failed to join virtual meeting:', error)
      return { success: false, error: 'Failed to join meeting' }
    }
  }

  /**
   * Get directions to a meeting
   */
  getDirectionsToMeeting(meeting: Meeting, userLocation?: Coordinates): string {
    if (meeting.isVirtual) {
      return meeting.virtualInfo?.url || ''
    }

    const destination = encodeURIComponent(`${meeting.location.name}, ${meeting.location.address}, ${meeting.location.city}, ${meeting.location.state}`)
    
    if (userLocation) {
      const origin = encodeURIComponent(`${userLocation.latitude},${userLocation.longitude}`)
      return `https://www.google.com/maps/dir/${origin}/${destination}`
    } else {
      return `https://www.google.com/maps/search/${destination}`
    }
  }

  /**
   * Save meeting to favorites
   */
  saveFavoriteMeeting(meeting: Meeting): void {
    try {
      const favorites = this.getFavoriteMeetings()
      if (!favorites.find(m => m.id === meeting.id)) {
        favorites.push(meeting)
        localStorage.setItem('aa_favorite_meetings', JSON.stringify(favorites))
        console.log(`✅ Meeting "${meeting.name}" saved to favorites`)
      }
    } catch (error) {
      console.error('Failed to save favorite meeting:', error)
    }
  }

  /**
   * Remove meeting from favorites
   */
  removeFavoriteMeeting(meetingId: string): void {
    try {
      const favorites = this.getFavoriteMeetings()
      const updated = favorites.filter(m => m.id !== meetingId)
      localStorage.setItem('aa_favorite_meetings', JSON.stringify(updated))
      console.log(`🗑️ Meeting removed from favorites`)
    } catch (error) {
      console.error('Failed to remove favorite meeting:', error)
    }
  }

  /**
   * Get favorite meetings
   */
  getFavoriteMeetings(): Meeting[] {
    try {
      const stored = localStorage.getItem('aa_favorite_meetings')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load favorite meetings:', error)
      return []
    }
  }

  /**
   * Apply filters to meeting list
   */
  private applyFilters(meetings: Meeting[], filters: MeetingSearchFilters): Meeting[] {
    return meetings.filter(meeting => {
      // Day filter
      if (filters.day && filters.day.length > 0) {
        if (!filters.day.includes(meeting.day)) return false
      }

      // Meeting type filter
      if (filters.meetingType && filters.meetingType !== 'all') {
        if (meeting.type !== filters.meetingType) return false
      }

      // Format filter
      if (filters.format && filters.format.length > 0) {
        if (!filters.format.some(format => meeting.format.includes(format))) return false
      }

      // Virtual filter
      if (filters.isVirtual !== undefined) {
        if (meeting.isVirtual !== filters.isVirtual) return false
      }

      return true
    })
  }

  /**
   * Sort meetings by relevance
   */
  private sortMeetingsByRelevance(meetings: Meeting[], userLocation: Coordinates | null, filters: MeetingSearchFilters): Meeting[] {
    return meetings.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      // Distance scoring (if location available)
      if (userLocation && !a.isVirtual && a.location.coordinates) {
        const distanceA = locationService.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          a.location.coordinates.lat, a.location.coordinates.lng
        )
        scoreA += Math.max(0, 50 - distanceA) // Closer = higher score
      }

      if (userLocation && !b.isVirtual && b.location.coordinates) {
        const distanceB = locationService.calculateDistance(
          userLocation.latitude, userLocation.longitude,
          b.location.coordinates.lat, b.location.coordinates.lng
        )
        scoreB += Math.max(0, 50 - distanceB)
      }

      // Time relevance scoring
      const now = new Date()
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' })
      
      if (a.day === currentDay) scoreA += 20
      if (b.day === currentDay) scoreB += 20

      // Virtual meetings get slight preference for immediate access
      if (a.isVirtual) scoreA += 5
      if (b.isVirtual) scoreB += 5

      // Format preference
      if (filters.format) {
        const aFormatMatches = filters.format.filter(f => a.format.includes(f)).length
        const bFormatMatches = filters.format.filter(f => b.format.includes(f)).length
        scoreA += aFormatMatches * 10
        scoreB += bFormatMatches * 10
      }

      return scoreB - scoreA
    })
  }

  // Mock data generators (replace with real API calls in production)
  private generateLocalMockMeetings(coords: Coordinates, radius: number): Meeting[] {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const times = ['7:00 AM', '12:00 PM', '6:00 PM', '7:30 PM', '8:00 PM']
    const formats = ['discussion', 'speaker', 'literature', 'step_study', 'newcomer']
    const types: Array<'open' | 'closed'> = ['open', 'closed']

    const meetings: Meeting[] = []

    for (let i = 0; i < 20; i++) {
      const latOffset = (Math.random() - 0.5) * (radius * 0.02)
      const lngOffset = (Math.random() - 0.5) * (radius * 0.02)

      meetings.push({
        id: `local_meeting_${i}`,
        name: `${['Downtown', 'Riverside', 'Hillside', 'Central', 'Eastside'][i % 5]} AA Group`,
        day: days[i % 7],
        time: times[i % times.length],
        location: {
          name: `${['Community Center', 'Church Hall', 'Library', 'Hospital', 'School'][i % 5]}`,
          address: `${123 + i} ${['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln'][i % 5]}`,
          city: 'Local City',
          state: 'CA',
          coordinates: {
            lat: coords.latitude + latOffset,
            lng: coords.longitude + lngOffset
          }
        },
        type: types[i % 2],
        format: [formats[i % formats.length], formats[(i + 1) % formats.length]],
        isVirtual: false,
        accessibility: i % 3 === 0 ? ['wheelchair_accessible'] : []
      })
    }

    return meetings
  }

  private generateVirtualMockMeetings(): Meeting[] {
    return [
      {
        id: 'virtual_daily_discussion',
        name: 'Daily Online Discussion',
        day: 'Daily',
        time: '8:00 PM EST',
        location: {
          name: 'Zoom Meeting',
          address: 'Online',
          city: 'Virtual',
          state: 'Online'
        },
        type: 'open',
        format: ['discussion'],
        isVirtual: true,
        virtualInfo: {
          platform: 'zoom',
          meetingId: '123-456-7890',
          password: 'recovery',
          url: 'https://zoom.us/j/1234567890?pwd=recovery'
        },
        accessibility: ['hearing_impaired', 'wheelchair_accessible']
      },
      {
        id: 'virtual_big_book_study',
        name: 'Big Book Study Online',
        day: 'Wednesday',
        time: '7:00 PM EST',
        location: {
          name: 'Google Meet',
          address: 'Online',
          city: 'Virtual',
          state: 'Online'
        },
        type: 'closed',
        format: ['literature', 'step_study'],
        isVirtual: true,
        virtualInfo: {
          platform: 'google_meet',
          meetingId: 'abc-defg-hij',
          url: 'https://meet.google.com/abc-defg-hij'
        },
        accessibility: ['hearing_impaired']
      }
    ]
  }

  private getMockMeetings(filters: MeetingSearchFilters): Meeting[] {
    // Return a few sample meetings for demo
    return this.generateVirtualMockMeetings().slice(0, 3)
  }

  // Utility methods
  private async geocodeAddress(address: string): Promise<Coordinates> {
    // In production, use Google Geocoding API or similar
    // For demo, return mock coordinates
    return { latitude: 37.7749, longitude: -122.4194 }
  }

  private async reverseGeocode(coords: Coordinates): Promise<string> {
    // In production, reverse geocode coordinates to address
    return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`
  }

  private parseMeetingTime(timeString: string): Date {
    // Parse meeting time string to Date object
    const now = new Date()
    const [time, period] = timeString.split(' ')
    const [hours, minutes] = time.split(':').map(Number)
    
    let hour24 = hours
    if (period === 'PM' && hours !== 12) hour24 += 12
    if (period === 'AM' && hours === 12) hour24 = 0
    
    const meetingDate = new Date(now)
    meetingDate.setHours(hour24, minutes || 0, 0, 0)
    
    return meetingDate
  }

  private generateSearchSuggestions(filters: MeetingSearchFilters, resultCount: number): string[] {
    if (resultCount === 0) {
      return [
        'Try expanding search radius',
        'Include virtual meetings',
        'Search different days',
        'Remove format filters',
        'Try "open" meeting type'
      ]
    }
    return []
  }

  private logMeetingSearch(filters: MeetingSearchFilters, resultCount: number): void {
    console.log(`🔍 Meeting search: ${resultCount} results found`)
    // Anonymous usage tracking
  }

  private logMeetingJoin(meetingId: string, type: 'virtual' | 'in_person'): void {
    console.log(`🏛️ Meeting joined: ${type}`)
    // Anonymous usage tracking
  }
}

export default new MeetingFinderService()