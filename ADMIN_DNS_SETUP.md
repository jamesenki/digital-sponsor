# Admin Service DNS Setup Guide

## Current Status

✅ **Admin Service Deployed**: `http://digitalsponsor-admin-service.centralus.azurecontainer.io:8080`
❌ **DNS Not Configured**: Not accessible via `admin.digitalsponsor.commonsolution.org`

## Required DNS Configuration

To make the admin service accessible via the proper domain structure, you need to configure DNS records.

### 1. DNS Record Configuration

Add this CNAME record to your DNS provider (Cloudflare, GoDaddy, etc.):

```dns
# Admin Service DNS Record
admin.digitalsponsor.commonsolution.org    CNAME   digitalsponsor-admin-service.centralus.azurecontainer.io
```

### 2. With Port (if port forwarding not configured)

Since Azure Container Instances expose specific ports, you may need to access via:

```
admin.digitalsponsor.commonsolution.org:8080
```

### 3. SSL/TLS Configuration

#### Option 1: Cloudflare (Recommended)
1. Set DNS record in Cloudflare
2. Enable proxy (orange cloud icon)
3. Set SSL/TLS mode to "Full" or "Full (strict)"

#### Option 2: Azure Application Gateway
```bash
# Create Application Gateway for SSL termination
az network application-gateway create \
  --name digitalsponsor-admin-gateway \
  --location centralus \
  --resource-group rg-digitalsponsor-new \
  --sku Standard_v2
```

## Admin Service Endpoints

Once DNS is configured, these URLs will be available:

### Public Access Points
- **Main Dashboard**: `https://admin.digitalsponsor.commonsolution.org/dashboard`
- **Admin Interface**: `https://admin.digitalsponsor.commonsolution.org/`
- **Health Check**: `https://admin.digitalsponsor.commonsolution.org/health`
- **API Documentation**: `https://admin.digitalsponsor.commonsolution.org/docs`

### Admin Features Available
- **System Health Monitoring** - Track all Phase 1 services
- **User Management** - Create invitations, manage roles
- **Revenue Analytics** - Monitor ad revenue and subscriptions
- **Activity Logging** - Audit trail for admin actions

## Authentication

The admin service requires proper authentication:

### Admin Key Access
- **Master Admin Key**: `DS-ADMIN-2026-BETA`
- **Admin User**: `jamesenki@digitalsponsor.ai` / `Pamala2018*`

### API Authentication
```bash
# Example: Create invitation with admin key
curl -X POST https://admin.digitalsponsor.commonsolution.org/api/admin/send-invitation \
  -H "Content-Type: application/json" \
  -d '{
    "adminKey": "DS-ADMIN-2026-BETA",
    "email": "user@example.com",
    "firstName": "New User",
    "type": "general"
  }'
```

## Integration with Main Platform

### Frontend Integration

Update the main platform (`https://digitalsponsor.commonsolution.org`) to include admin links:

```javascript
// Add to frontend configuration
const ADMIN_CONFIG = {
    adminServiceUrl: 'https://admin.digitalsponsor.commonsolution.org',
    adminDashboard: 'https://admin.digitalsponsor.commonsolution.org/dashboard'
};

// Add admin access check
function checkAdminAccess(userEmail) {
    const adminUsers = ['jamesenki@digitalsponsor.ai'];
    return adminUsers.includes(userEmail);
}

// Add admin navigation
if (checkAdminAccess(currentUser.email)) {
    addNavLink('Admin Dashboard', ADMIN_CONFIG.adminDashboard);
}
```

### Admin Navigation Button

Add to main platform interface:

```html
<!-- Admin access button (only for admin users) -->
<div id="admin-access" style="display: none;">
    <a href="https://admin.digitalsponsor.commonsolution.org/dashboard" 
       class="admin-btn" target="_blank">
        🛡️ Admin Dashboard
    </a>
</div>
```

## Testing DNS Configuration

Once DNS is configured, test the endpoints:

```bash
# Test health endpoint
curl -f https://admin.digitalsponsor.commonsolution.org/health

# Test dashboard (should return HTML)
curl -f https://admin.digitalsponsor.commonsolution.org/dashboard

# Test with port if needed
curl -f https://admin.digitalsponsor.commonsolution.org:8080/health
```

## CORS Configuration Update

The admin service needs to allow the main platform domain. Update CORS settings in the admin service:

```python
# In admin service app.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://digitalsponsor.commonsolution.org",
        "https://admin.digitalsponsor.commonsolution.org",
        "http://localhost:3000"  # For development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Security Considerations

### Production Security
- Change default admin key from `DS-ADMIN-2026-BETA`
- Use environment variables for secrets
- Enable HTTPS-only access
- Implement rate limiting
- Add IP allowlist for admin access

### Access Control
- **Admin Dashboard**: Requires admin key or admin user login
- **API Endpoints**: Require admin key in header or request body
- **System Health**: Public read-only access
- **User Management**: Admin-only access

## Complete Setup Steps

1. **Configure DNS Record**
   ```
   admin.digitalsponsor.commonsolution.org → digitalsponsor-admin-service.centralus.azurecontainer.io
   ```

2. **Wait for DNS Propagation** (5-60 minutes)

3. **Test Access**
   ```bash
   curl -f https://admin.digitalsponsor.commonsolution.org/health
   ```

4. **Update Frontend** (if needed)
   - Add admin navigation links
   - Update service URLs to use HTTPS
   - Add admin access checks

5. **Configure SSL** (via Cloudflare or Application Gateway)

6. **Update CORS Settings** (redeploy admin service with production domains)

## Current Service Status

| Service | Azure URL | Production URL | Status |
|---------|-----------|----------------|---------|
| Main Platform | N/A | `https://digitalsponsor.commonsolution.org` | ✅ Deployed |
| Admin Dashboard | `digitalsponsor-admin-service.centralus.azurecontainer.io:8080` | `https://admin.digitalsponsor.commonsolution.org` | ⏳ DNS Needed |
| Ad Service | `digitalsponsor-ad-service.centralus.azurecontainer.io:8000` | `https://ads.digitalsponsor.commonsolution.org` | ⏳ DNS Needed |
| Payment Service | `digitalsponsor-payment-service.centralus.azurecontainer.io:8001` | `https://payments.digitalsponsor.commonsolution.org` | ⏳ DNS Needed |
| Subscription Service | `digitalsponsor-subscription-service.centralus.azurecontainer.io:8002` | `https://subscriptions.digitalsponsor.commonsolution.org` | ⏳ DNS Needed |

## Next Steps

After DNS configuration:
1. Test complete admin workflow
2. Update main platform to include admin access
3. Configure proper SSL certificates
4. Update all service CORS settings
5. Test end-to-end integration

The admin service is fully functional and ready for production use once DNS is properly configured!