# Digital Sponsor - Meeting Location Services Integration

## Overview

Digital Sponsor integrates real-time meeting location services to help users find AA meetings while maintaining anonymity and adhering to AA Traditions. The system aggregates data from multiple sources and provides location-based search without storing personal location data.

## User Stories & Requirements

### US-013: Location-Based Meeting Search
**As a** user seeking meetings  
**I want** to search by current location or specify a location  
**So that** I can find nearby AA meetings

**Acceptance Criteria:**
- Support GPS-based current location detection
- Allow manual location entry (city, address, zip code)
- Return meetings within specified radius (5, 10, 25 miles)
- Display results sorted by distance and time
- Work offline with cached recent searches

### US-014: Real-Time Meeting Information
**As a** user planning to attend meetings  
**I want** current meeting schedules, locations, and contact info  
**So that** I can attend without outdated information

**Acceptance Criteria:**
- Pull from live meeting databases (AA.org, Meeting Guide app)
- Display accurate day/time, address, accessibility info
- Show meeting type (Open/Closed) and format (Discussion/Speaker)
- Include contact information where available
- Update data daily to ensure accuracy

### US-015: Virtual Meeting Access
**As a** user unable to attend in-person  
**I want** access to online meeting information  
**So that** I can maintain fellowship virtually

**Acceptance Criteria:**
- Include online meetings in search results
- Display Zoom/platform links and access codes
- Show time zones for virtual meetings
- Filter specifically for online-only meetings
- Include virtual meeting etiquette information

### US-016: Downloadable Meeting Lists
**As a** user who travels or moves  
**I want** exportable meeting lists for offline reference  
**So that** I can find meetings without internet access

**Acceptance Criteria:**
- Export to PDF, CSV, and text formats
- Include all meeting details in export
- Generate printable meeting directories
- Cache downloads for offline access
- Update exports when data changes

## Technical Architecture

### Data Sources Integration

```python
# Meeting Data Aggregation Service
class MeetingDataService:
    def __init__(self):
        self.sources = {
            'aa_org': AAOrgMeetingAPI(),
            'meeting_guide': MeetingGuideAPI(),
            'district_websites': DistrictScraperService(),
            'intergroup_apis': IntergroupAPIService()
        }
        self.cache_duration = 86400  # 24 hours
    
    async def search_meetings(self, location, radius=10, filters=None):
        """
        Search meetings across all available sources
        
        Args:
            location: Coordinates, address, or city name
            radius: Search radius in miles
            filters: Dict with day, time, type filters
        
        Returns:
            List of normalized meeting objects
        """
        normalized_location = await self.geocode_location(location)
        
        # Query all sources in parallel
        tasks = []
        for source_name, source in self.sources.items():
            if source.is_available():
                task = self.query_source_with_timeout(
                    source, normalized_location, radius, filters
                )
                tasks.append(task)
        
        # Collect results from all sources
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out errors and normalize data
        meetings = []
        for result in results:
            if not isinstance(result, Exception):
                meetings.extend(self.normalize_meeting_data(result))
        
        # Deduplicate and sort by distance
        return self.deduplicate_and_sort(meetings, normalized_location)
    
    def normalize_meeting_data(self, raw_meetings):
        """Convert various API formats to standard meeting object"""
        normalized = []
        for meeting in raw_meetings:
            try:
                normalized_meeting = {
                    'id': self.generate_meeting_id(meeting),
                    'name': meeting.get('name', 'AA Meeting'),
                    'day': self.normalize_day(meeting.get('day')),
                    'time': self.normalize_time(meeting.get('time')),
                    'location': {
                        'name': meeting.get('location_name'),
                        'address': meeting.get('address'),
                        'city': meeting.get('city'),
                        'state': meeting.get('state'),
                        'zip': meeting.get('zip'),
                        'coordinates': meeting.get('coordinates'),
                        'accessibility': meeting.get('wheelchair_accessible', False)
                    },
                    'meeting_type': meeting.get('type', 'Unknown'),  # Open/Closed
                    'format': meeting.get('format', []),  # Discussion, Speaker, etc.
                    'is_virtual': meeting.get('is_online', False),
                    'virtual_info': {
                        'platform': meeting.get('platform'),
                        'meeting_id': meeting.get('virtual_meeting_id'),
                        'password': meeting.get('password'),
                        'phone': meeting.get('phone_number')
                    } if meeting.get('is_online') else None,
                    'contact': {
                        'phone': meeting.get('contact_phone'),
                        'email': meeting.get('contact_email'),
                        'website': meeting.get('website')
                    },
                    'notes': meeting.get('notes'),
                    'data_source': meeting.get('source', 'unknown'),
                    'last_updated': meeting.get('last_updated', datetime.now())
                }
                normalized.append(normalized_meeting)
            except Exception as e:
                logger.warning(f"Failed to normalize meeting: {e}")
        
        return normalized
```

