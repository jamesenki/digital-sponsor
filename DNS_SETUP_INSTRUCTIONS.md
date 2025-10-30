# 🌐 DNS Setup Instructions for commonsolution.org

## 📋 Required DNS Records

You need to add these DNS records to your domain provider (wherever you purchased commonsolution.org):

### 1. Frontend Website
```
Type: CNAME
Name: digitalsponsor
Value: thankful-wave-077e2130f.3.azurestaticapps.net
TTL: 300
```

### 2. Backend API (Optional)
```
Type: CNAME  
Name: api
Value: ca-digitalsponsor-backend.redforest-46b07d26.eastus2.azurecontainerapps.io
TTL: 300
```

### 3. Root Domain (Optional)
```
Type: CNAME
Name: @
Value: thankful-wave-077e2130f.3.azurestaticapps.net
TTL: 300
```

## 🔧 How to Add DNS Records

### If using Cloudflare:
1. Go to https://dash.cloudflare.com
2. Select your domain: `commonsolution.org`
3. Go to DNS > Records
4. Click "Add record"
5. Add each record above

### If using other providers:
- **GoDaddy**: Domain Manager > DNS > Add Record
- **Namecheap**: Domain List > Manage > Advanced DNS
- **Google Domains**: DNS > Custom Records

## ⏰ Timeline
- **DNS Propagation**: 5-48 hours
- **SSL Certificate**: Automatic after DNS is live
- **Email Setup**: Can be done immediately with Cloudflare

## 🧪 Testing
After adding DNS records, test with:
```bash
nslookup digitalsponsor.commonsolution.org
```

## 📧 Email Setup (Next Step)
Once DNS is configured, we'll set up:
- `admin@commonsolution.org` → `jamessimonster@gmail.com`

## ✅ Current Working URLs
- **Backend**: https://ca-digitalsponsor-backend.redforest-46b07d26.eastus2.azurecontainerapps.io
- **Frontend**: https://thankful-wave-077e2130f.3.azurestaticapps.net
- **Target**: https://digitalsponsor.commonsolution.org (after DNS)