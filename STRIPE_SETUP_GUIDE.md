# Digital Sponsor Stripe Configuration Guide

## Overview
This guide walks you through setting up Stripe for Digital Sponsor Pro subscriptions.

## Step 1: Create Stripe Account & Get API Keys

1. **Create Stripe Account**: Visit https://dashboard.stripe.com/register
2. **Get API Keys**: Go to Developers > API keys
   - Copy your **Publishable key** (starts with `pk_test_...`)
   - Copy your **Secret key** (starts with `sk_test_...`)

## Step 2: Set Up Stripe Products

Run the setup script to create products in Stripe:

```bash
cd /home/enki/projects/digital-sponsor-investor-demo/containers/payment-service

# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_test_your_actual_key_here

# Run the setup script
python setup_stripe_products.py
```

The script will create:
- **Digital Sponsor Pro** product
- **Monthly plan**: $7.99/month 
- **Annual plan**: $79.90/year (2 months free)

## Step 3: Configure Webhook Endpoints

1. **Go to Stripe Dashboard** → Developers → Webhooks
2. **Add endpoint**: `https://digitalsponsor-payment-service.centralus.azurecontainer.io:8001/webhooks/stripe`
3. **Select events to listen for**:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. **Copy webhook signing secret** (starts with `whsec_...`)

## Step 4: Update Payment Service Configuration

After running the setup script, you'll get Price IDs. Update the payment service:

### Environment Variables for Deployment:

```bash
# Update the payment service container with these variables:
export STRIPE_SECRET_KEY=sk_test_your_actual_key_here
export STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here  
export STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Redeploy payment service with Stripe configuration
az container create \
  --resource-group rg-digitalsponsor-new \
  --name digitalsponsor-payment-service \
  --image crdigitalsponsornew.azurecr.io/digitalsponsor-payment-service:latest \
  --registry-login-server crdigitalsponsornew.azurecr.io \
  --registry-username crdigitalsponsornew \
  --registry-password $(az acr credential show --name crdigitalsponsornew --query "passwords[0].value" --output tsv) \
  --cpu 1 \
  --memory 2 \
  --ports 8001 \
  --dns-name-label digitalsponsor-payment-service \
  --location centralus \
  --os-type Linux \
  --environment-variables \
    COSMOS_ENDPOINT=https://digitalsponsor-cosmos.documents.azure.com:443/ \
    COSMOS_DATABASE=DigitalSponsor \
    FRONTEND_URL=https://digitalsponsor.commonsolution.org \
    STRIPE_SECRET_KEY=sk_test_your_actual_key_here \
    STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_key_here \
    STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### Update Price ID in Code:

You'll need to update `/home/enki/projects/digital-sponsor-investor-demo/containers/payment-service/app.py`:

```python
# Line 66 - Update with your actual price ID from setup script
price_id: str = "price_your_actual_monthly_price_id_here"  # Replace with actual ID
```

## Step 5: Test Stripe Integration

### Test Checkout Flow:

```bash
# Test payment service health (should show Stripe as connected)
curl -s http://digitalsponsor-payment-service.centralus.azurecontainer.io:8001/health

# Test checkout session creation
curl -X POST http://digitalsponsor-payment-service.centralus.azurecontainer.io:8001/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user_123",
    "email": "test@example.com",
    "tier": "pro"
  }'
```

### Test Cards (use in Stripe test mode):
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **Requires authentication**: `4000002500003155`

## Step 6: Frontend Integration

The frontend will need the Stripe publishable key for client-side checkout:

```javascript
// Add to public/index.html or your frontend config
const STRIPE_PUBLISHABLE_KEY = 'pk_test_your_actual_key_here';

// The AdManager and subscription flow will use this for payment
```

## Step 7: DNS Configuration (Next Step)

Once Stripe is configured, you'll update DNS to point to the new services:

```
digitalsponsor-ads.commonsolution.org → digitalsponsor-ad-service.centralus.azurecontainer.io
digitalsponsor-payments.commonsolution.org → digitalsponsor-payment-service.centralus.azurecontainer.io  
digitalsponsor-subscriptions.commonsolution.org → digitalsponsor-subscription-service.centralus.azurecontainer.io
```

## Production Checklist

### Security:
- [ ] Switch to live API keys (`sk_live_...` and `pk_live_...`)
- [ ] Update webhook endpoint URLs to production domains
- [ ] Enable Stripe's security features (Radar, etc.)
- [ ] Set up proper logging and monitoring

### Business:
- [ ] Complete Stripe account verification
- [ ] Set up bank account for payouts
- [ ] Configure tax settings
- [ ] Review pricing and terms

### Technical:
- [ ] Test all webhook events in production
- [ ] Monitor payment success rates
- [ ] Set up failure handling and retry logic
- [ ] Configure email notifications for failed payments

## Expected Revenue Model

With Stripe configured:
- **Pro subscriptions**: $7.99/month or $79.90/year
- **Stripe fees**: 2.9% + 30¢ per transaction
- **Net revenue**: ~$7.74 per monthly subscription
- **Break-even**: ~13 subscribers to cover infrastructure costs

## Support and Testing

### Test Scenarios:
1. **Successful subscription**: Use test card 4242424242424242
2. **Failed payment**: Use test card 4000000000000002
3. **Subscription cancellation**: Test via customer portal
4. **Webhook delivery**: Verify events arrive at endpoint
5. **Refunds**: Test refund processing

### Monitoring:
- Stripe Dashboard for payment monitoring
- Azure logs for service health
- Customer subscription status in Cosmos DB

This configuration enables the complete Pro subscription flow with Stripe handling all payment processing securely.