### Privacy-Preserving Location Services

```python
class PrivacyLocationService:
    def __init__(self):
        self.min_privacy_radius = 1000  # 1km minimum for privacy
        self.location_cache_ttl = 300   # 5 minutes
    
    def get_fuzzy_location(self, precise_coordinates):
        """
        Add small random offset to coordinates for privacy
        while maintaining search accuracy
        """
        lat_offset = random.uniform(-0.005, 0.005)  # ~500m
        lng_offset = random.uniform(-0.005, 0.005)
        
        return {
            'lat': precise_coordinates['lat'] + lat_offset,
            'lng': precise_coordinates['lng'] + lng_offset,
            'accuracy': 'approximate'
        }
    
    def location_from_ip(self, ip_address):
        """
        Get approximate location from IP without storing personal data
        """
        # Use IP geolocation service
        location_data = self.ip_geolocation_service.lookup(ip_address)
        
        # Return only city-level accuracy
        return {
            'city': location_data.get('city'),
            'state': location_data.get('state'),
            'country': location_data.get('country'),
            'coordinates': {
                'lat': location_data.get('lat'),
                'lng': location_data.get('lng')
            },
            'accuracy': 'city'
        }
    
    def geocode_address(self, address_string):
        """Convert address to coordinates without logging personal addresses"""
        try:
            result = self.geocoding_service.geocode(address_string)
            
            # Log only anonymized location data
            self.log_anonymous_search(result.get('city'), result.get('state'))
            
            return {
                'address': address_string,
                'coordinates': {
                    'lat': result['lat'],
                    'lng': result['lng']
                },
                'accuracy': result.get('accuracy', 'address')
            }
        except Exception as e:
            logger.error(f"Geocoding failed: {e}")
            return None
```

### Caching and Offline Support

```python
class MeetingCacheService:
    def __init__(self):
        self.redis_client = redis.Redis()
        self.local_cache = {}
        self.cache_duration = {
            'meeting_data': 86400,      # 24 hours
            'search_results': 3600,     # 1 hour
            'location_data': 1800       # 30 minutes
        }
    
    def cache_meeting_data(self, location_key, meetings):
        """Cache meeting data for offline access"""
        cache_key = f"meetings:{location_key}"
        
        # Store in Redis for server-side caching
        self.redis_client.setex(
            cache_key,
            self.cache_duration['meeting_data'],
            json.dumps(meetings, default=str)
        )
        
        # Return client-side cache instruction
        return {
            'cache_key': cache_key,
            'expires': datetime.now() + timedelta(seconds=self.cache_duration['meeting_data']),
            'meetings': meetings
        }
    
    def get_cached_meetings(self, location_key):
        """Retrieve cached meeting data"""
        cache_key = f"meetings:{location_key}"
        
        cached_data = self.redis_client.get(cache_key)
        if cached_data:
            return json.loads(cached_data)
        
        return None
    
    def generate_offline_package(self, meetings, format='json'):
        """Generate downloadable offline meeting package"""
        if format == 'pdf':
            return self.generate_pdf_directory(meetings)
        elif format == 'csv':
            return self.generate_csv_export(meetings)
        else:
            return self.generate_json_export(meetings)
```

