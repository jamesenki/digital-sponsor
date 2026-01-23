# Digital Sponsor Ad Service - Database Schema
## Cosmos DB Containers for Ad Tracking and Revenue

**Database:** DigitalSponsor  
**Location:** Central US  
**Account:** digitalsponsor-cosmos

---

## Container: ad_impressions

**Purpose:** Track all ad impressions for analytics and billing  
**Partition Key:** `/user_id`  
**Throughput:** 400 RU/s

### Document Schema:
```json
{
  "id": "user123_ad456_1767588000",
  "user_id": "user123",
  "ad_id": "recovery_lit_001",
  "timestamp": "2026-01-05T12:00:00Z",
  "context": "step_work",
  "session_id": "session_abc123",
  "location": "Portland, OR",
  "user_agent": "Mozilla/5.0...",
  "revenue_amount": 0.015,
  "provider": "recovery_literature_provider",
  "ad_type": "recovery_literature",
  "cpm_rate": 15.0
}
```

### Indexes:
- Primary: `id` (automatic)
- Partition: `user_id` (automatic)
- Additional: `timestamp`, `ad_id`, `provider`

### Analytics Queries:
- Revenue by time period: `SELECT SUM(c.revenue_amount) FROM c WHERE c.timestamp >= '2026-01-01'`
- Impressions by user: `SELECT COUNT(1) FROM c WHERE c.user_id = 'user123'`
- Performance by ad: `SELECT c.ad_id, COUNT(1) as impressions, SUM(c.revenue_amount) as revenue FROM c GROUP BY c.ad_id`

---

## Container: ad_clicks

**Purpose:** Track ad clicks for CTR calculation and revenue attribution  
**Partition Key:** `/user_id`  
**Throughput:** 400 RU/s

### Document Schema:
```json
{
  "id": "click_user123_ad456_1767588060",
  "user_id": "user123",
  "ad_id": "recovery_lit_001",
  "impression_id": "user123_ad456_1767588000",
  "destination_url": "https://example-recovery-literature.com/bigbook",
  "timestamp": "2026-01-05T12:01:00Z",
  "revenue_amount": 0.25,
  "provider": "recovery_literature_provider",
  "conversion_attributed": false
}
```

### Indexes:
- Primary: `id` (automatic)
- Partition: `user_id` (automatic)
- Additional: `impression_id`, `ad_id`, `timestamp`

### Analytics Queries:
- CTR calculation: `SELECT (click_count * 100.0 / impression_count) as ctr FROM ...`
- Click revenue: `SELECT SUM(c.revenue_amount) FROM c WHERE c.timestamp >= '2026-01-01'`
- Conversion tracking: `SELECT COUNT(1) FROM c WHERE c.conversion_attributed = true`

---

## Container: ad_inventory

**Purpose:** Manage available ads and targeting rules  
**Partition Key:** `/provider`  
**Throughput:** 400 RU/s (read-heavy)

### Document Schema:
```json
{
  "id": "recovery_lit_001",
  "ad_id": "recovery_lit_001",
  "title": "AA Big Book Study Guide",
  "description": "Enhanced study materials for working the 12 steps",
  "url": "https://example-recovery-literature.com/bigbook",
  "image_url": "https://ads.digitalsponsor.ai/recovery-lit-001.jpg",
  "provider": "recovery_literature_provider",
  "ad_type": "recovery_literature",
  "contexts": ["step_work", "literature_search"],
  "cpm_rate": 15.0,
  "cpc_rate": 0.25,
  "active": true,
  "targeting_rules": {
    "min_sobriety_days": 0,
    "max_frequency_daily": 2,
    "geographic_restrictions": [],
    "exclude_crisis_mode": true
  },
  "performance_metrics": {
    "total_impressions": 1234,
    "total_clicks": 56,
    "ctr": 4.5,
    "total_revenue": 12.34,
    "last_updated": "2026-01-05T12:00:00Z"
  },
  "created_at": "2026-01-05T00:00:00Z",
  "updated_at": "2026-01-05T12:00:00Z"
}
```

### Indexes:
- Primary: `id` (automatic)
- Partition: `provider` (automatic)
- Additional: `active`, `ad_type`, `contexts`

### Management Queries:
- Active ads by context: `SELECT * FROM c WHERE c.active = true AND ARRAY_CONTAINS(c.contexts, 'step_work')`
- Performance monitoring: `SELECT c.ad_id, c.performance_metrics FROM c WHERE c.provider = 'betterhelp'`
- Revenue optimization: `SELECT * FROM c ORDER BY c.cpm_rate DESC`

---

## Data Relationships

```
ad_inventory (1) → (many) ad_impressions
  - ad_inventory.ad_id = ad_impressions.ad_id

ad_impressions (1) → (0..1) ad_clicks  
  - ad_impressions.id = ad_clicks.impression_id

users (1) → (many) ad_impressions
  - users.id = ad_impressions.user_id

users (1) → (many) ad_clicks
  - users.id = ad_clicks.user_id
```

---

## Performance Considerations

### Partition Strategy:
- **ad_impressions/ad_clicks**: Partitioned by `user_id` for user-centric queries
- **ad_inventory**: Partitioned by `provider` for management efficiency

### Query Optimization:
- User frequency checks: Query by `user_id` within time window
- Revenue calculation: Aggregate by `timestamp` ranges  
- Ad performance: Group by `ad_id` with provider filtering

### Scaling Projections:
- **Year 1**: 25K users × 3 ads/day × 365 days = 27M impressions/year
- **Year 3**: 150K users × 3 ads/day × 365 days = 164M impressions/year
- **Storage**: ~500 bytes/impression = 82GB by Year 3

### Cost Optimization:
- Current: 1,200 RU/s total ($86/month)
- Year 3: Est. 4,000 RU/s ($288/month)
- Storage: ~$10/month by Year 3

---

## Data Lifecycle

### Retention Policies:
- **ad_impressions**: 2 years for analytics, then archive
- **ad_clicks**: 2 years for attribution, then archive  
- **ad_inventory**: Indefinite with version history

### Backup Strategy:
- Point-in-time restore: 30 days
- Cross-region backup: Primary (Central US) → Secondary (East US)
- Export to Analytics: Weekly aggregation to Azure Storage

### Privacy Compliance:
- User consent recorded in impressions
- GDPR deletion: Remove user_id associations
- Data anonymization after 1 year for analytics

---

This schema supports the Phase 1 ad-primary revenue model with room for growth through Phases 2-4.