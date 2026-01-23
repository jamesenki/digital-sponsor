# Digital Sponsor DNS Configuration

## Overview
Configure DNS routing to connect the frontend to the new Phase 1 monetization services.

## Current Service Endpoints

### Deployed Services:
| Service | URL | Status | Port |
|---------|-----|---------|------|
| Ad Service | `http://digitalsponsor-ad-service.centralus.azurecontainer.io:8000` | ✅ Running | 8000 |
| Payment Service | `http://digitalsponsor-payment-service.centralus.azurecontainer.io:8001` | ⚠️ Needs Stripe keys | 8001 |
| Subscription Service | `http://digitalsponsor-subscription-service.centralus.azurecontainer.io:8002` | ✅ Running | 8002 |
| Admin Service | `http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080` | ✅ Running | 8080 |

### Service Health Status:

```bash
# Ad Service
curl -s http://digitalsponsor-ad-service.centralus.azurecontainer.io:8000/health

# Subscription Service  
curl -s http://digitalsponsor-subscription-service.centralus.azurecontainer.io:8002/health

# Payment Service (needs Stripe keys to work fully)
curl -s http://digitalsponsor-payment-service.centralus.azurecontainer.io:8001/health

# Admin Service
curl -s http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080/health
```

## DNS Configuration Options

### Option 1: Subdomain Routing (Recommended)

Add these CNAME records to your `commonsolution.org` DNS:

```dns
# Ad Service
ads.digitalsponsor.commonsolution.org    CNAME   digitalsponsor-ad-service.centralus.azurecontainer.io

# Payment Service  
payments.digitalsponsor.commonsolution.org    CNAME   digitalsponsor-payment-service.centralus.azurecontainer.io

# Subscription Service
subscriptions.digitalsponsor.commonsolution.org    CNAME   digitalsponsor-subscription-service.centralus.azurecontainer.io

# Admin Service
admin.digitalsponsor.commonsolution.org    CNAME   digitalsponsor-admin-service.centralus.azurecontainer.io
```

### Option 2: Path-based Routing via Application Gateway

Create an Azure Application Gateway to route traffic:

```bash
# Create Application Gateway for path-based routing
az network application-gateway create \
  --name digitalsponsor-gateway \
  --location centralus \
  --resource-group rg-digitalsponsor-new \
  --sku Standard_v2 \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --public-ip-address digitalsponsor-gateway-ip
```

## Frontend Configuration Updates

### Update public/index.html:

```javascript
// Update AdManager configuration to use production endpoints
class AdManager {
    constructor(config = {}) {
        this.config = {
            adServiceUrl: 'https://ads.digitalsponsor.commonsolution.org',
            paymentServiceUrl: 'https://payments.digitalsponsor.commonsolution.org',
            subscriptionServiceUrl: 'https://subscriptions.digitalsponsor.commonsolution.org',
            adminServiceUrl: 'https://admin.digitalsponsor.commonsolution.org',
            ...config
        };
    }
}

// Update existing service URLs
const CONFIG = {
    adServiceUrl: 'https://ads.digitalsponsor.commonsolution.org',
    paymentServiceUrl: 'https://payments.digitalsponsor.commonsolution.org', 
    subscriptionServiceUrl: 'https://subscriptions.digitalsponsor.commonsolution.org',
    adminServiceUrl: 'https://admin.digitalsponsor.commonsolution.org'
};
```

### Update API Endpoints in Frontend:

1. **Ad Requests**: Change from development to production URLs
2. **Payment Processing**: Update Stripe checkout integration  
3. **Subscription Management**: Update tier checking and usage tracking

## SSL/TLS Configuration

Since the services are deployed to Azure Container Instances, you'll need to handle SSL termination:

### Option 1: Azure Application Gateway with SSL

```bash
# Upload SSL certificate for commonsolution.org
az network application-gateway ssl-cert create \
  --gateway-name digitalsponsor-gateway \
  --resource-group rg-digitalsponsor-new \
  --name commonsolution-ssl \
  --cert-file /path/to/commonsolution.org.crt \
  --cert-password "your-cert-password"
```

### Option 2: Cloudflare SSL (Recommended)

If you're using Cloudflare for DNS:
1. Enable Cloudflare proxy (orange cloud) for subdomain records
2. Set SSL/TLS encryption mode to "Full" or "Full (strict)"
3. Cloudflare handles SSL termination automatically

