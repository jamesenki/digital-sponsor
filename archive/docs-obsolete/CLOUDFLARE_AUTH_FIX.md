# IMMEDIATE FIX NEEDED: Mixed Content Error

## Problem
Frontend login fails because:
- **Frontend**: https://digitalsponsor.commonsolution.org (HTTPS)
- **Auth Service**: http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080 (HTTP)
- **Browser blocks HTTP requests from HTTPS pages**

## SOLUTION: Add Cloudflare HTTPS for Auth Service

### Required Action (Do This Now)

1. **Login to Cloudflare Dashboard**: https://dash.cloudflare.com/
2. **Go to DNS → Records for commonsolution.org**  
3. **Add this CNAME record**:

| Type  | Name        | Target                                               | Proxy Status |
|-------|-------------|------------------------------------------------------|--------------|
| CNAME | auth        | digitalsponsor-auth-prod.centralus.azurecontainer.io | ☁️ Proxied   |

4. **Update Frontend Configuration**

After DNS propagation, the frontend needs to be updated to use:
- **Old**: `http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080`
- **New**: `https://auth.commonsolution.org`

## Why This Fixes Everything
- ✅ Frontend (HTTPS) → Auth Service (HTTPS) = **ALLOWED**
- ✅ Cloudflare handles SSL termination
- ✅ No port numbers needed
- ✅ Standard HTTPS URLs

## Test After Setup
```bash
# This should work after Cloudflare setup:
curl https://auth.commonsolution.org/health

# This should also work:
curl -X POST https://auth.commonsolution.org/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jamesenki@digitalsponsor.ai","password":"Pamala2018*"}'
```

## Current Working Services
While you set up Cloudflare, these still work:
- ✅ **Admin Login**: http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080/login
- ✅ **Auth Service (direct)**: http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/health
- ✅ **Main Frontend**: https://digitalsponsor.commonsolution.org (login will work after Cloudflare)

The Mixed Content error is a security feature - we need HTTPS on both ends.