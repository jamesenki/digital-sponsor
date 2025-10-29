/**
 * Location Services for Emergency Support
 * 
 * Provides geolocation and emergency services discovery
 * Maintains complete user privacy and anonymity
 */

export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface EmergencyService {
  id: string
  name: string
  type: 'hospital' | 'urgent_care' | 'mental_health' | 'detox' | 'pharmacy' | 'crisis_center'
  address: string
  phone?: string
  distance?: number
  isOpen24Hours: boolean
  website?: string
  coordinates: Coordinates
}

export interface LocationServiceError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'API_ERROR'
  message: string
}

export class LocationService {
  private lastKnownPosition: Coordinates | null = null
  private locationWatchId: number | null = null

  /**
   * Get current user location with proper error handling
   */
  async getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({
          code: 'POSITION_UNAVAILABLE',
          message: 'Geolocation is not supported by this browser'
        } as LocationServiceError)
        return
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 300000 // 5 minutes
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          this.lastKnownPosition = coords
          resolve(coords)
        },
        (error) => {
          let locationError: LocationServiceError

          switch (error.code) {
            case error.PERMISSION_DENIED:
              locationError = {
                code: 'PERMISSION_DENIED',
                message: 'Location access denied by user'
              }
              break
            case error.POSITION_UNAVAILABLE:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'Location information unavailable'
              }
              break
            case error.TIMEOUT:
              locationError = {
                code: 'TIMEOUT',
                message: 'Location request timed out'
              }
              break
            default:
              locationError = {
                code: 'POSITION_UNAVAILABLE',
                message: 'Unknown location error occurred'
              }
          }

          reject(locationError)
        },
        options
      )
    })
  }

  /**
   * Calculate distance between two coordinates (in miles)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  /**
   * Get emergency services near location
   * Uses a combination of local databases and APIs
   */
  async getNearbyEmergencyServices(
    coords: Coordinates, 
    radiusMiles: number = 25
  ): Promise<EmergencyService[]> {
    try {
      // For demo purposes, we'll simulate emergency services
      // In production, this would call actual APIs like Google Places, hospitals.org, etc.
      const mockServices = this.getMockEmergencyServices(coords, radiusMiles)
      
      // Sort by distance
      return mockServices.sort((a, b) => (a.distance || 0) - (b.distance || 0))
    } catch (error) {
      console.error('Failed to fetch emergency services:', error)
      throw {
        code: 'API_ERROR',
        message: 'Unable to fetch emergency services data'
      } as LocationServiceError
    }
  }

  /**
   * Get crisis-specific services (mental health, addiction treatment)
   */
  async getCrisisServices(coords: Coordinates): Promise<EmergencyService[]> {
    const allServices = await this.getNearbyEmergencyServices(coords, 50)
    return allServices.filter(service => 
      service.type === 'mental_health' || 
      service.type === 'detox' || 
      service.type === 'crisis_center'
    )
  }

  /**
   * Get hospital and urgent care services
   */
  async getMedicalServices(coords: Coordinates): Promise<EmergencyService[]> {
    const allServices = await this.getNearbyEmergencyServices(coords, 25)
    return allServices.filter(service => 
      service.type === 'hospital' || 
      service.type === 'urgent_care'
    )
  }

  /**
   * Mock emergency services for demonstration
   * In production, replace with real API calls
   */
  private getMockEmergencyServices(coords: Coordinates, radiusMiles: number): EmergencyService[] {
    const baseServices: EmergencyService[] = [
      {
        id: 'hospital_1',
        name: 'General Hospital Emergency Department',
        type: 'hospital',
        address: '123 Medical Center Dr',
        phone: '(555) 123-4567',
        isOpen24Hours: true,
        website: 'https://generalhospital.org',
        coordinates: { 
          latitude: coords.latitude + 0.01, 
          longitude: coords.longitude + 0.01 
        }
      },
      {
        id: 'urgent_care_1',
        name: 'QuickCare Urgent Care',
        type: 'urgent_care',
        address: '456 Healthcare Blvd',
        phone: '(555) 234-5678',
        isOpen24Hours: false,
        website: 'https://quickcare.com',
        coordinates: { 
          latitude: coords.latitude + 0.005, 
          longitude: coords.longitude - 0.005 
        }
      },
      {
        id: 'crisis_center_1',
        name: 'Community Crisis Center',
        type: 'crisis_center',
        address: '789 Support St',
        phone: '(555) 345-6789',
        isOpen24Hours: true,
        website: 'https://crisishelp.org',
        coordinates: { 
          latitude: coords.latitude - 0.008, 
          longitude: coords.longitude + 0.012 
        }
      },
      {
        id: 'mental_health_1',
        name: 'Mental Health Services Center',
        type: 'mental_health',
        address: '321 Wellness Way',
        phone: '(555) 456-7890',
        isOpen24Hours: false,
        website: 'https://mentalhealth.org',
        coordinates: { 
          latitude: coords.latitude + 0.015, 
          longitude: coords.longitude - 0.010 
        }
      },
      {
        id: 'detox_1',
        name: 'Addiction Recovery Center',
        type: 'detox',
        address: '654 Recovery Rd',
        phone: '(555) 567-8901',
        isOpen24Hours: true,
        website: 'https://recoveryhelp.org',
        coordinates: { 
          latitude: coords.latitude - 0.012, 
          longitude: coords.longitude - 0.008 
        }
      },
      {
        id: 'pharmacy_1',
        name: '24-Hour Pharmacy',
        type: 'pharmacy',
        address: '987 Main St',
        phone: '(555) 678-9012',
        isOpen24Hours: true,
        coordinates: { 
          latitude: coords.latitude + 0.003, 
          longitude: coords.longitude + 0.007 
        }
      }
    ]

    // Calculate distances and filter by radius
    return baseServices
      .map(service => ({
        ...service,
        distance: this.calculateDistance(
          coords.latitude,
          coords.longitude,
          service.coordinates.latitude,
          service.coordinates.longitude
        )
      }))
      .filter(service => (service.distance || 0) <= radiusMiles)
  }

  /**
   * Format address for map links
   */
  formatAddressForMaps(service: EmergencyService): string {
    return encodeURIComponent(`${service.name}, ${service.address}`)
  }

  /**
   * Generate directions URL for maps
   */
  getDirectionsUrl(service: EmergencyService, userCoords?: Coordinates): string {
    const destination = this.formatAddressForMaps(service)
    
    if (userCoords) {
      const origin = encodeURIComponent(`${userCoords.latitude},${userCoords.longitude}`)
      return `https://www.google.com/maps/dir/${origin}/${destination}`
    } else {
      return `https://www.google.com/maps/search/${destination}`
    }
  }

  /**
   * Get phone call URL
   */
  getPhoneUrl(phoneNumber: string): string {
    // Remove any formatting and create tel: URL
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '')
    return `tel:${cleanNumber}`
  }

  /**
   * Check if location services are available
   */
  isLocationAvailable(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Get last known position (cached)
   */
  getLastKnownPosition(): Coordinates | null {
    return this.lastKnownPosition
  }

  /**
   * Start watching location changes (for mobile users)
   */
  startLocationWatch(
    onLocationUpdate: (coords: Coordinates) => void,
    onError: (error: LocationServiceError) => void
  ): void {
    if (!this.isLocationAvailable()) {
      onError({
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation not available'
      })
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000 // 5 minutes
    }

    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: Coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        this.lastKnownPosition = coords
        onLocationUpdate(coords)
      },
      (error) => {
        onError({
          code: 'POSITION_UNAVAILABLE',
          message: 'Location watch failed'
        })
      },
      options
    )
  }

  /**
   * Stop watching location changes
   */
  stopLocationWatch(): void {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId)
      this.locationWatchId = null
    }
  }

  /**
   * Privacy-compliant location usage logging
   */
  logLocationUsage(purpose: 'emergency_services' | 'crisis_help' | 'directions'): void {
    // Anonymous usage logging - no personal data stored
    console.log(`🗺️ Location service used for: ${purpose}`)
    
    // In production, this could send anonymous analytics
    // without any location data or personal information
  }
}

export default new LocationService()