### API Endpoints

```python
# Meeting Search API
@app.route('/api/meetings/search', methods=['POST'])
@rate_limit('100/hour')
async def search_meetings():
    """
    Search for AA meetings by location
    
    Request:
    {
        "location": "Los Angeles, CA" | {"lat": 34.0522, "lng": -118.2437},
        "radius": 10,
        "filters": {
            "day": ["Monday", "Wednesday"],
            "time": "evening",
            "type": "open",
            "virtual": false
        }
    }
    """
    data = request.get_json()
    
    # Validate input
    location = data.get('location')
    radius = min(data.get('radius', 10), 50)  # Max 50 miles
    filters = data.get('filters', {})
    
    if not location:
        return jsonify({'error': 'Location required'}), 400
    
    try:
        # Search meetings
        meetings = await meeting_service.search_meetings(location, radius, filters)
        
        # Cache results for offline access
        cache_info = cache_service.cache_meeting_data(
            meeting_service.generate_location_key(location),
            meetings
        )
        
        return jsonify({
            'meetings': meetings,
            'cache_info': cache_info,
            'search_params': {
                'location': location,
                'radius': radius,
                'filters': filters
            }
        })
        
    except Exception as e:
        logger.error(f"Meeting search failed: {e}")
        return jsonify({'error': 'Search temporarily unavailable'}), 503

@app.route('/api/meetings/nearby', methods=['GET'])
@rate_limit('50/hour')
async def get_nearby_meetings():
    """Get meetings near user's current location (with privacy)"""
    
    # Get approximate location
    user_location = location_service.get_approximate_location(request)
    
    if not user_location:
        return jsonify({'error': 'Location not available'}), 400
    
    # Search nearby meetings
    meetings = await meeting_service.search_meetings(
        user_location, 
        radius=15  # Default 15-mile radius
    )
    
    return jsonify({
        'meetings': meetings,
        'location': user_location,
        'privacy_note': 'Location approximated for privacy'
    })

@app.route('/api/meetings/export', methods=['POST'])
@rate_limit('10/hour')
def export_meetings():
    """Export meeting list in various formats"""
    data = request.get_json()
    
    meetings = data.get('meetings', [])
    format = data.get('format', 'pdf')  # pdf, csv, json
    
    if not meetings:
        return jsonify({'error': 'No meetings to export'}), 400
    
    try:
        exported_data = cache_service.generate_offline_package(meetings, format)
        
        return send_file(
            exported_data,
            as_attachment=True,
            download_name=f'aa_meetings.{format}'
        )
        
    except Exception as e:
        logger.error(f"Export failed: {e}")
        return jsonify({'error': 'Export temporarily unavailable'}), 503
```

### Frontend Integration

