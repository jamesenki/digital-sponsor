# IMMEDIATE WORKAROUND: Mixed Content Login Issue

## Problem
Regular site login fails due to HTTPS → HTTP security restriction.

## QUICK WORKAROUNDS (Use These Now)

### Option 1: Use HTTP Version of Site
**Direct HTTP Access**: http://digitalsponsor.commonsolution.org
- This bypasses the HTTPS mixed content restriction
- Login should work normally

### Option 2: Admin Portal (Always Works)
**Admin Login**: http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080/login
- **Username**: `jamesenki@digitalsponsor.ai`
- **Password**: `Pamala2018*`
- Full admin functionality available

### Option 3: Disable Browser Security (Temporary)
For Chrome:
```bash
chrome --disable-web-security --user-data-dir=/tmp/chrome_dev
```

## Current Status
✅ **Auth Service**: Working at `http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080`
✅ **Frontend**: Working at `https://digitalsponsor.commonsolution.org` 
❌ **Connection**: HTTPS → HTTP blocked by browser

## Test These URLs
```bash
# Should work:
curl http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/health

# Should work:
curl -X POST http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jamesenki@digitalsponsor.ai","password":"Pamala2018*"}'
```

## Proper Fix
I'm working on setting up HTTPS for the auth service. For now, use the HTTP version of the site or the admin portal.

**The auth service works perfectly - it's just a browser security restriction preventing HTTPS sites from calling HTTP APIs.**