## CORS Configuration Updates

Update CORS settings in each service to allow frontend domain:

### Ad Service (`app.py`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://digitalsponsor.commonsolution.org",
        "https://ads.digitalsponsor.commonsolution.org"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Payment Service:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://digitalsponsor.commonsolution.org",
        "https://payments.digitalsponsor.commonsolution.org"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Subscription Service:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://digitalsponsor.commonsolution.org",
        "https://subscriptions.digitalsponsor.commonsolution.org"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Implementation Steps

### Step 1: Configure DNS Records

Add the CNAME records to your DNS provider (Cloudflare, GoDaddy, etc.):

```
ads.digitalsponsor.commonsolution.org → digitalsponsor-ad-service.centralus.azurecontainer.io
payments.digitalsponsor.commonsolution.org → digitalsponsor-payment-service.centralus.azurecontainer.io  
subscriptions.digitalsponsor.commonsolution.org → digitalsponsor-subscription-service.centralus.azurecontainer.io
admin.digitalsponsor.commonsolution.org → digitalsponsor-admin-service.centralus.azurecontainer.io
```

### Step 2: Update Frontend Configuration

Modify `public/index.html` to use production service URLs:

```javascript
// Replace development URLs with production URLs
const PRODUCTION_CONFIG = {
    adServiceUrl: 'https://ads.digitalsponsor.commonsolution.org',
    paymentServiceUrl: 'https://payments.digitalsponsor.commonsolution.org',
    subscriptionServiceUrl: 'https://subscriptions.digitalsponsor.commonsolution.org',
    adminServiceUrl: 'https://admin.digitalsponsor.commonsolution.org',
    stripePublishableKey: 'pk_test_your_stripe_key_here'
};
```

### Step 3: Update Service CORS Settings

Redeploy services with updated CORS configuration to allow the frontend domain.

### Step 4: Test End-to-End Flow

```bash
# Test ad service via DNS
curl -s https://ads.digitalsponsor.commonsolution.org/health

# Test subscription service via DNS
curl -s https://subscriptions.digitalsponsor.commonsolution.org/health

# Test payment service via DNS (after Stripe setup)
curl -s https://payments.digitalsponsor.commonsolution.org/health

# Test admin service via DNS
curl -s https://admin.digitalsponsor.commonsolution.org/health
```

## Port Configuration Notes

**Important**: Azure Container Instances expose specific ports. You may need to:

1. **Configure Application Gateway** to handle port forwarding
2. **Use reverse proxy** (nginx) in front of services
3. **Update DNS to include ports** if direct access needed

### Current Port Mappings:
- Ad Service: Port 8000
- Payment Service: Port 8001  
- Subscription Service: Port 8002
- Admin Service: Port 8080

### DNS with Ports (if needed):
```
ads.digitalsponsor.commonsolution.org:8000
payments.digitalsponsor.commonsolution.org:8001
subscriptions.digitalsponsor.commonsolution.org:8002
admin.digitalsponsor.commonsolution.org:8080
```

## Monitoring and Health Checks

Set up monitoring for the new service endpoints:

```bash
#!/bin/bash
# Health check script
echo "Checking Digital Sponsor services..."

echo "Ad Service:"
curl -s https://ads.digitalsponsor.commonsolution.org/health | jq .status

echo "Subscription Service:"
curl -s https://subscriptions.digitalsponsor.commonsolution.org/health | jq .status

echo "Payment Service:"
curl -s https://payments.digitalsponsor.commonsolution.org/health | jq .status

echo "Admin Service:"
curl -s https://admin.digitalsponsor.commonsolution.org/health | jq .status
```

## Production Readiness Checklist

- [ ] DNS records configured and propagated
- [ ] SSL certificates installed and working
- [ ] CORS settings updated for production domains
- [ ] Frontend URLs updated to production endpoints
- [ ] Health checks passing on all services
- [ ] Stripe webhook endpoints updated with production URLs
- [ ] Load testing completed on new infrastructure
- [ ] Monitoring and alerting configured

## Next Steps

After DNS configuration:
1. **Test complete user flow**: Registration → Ad display → Pro upgrade
2. **Verify Stripe integration**: Test checkout → webhook → subscription activation
3. **Monitor performance**: Check response times and error rates
4. **User acceptance testing**: Get feedback on new monetization features

This configuration enables the complete Digital Sponsor Phase 1 monetization system with proper DNS routing and SSL security.