```javascript
// Meeting Search Component
class MeetingSearch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            location: '',
            radius: 10,
            meetings: [],
            loading: false,
            filters: {
                day: '',
                time: '',
                type: '',
                virtual: false
            }
        };
    }
    
    async searchMeetings() {
        this.setState({ loading: true });
        
        try {
            const response = await fetch('/api/meetings/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location: this.state.location,
                    radius: this.state.radius,
                    filters: this.state.filters
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.setState({ 
                    meetings: data.meetings,
                    loading: false 
                });
                
                // Cache for offline access
                this.cacheOfflineData(data.meetings, data.cache_info);
            } else {
                throw new Error(data.error);
            }
            
        } catch (error) {
            console.error('Search failed:', error);
            // Try to load from cache
            const cachedMeetings = this.loadFromCache();
            if (cachedMeetings) {
                this.setState({ meetings: cachedMeetings });
            }
            this.setState({ loading: false });
        }
    }
    
    async getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    this.setState({
                        location: {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    });
                    this.searchMeetings();
                },
                error => {
                    console.warn('Location access denied');
                    // Fall back to IP-based location
                    this.searchNearbyMeetings();
                }
            );
        }
    }
    
    async searchNearbyMeetings() {
        const response = await fetch('/api/meetings/nearby');
        const data = await response.json();
        
        if (response.ok) {
            this.setState({ 
                meetings: data.meetings,
                location: data.location.city + ', ' + data.location.state 
            });
        }
    }
    
    exportMeetings(format) {
        fetch('/api/meetings/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                meetings: this.state.meetings,
                format: format
            })
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aa_meetings.${format}`;
            a.click();
        });
    }
    
    render() {
        return (
            <div className="meeting-search">
                <div className="search-controls">
                    <input
                        type="text"
                        placeholder="Enter location (city, address, or zip)"
                        value={this.state.location}
                        onChange={(e) => this.setState({ location: e.target.value })}
                    />
                    <button onClick={() => this.getUserLocation()}>
                        📍 Use Current Location
                    </button>
                    <button onClick={() => this.searchMeetings()}>
                        🔍 Search Meetings
                    </button>
                </div>
                
                <div className="filters">
                    <select 
                        value={this.state.filters.day}
                        onChange={(e) => this.updateFilter('day', e.target.value)}
                    >
                        <option value="">Any Day</option>
                        <option value="Sunday">Sunday</option>
                        <option value="Monday">Monday</option>
                        {/* ... other days */}
                    </select>
                    
                    <select 
                        value={this.state.filters.type}
                        onChange={(e) => this.updateFilter('type', e.target.value)}
                    >
                        <option value="">Any Type</option>
                        <option value="open">Open Meetings</option>
                        <option value="closed">Closed Meetings</option>
                    </select>
                    
                    <label>
                        <input
                            type="checkbox"
                            checked={this.state.filters.virtual}
                            onChange={(e) => this.updateFilter('virtual', e.target.checked)}
                        />
                        Include Virtual Meetings
                    </label>
                </div>
                
                <div className="export-options">
                    <button onClick={() => this.exportMeetings('pdf')}>
                        📄 Download PDF
                    </button>
                    <button onClick={() => this.exportMeetings('csv')}>
                        📊 Download CSV
                    </button>
                </div>
                
                <div className="meeting-results">
                    {this.state.loading ? (
                        <div className="loading">Searching meetings...</div>
                    ) : (
                        this.state.meetings.map(meeting => (
                            <MeetingCard key={meeting.id} meeting={meeting} />
                        ))
                    )}
                </div>
            </div>
        );
    }
}
```

## Privacy and Anonymity

### Location Privacy Measures
- **Fuzzy Coordinates**: Add random offset to precise GPS locations
- **No Location Storage**: Don't persistently store user locations
- **City-Level IP**: Use only city-level accuracy from IP geolocation
- **Cache Expiration**: Automatic deletion of location-based cache data

### Anonymous Usage
- **No User Tracking**: Meeting searches not tied to user accounts
- **Aggregate Analytics**: Only collect anonymous usage statistics
- **Local Storage**: Cache meeting data on device, not server
- **Privacy Notices**: Clear explanation of location usage

## Performance and Reliability

### Caching Strategy
- **Multi-Level Caching**: Browser, CDN, and server-side caching
- **Offline Capability**: Service worker caches recent meeting searches
- **Background Updates**: Refresh meeting data in background
- **Fallback Sources**: Multiple data sources for reliability

### Error Handling
- **Graceful Degradation**: Show cached results when APIs fail
- **Retry Logic**: Automatic retry for transient failures
- **User Feedback**: Clear error messages with suggested actions
- **Monitoring**: Track API availability and response times

This meeting integration provides comprehensive location services while maintaining user privacy and adhering to AA Traditions.