# Frontend Update Required for Login Fix

## Problem
The frontend is hardcoded to use:
```javascript
http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080
```

But it needs to use:
```javascript
https://auth.commonsolution.org
```

## Evidence
From frontend source: `http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080',`

## What's Working
✅ **HTTPS Auth Service**: `https://auth.commonsolution.org/api/auth/login`
✅ **CORS Headers**: Properly configured for `https://digitalsponsor.commonsolution.org`
✅ **SSL Certificate**: Self-signed but functional
✅ **Login API**: Returns correct user data and session tokens

## What's Broken
❌ **Frontend Configuration**: Still points to HTTP auth service
❌ **Mixed Content**: Browser blocks HTTPS → HTTP requests

## Solution Options

### Option 1: Update Frontend Code (Recommended)
Update the frontend to use:
```javascript
const AUTH_URL = 'https://auth.commonsolution.org';
```

### Option 2: Proxy the Old URL (Workaround)
Deploy another proxy at the old URL that redirects to HTTPS.

### Option 3: Browser Override (Testing Only)
```bash
chrome --disable-web-security --user-data-dir=/tmp/chrome_dev
```

## Current Working Login
**Admin Portal**: http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080/login
- Same credentials work perfectly
- Full admin functionality

## Test Commands
```bash
# This works (new HTTPS auth):
curl -k -X POST https://auth.commonsolution.org/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://digitalsponsor.commonsolution.org" \
  -d '{"email":"jamesenki@digitalsponsor.ai","password":"Pamala2018*"}'

# This fails (old HTTP auth from HTTPS page):
curl -X POST http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://digitalsponsor.commonsolution.org" \
  -d '{"email":"jamesenki@digitalsponsor.ai","password":"Pamala2018*"}'
```

The backend is perfect - just need to update the frontend to use the new HTTPS auth URL.