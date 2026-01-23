# Payment Service Database Schema

## Overview
The payment service requires a new Cosmos DB container to track user subscriptions and billing information.

## Container: user_subscriptions

### Purpose
Track user subscription status, Stripe customer/subscription IDs, and billing periods.

### Partition Key
`/user_id`

### Throughput
- **Provisioned**: 400 RU/s (auto-scale to 4,000 RU/s)
- **Estimated Usage**: ~50 operations/hour initially

### Document Structure

```json
{
  "id": "user_12345", 
  "user_id": "user_12345",
  "stripe_customer_id": "cus_ABC123",
  "stripe_subscription_id": "sub_DEF456", 
  "tier": "pro",
  "status": "active",
  "current_period_start": "2024-01-15T00:00:00Z",
  "current_period_end": "2024-02-15T00:00:00Z",
  "cancel_at_period_end": false,
  "trial_end": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Field Definitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Same as user_id (Cosmos DB document ID) |
| `user_id` | string | Yes | User identifier (partition key) |
| `stripe_customer_id` | string | No | Stripe customer ID |
| `stripe_subscription_id` | string | No | Stripe subscription ID |
| `tier` | string | Yes | Subscription tier: "free" or "pro" |
| `status` | string | Yes | Subscription status: "active", "canceled", "past_due", "incomplete", "trial" |
| `current_period_start` | datetime | No | Current billing period start |
| `current_period_end` | datetime | No | Current billing period end |
| `cancel_at_period_end` | boolean | Yes | Whether subscription cancels at period end |
| `trial_end` | datetime | No | Trial period end date |
| `created_at` | datetime | Yes | Record creation timestamp |
| `updated_at` | datetime | Yes | Record last update timestamp |

### Indexes
- **Primary**: Automatic on `id` and `user_id`
- **Secondary**: `stripe_customer_id`, `stripe_subscription_id` for Stripe webhook lookups

### Access Patterns
1. **Get user subscription**: Query by `user_id`
2. **Stripe webhook lookup**: Query by `stripe_customer_id` or `stripe_subscription_id`
3. **Admin queries**: List all pro subscribers, expired subscriptions

### Sample Queries

```sql
-- Get user's current subscription
SELECT * FROM c WHERE c.user_id = "user_12345"

-- Get all Pro subscribers
SELECT c.user_id, c.status, c.current_period_end 
FROM c WHERE c.tier = "pro" AND c.status = "active"

-- Get subscriptions expiring soon
SELECT * FROM c 
WHERE c.tier = "pro" 
AND c.current_period_end > "2024-01-01T00:00:00Z" 
AND c.current_period_end < "2024-01-08T00:00:00Z"

-- Get past due subscriptions
SELECT * FROM c WHERE c.status = "past_due"
```

## Performance Projections

### Phase 1 (First 2 weeks)
- **Target**: 1 Pro subscriber
- **Operations**: ~100 reads/day, ~10 writes/day
- **RU/s**: 400 RU/s sufficient

### Growth Projections
- **Month 1**: 10 Pro subscribers → 1,000 operations/day
- **Month 3**: 50 Pro subscribers → 5,000 operations/day 
- **Month 6**: 200 Pro subscribers → 20,000 operations/day

### Scaling Plan
- **Auto-scale enabled**: 400 RU/s → 4,000 RU/s
- **Manual scale at 100+ subscribers**: Consider dedicated throughput
- **Monitoring**: Track RU consumption via Azure Monitor

## Security & Compliance

### Data Protection
- **PII**: Email addresses stored in Stripe, not Cosmos DB
- **Payment data**: All card data handled by Stripe (PCI compliant)
- **Encryption**: Cosmos DB encryption at rest enabled

### Access Control
- **RBAC**: Payment service has read/write access to `user_subscriptions`
- **Network**: Container-to-container communication only
- **API keys**: Stripe keys stored in Azure Key Vault

### Backup & Recovery
- **Point-in-time restore**: 30-day retention
- **Cross-region backup**: Enabled for business continuity
- **Disaster recovery**: Automatic failover configured

## Integration Points

### Stripe Webhooks
Payment service listens for these Stripe events:
- `checkout.session.completed` → Activate Pro subscription
- `invoice.payment_succeeded` → Continue active subscription  
- `invoice.payment_failed` → Mark subscription past due
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Cancel subscription

### Frontend Integration
- **Subscription check**: GET `/api/subscription/{user_id}`
- **Checkout flow**: POST `/api/create-checkout-session`
- **Cancellation**: POST `/api/cancel-subscription`
- **Billing history**: GET `/api/billing-history/{user_id}`

### Service Dependencies
- **Auth service**: User ID validation
- **Ad service**: Pro users get ad-free experience
- **Chat service**: Pro users get unlimited conversations