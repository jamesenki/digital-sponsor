# Browser Access Fix for ERR_SSL_PROTOCOL_ERROR

## Problem
Browser shows: "admin.digitalsponsor.commonsolution.org sent an invalid response. ERR_SSL_PROTOCOL_ERROR"

## Root Cause
Your browser is automatically forcing HTTPS but the service only supports HTTP.

## Solution: Force HTTP Access

### Method 1: Direct Browser Override

1. **Type EXACTLY in browser address bar:**
   ```
   http://admin.digitalsponsor.commonsolution.org:8080/dashboard
   ```

2. **Important**: Make sure you type `http://` NOT `https://`

3. **Press Enter** - browser should load the page

### Method 2: Clear Browser HTTPS Cache

#### Chrome:
1. Go to `chrome://net-internals/#hsts`
2. Scroll to "Delete domain security policies"
3. Enter: `admin.digitalsponsor.commonsolution.org`
4. Click "Delete"
5. Try the HTTP URL again

#### Firefox:
1. Go to `about:config`
2. Search for `security.tls.insecure_fallback_hosts`
3. Add: `admin.digitalsponsor.commonsolution.org`
4. Try the HTTP URL again

#### Edge:
1. Clear browsing data (Ctrl+Shift+Delete)
2. Check "Cookies and other site data"
3. Click "Clear now"
4. Try the HTTP URL again

### Method 3: Use Different Browser
Try accessing in an incognito/private window or different browser that hasn't cached HTTPS preferences.

### Method 4: Access via IP (Temporary)
```
http://172.168.67.140:8080/dashboard
```

## Working URLs (Copy Exactly)

| Service | Direct HTTP URL |
|---------|----------------|
| **Admin Dashboard** | `http://admin.digitalsponsor.commonsolution.org:8080/dashboard` |
| **Admin Root** | `http://admin.digitalsponsor.commonsolution.org:8080/` |
| **Admin Health** | `http://admin.digitalsponsor.commonsolution.org:8080/health` |
| **Admin API Docs** | `http://admin.digitalsponsor.commonsolution.org:8080/docs` |

## If Still Having Issues

### Option 1: Use Azure Container URL Directly
```
http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080/dashboard
```

### Option 2: Use IP Address Directly  
```
http://172.168.67.140:8080/dashboard
```

## Browser Security Warning
When you access HTTP sites, the browser will show:
- 🔓 "Not Secure" in address bar
- This is NORMAL for development sites
- Click "Advanced" → "Proceed" if prompted

## Test Commands (to verify service is working)
```bash
# Test from command line - should work
curl http://admin.digitalsponsor.commonsolution.org:8080/health

# Test dashboard HTML
curl http://admin.digitalsponsor.commonsolution.org:8080/dashboard
```

The service is running fine - this is just a browser HTTPS enforcement issue!