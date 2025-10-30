# 🚀 GitHub Actions Deployment Setup

## 📋 Files Created for Automatic Deployment

✅ **GitHub Workflow**: `.github/workflows/azure-static-web-apps.yml`
✅ **Static Web App Config**: `public/staticwebapp.config.json`  
✅ **Environment Variables**: Configured for production build

## 🔧 Setup Steps

### 1. Create GitHub Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial Digital Sponsor deployment"

# Create repository on GitHub (replace with your username)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/digital-sponsor-investor-demo.git
git branch -M main
git push -u origin main
```

### 2. Add GitHub Secret
Go to your GitHub repository → Settings → Secrets and variables → Actions

**Add Repository Secret:**
- **Name**: `AZURE_STATIC_WEB_APPS_API_TOKEN_THANKFUL_WAVE_077E2130F`  
- **Value**: `5ed54739226f8268a0475cccb2f55de67db8028184b31e9c5f4bcaa60fade7a303-cc97a4ab-ba7d-46f5-be6a-32ef536cee3900f2723077e2130f`

### 3. Trigger Deployment
Once you push to the `main` branch, GitHub Actions will automatically:

1. ✅ Setup Node.js 18
2. ✅ Install dependencies (`npm ci`)
3. ✅ Build React app with production environment variables
4. ✅ Deploy to Azure Static Web Apps
5. ✅ Configure API proxy to backend

## 🎯 Expected Result

After successful deployment:
- **Frontend**: https://digitalsponsor.commonsolution.org (React app)
- **Backend**: https://ca-digitalsponsor-backend.redforest-46b07d26.eastus2.azurecontainerapps.io  
- **API Proxy**: https://digitalsponsor.commonsolution.org/api/* → Backend

## 🔍 Monitoring Deployment

1. **GitHub Actions**: Repository → Actions tab
2. **Azure Portal**: Static Web Apps → Deployment History
3. **Live Site**: https://digitalsponsor.commonsolution.org

## ⚡ Quick Commands

```bash
# Check if git is initialized
git status

# Add all changes and commit
git add .
git commit -m "Deploy Digital Sponsor with GitHub Actions"

# Push to trigger deployment
git push origin main
```

## 🛠 Troubleshooting

**If deployment fails:**
1. Check GitHub Actions logs in repository
2. Verify the secret name matches exactly
3. Ensure `package.json` has correct build script
4. Check Azure Static Web App logs in portal

**Build Configuration:**
- **App Location**: `/` (root directory)
- **Output Location**: `dist` (Vite build output)
- **API Location**: Empty (using external backend)

## 📦 What's Configured

**Environment Variables (Production):**
```
REACT_APP_API_URL=https://ca-digitalsponsor-backend.redforest-46b07d26.eastus2.azurecontainerapps.io
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Digital Sponsor
REACT_APP_DOMAIN=digitalsponsor.commonsolution.org
GENERATE_SOURCEMAP=false
```

**API Proxy Configuration:**
- All `/api/*` requests → Backend Container App
- SPA routing with index.html fallback
- Security headers configured
- CORS enabled for backend domain

🎉 **Your Digital Sponsor platform will be fully deployed with one git push!**