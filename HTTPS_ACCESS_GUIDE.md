# HTTPS Access Issue Resolution

## Problem
Browser shows "This site can't provide a secure connection" when accessing admin dashboard.

## Root Cause
The services are deployed on Azure Container Instances with HTTP only (no SSL/TLS certificates configured).

## Quick Solution: Use HTTP URLs

**Access the services via HTTP (not HTTPS):**

### 🛡️ Admin Dashboard
- **URL**: `http://admin.digitalsponsor.commonsolution.org:8080/dashboard`
- **API Docs**: `http://admin.digitalsponsor.commonsolution.org:8080/docs`
- **Health**: `http://admin.digitalsponsor.commonsolution.org:8080/health`

### 📊 Other Services
- **Ad Service**: `http://ads.digitalsponsor.commonsolution.org:8000/health`
- **Subscription Service**: `http://subscriptions.digitalsponsor.commonsolution.org:8002/health`
- **Payment Service**: `http://payments.digitalsponsor.commonsolution.org:8001/health`

## Browser Security Notice
Most modern browsers will show a "Not Secure" warning for HTTP sites. This is normal for development environments.

### To Access HTTP Sites:
1. **Copy the exact HTTP URL** (not HTTPS)
2. **Paste into browser address bar**
3. **Press Enter** - browser will load the HTTP version

## Production HTTPS Setup (Optional)

If you need HTTPS for production, here are the options:

### Option 1: Azure Application Gateway (Recommended)
```bash
# Create Application Gateway with SSL termination
az network application-gateway create \
  --name digitalsponsor-gateway \
  --location centralus \
  --resource-group rg-digitalsponsor-new \
  --sku Standard_v2 \
  --public-ip-address digitalsponsor-gateway-ip \
  --vnet-name digitalsponsor-vnet \
  --subnet digitalsponsor-gateway-subnet
```

### Option 2: Cloudflare SSL Proxy
1. Point DNS to Cloudflare
2. Enable "Orange Cloud" proxy
3. Set SSL mode to "Flexible" or "Full"
4. Cloudflare handles SSL termination

### Option 3: Container Instance SSL (Complex)
- Requires custom SSL certificates
- Need to configure nginx reverse proxy
- More complex container setup

## Current Working URLs (Use These)

| Service | Working HTTP URL |
|---------|-----------------|
| **Admin Dashboard** | `http://admin.digitalsponsor.commonsolution.org:8080/dashboard` |
| **Admin API** | `http://admin.digitalsponsor.commonsolution.org:8080/docs` |
| **Ad Service** | `http://ads.digitalsponsor.commonsolution.org:8000/health` |
| **Subscription Service** | `http://subscriptions.digitalsponsor.commonsolution.org:8002/health` |
| **Payment Service** | `http://payments.digitalsponsor.commonsolution.org:8001/health` |

## Testing Commands

```bash
# Test admin service
curl -f http://admin.digitalsponsor.commonsolution.org:8080/health

# Test admin dashboard (should return HTML)
curl -s http://admin.digitalsponsor.commonsolution.org:8080/dashboard | head -5

# Test ad service
curl -f http://ads.digitalsponsor.commonsolution.org:8000/health

# Test subscription service  
curl -f http://subscriptions.digitalsponsor.commonsolution.org:8002/health
```

## Admin Authentication
- **Admin Key**: `DS-ADMIN-2026-BETA`
- **Admin User**: `jamesenki@digitalsponsor.ai` / `Pamala2018*`
- **Master Dashboard**: Access at HTTP URL above

The admin interface is fully functional via HTTP - HTTPS is optional for this development phase.