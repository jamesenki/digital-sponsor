# Subscription Service Database Schema

## Overview
The subscription service requires a new Cosmos DB container to track user usage metrics for enforcement of tier limits.

## Container: user_usage

### Purpose
Track user usage across different metrics (chat messages, step work sessions, etc.) to enforce tier-based limits.

### Partition Key
`/user_id`

### Throughput
- **Provisioned**: 400 RU/s (auto-scale to 4,000 RU/s)
- **Estimated Usage**: ~200 operations/hour initially (tracking usage events)

### Document Structure

```json
{
  "id": "user_123_chat_messages_2024-01",
  "user_id": "user_123",
  "metric": "chat_messages",
  "amount": 42,
  "period": "2024-01",
  "last_updated": "2024-01-15T14:30:00Z",
  "context": "regular_usage"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Composite key: `{user_id}_{metric}_{period}` |
| `user_id` | string | Yes | User identifier (partition key) |
| `metric` | string | Yes | Usage metric type: "chat_messages", "step_work_sessions", "literature_searches", "ad_impressions" |
| `amount` | integer | Yes | Current usage amount for this period |
| `period` | string | Yes | Usage period in YYYY-MM format |
| `last_updated` | datetime | Yes | Last time this record was updated |
| `context` | string | No | Additional context about usage |

### Indexes
- **Primary**: Automatic on `id` and `user_id`
- **Secondary**: `metric` + `period` for aggregate analytics
- **Composite**: `user_id` + `metric` + `period` for efficient queries

### Access Patterns
1. **Get user's current usage**: Query by `user_id` and current period
2. **Track single metric**: Update specific metric for user/period
3. **Reset monthly usage**: Query all users for previous period
4. **Analytics aggregation**: Query by metric across all users

### Sample Queries

```sql
-- Get user's current month usage
SELECT c.metric, c.amount 
FROM c 
WHERE c.user_id = "user_123" 
AND c.period = "2024-01"

-- Get all chat usage for analytics
SELECT c.user_id, c.amount, c.last_updated
FROM c 
WHERE c.metric = "chat_messages" 
AND c.period = "2024-01"

-- Get users approaching limits (example for free tier)
SELECT c.user_id, c.amount
FROM c 
WHERE c.metric = "chat_messages" 
AND c.period = "2024-01" 
AND c.amount > 40

-- Track total usage across all metrics
SELECT c.metric, SUM(c.amount) as total
FROM c 
WHERE c.period = "2024-01"
GROUP BY c.metric
```

## Usage Metrics

### Chat Messages (`chat_messages`)
- **Free Tier**: 50 messages/month
- **Pro Tier**: Unlimited (-1)
- **Tracking**: Each chat interaction increments by 1

### Step Work Sessions (`step_work_sessions`)
- **Free Tier**: 10 sessions/month
- **Pro Tier**: Unlimited (-1)
- **Tracking**: Each step work completion increments by 1

### Literature Searches (`literature_searches`)
- **Free Tier**: 20 searches/month
- **Pro Tier**: Unlimited (-1)
- **Tracking**: Each literature query increments by 1

### Ad Impressions (`ad_impressions`)
- **Free Tier**: 1000 impressions/month (shows ads)
- **Pro Tier**: 0 (ad-free experience)
- **Tracking**: Each ad display increments by 1

## Performance Projections

### Phase 1 (First 2 weeks)
- **Users**: ~100 active users
- **Operations**: ~2,000 usage tracking operations/day
- **RU/s**: 400 RU/s sufficient

### Growth Projections
- **Month 1**: 500 active users → 10,000 operations/day
- **Month 3**: 2,000 active users → 40,000 operations/day
- **Month 6**: 5,000 active users → 100,000 operations/day

### Scaling Plan
- **Auto-scale enabled**: 400 RU/s → 4,000 RU/s
- **Monthly cleanup**: Archive old usage data (6+ months)
- **Analytics aggregation**: Pre-compute summaries for performance

## Integration Points

### Service Dependencies
- **Payment Service**: Checks subscription status for tier determination
- **Chat Service**: Tracks `chat_messages` usage
- **Step Work Service**: Tracks `step_work_sessions` usage
- **Literature Service**: Tracks `literature_searches` usage
- **Ad Service**: Tracks `ad_impressions` and enforces ad-free for Pro

### API Endpoints
- **Feature Access**: Check if user can access premium features
- **Usage Limits**: Check if user has reached usage limits
- **Usage Tracking**: Record usage events
- **Analytics**: Get user usage analytics and recommendations

### Cache Layer (Redis)
- **Tier Info**: Cache user tier information for 5 minutes
- **Usage Counters**: Cache current usage for real-time limits
- **Feature Flags**: Cache feature access for performance

## Tier Configurations

### Free Tier
- **Features**: Basic support only
- **Limits**: 50 chat/month, 10 step work/month, 20 searches/month
- **Ads**: Shown (up to 1000 impressions/month)
- **Price**: $0/month

### Pro Tier
- **Features**: All premium features enabled
- **Limits**: Unlimited usage (-1 for all metrics)
- **Ads**: Ad-free experience (0 impressions)
- **Price**: $7.99/month

## Data Lifecycle

### Monthly Reset
- Usage counters reset on the 1st of each month
- Previous month data archived for analytics
- New period documents created as needed

### Data Retention
- **Current + 6 months**: Full usage data
- **6-12 months**: Aggregated summaries only
- **12+ months**: User-requested archives only

### Privacy & Compliance
- **Personal data**: User ID only, no PII in usage tracking
- **Anonymization**: Aggregate analytics use anonymized data
- **GDPR**: Support user data export and deletion requests