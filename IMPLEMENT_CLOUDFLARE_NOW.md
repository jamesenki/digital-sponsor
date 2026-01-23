# IMMEDIATE CLOUDFLARE IMPLEMENTATION REQUIRED

## Problem
You're getting "ERR_CONNECTION_TIMED_OUT" because the DNS is pointing to containers that only work with port numbers, but browsers expect standard ports 80/443.

## REQUIRED ACTIONS (Do These Now)

### 1. Login to Cloudflare Dashboard
Go to: https://dash.cloudflare.com/

### 2. Select the commonsolution.org domain

### 3. Go to DNS → Records

### 4. ADD/UPDATE these CNAME records:

**IMPORTANT**: Make sure "Proxy status" is ON (orange cloud ☁️) for each record

| Type  | Name                     | Target                                                      | Proxy Status |
|-------|--------------------------|-------------------------------------------------------------|--------------|
| CNAME | admin.digitalsponsor     | digitalsponsor-admin-service.centralus.azurecontainer.io   | ☁️ Proxied   |
| CNAME | ads.digitalsponsor       | digitalsponsor-ad-service.centralus.azurecontainer.io      | ☁️ Proxied   |
| CNAME | payments.digitalsponsor  | digitalsponsor-payment-service.centralus.azurecontainer.io | ☁️ Proxied   |
| CNAME | subscriptions.digitalsponsor | digitalsponsor-subscription-service.centralus.azurecontainer.io | ☁️ Proxied |

### 5. Configure SSL Settings
1. Go to SSL/TLS → Overview
2. Set encryption mode to: **"Flexible"**
   - This allows HTTPS frontend → HTTP backend
   - Perfect for your container setup

### 6. Test the URLs
After DNS propagation (1-5 minutes), these will work:

- ✅ https://admin.digitalsponsor.commonsolution.org/dashboard
- ✅ https://admin.digitalsponsor.commonsolution.org/health
- ✅ https://ads.digitalsponsor.commonsolution.org/health
- ✅ https://payments.digitalsponsor.commonsolution.org/health
- ✅ https://subscriptions.digitalsponsor.commonsolution.org/health

## Why This Fixes Your Issue

**Current Problem**:
- DNS points to containers on custom ports (8080, 8000, 8001, 8002)
- Browsers try standard ports (80, 443)
- Nothing listens on standard ports → timeout

**Cloudflare Solution**:
- Cloudflare receives requests on ports 80/443
- Cloudflare forwards to containers on correct ports (8080, 8000, etc.)
- SSL termination handled by Cloudflare
- Zero changes needed to your containers

## Current Container Status
```bash
# These are working but only on custom ports:
curl http://admin.digitalsponsor.commonsolution.org:8080/health      # ✅ Works
curl http://ads.digitalsponsor.commonsolution.org:8000/health        # ✅ Works
curl http://payments.digitalsponsor.commonsolution.org:8001/health   # ✅ Works

# These will work after Cloudflare setup:
curl https://admin.digitalsponsor.commonsolution.org/health          # ✅ Will work
curl https://ads.digitalsponsor.commonsolution.org/health            # ✅ Will work
```

## DO THIS NOW
The Cloudflare setup takes 2 minutes and immediately fixes your SSL + port issues. Your containers don't need any changes.