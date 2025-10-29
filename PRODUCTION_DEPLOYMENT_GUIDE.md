# Digital Sponsor - Production Deployment Guide

## 🚀 **Complete Azure Migration & Deployment Strategy**

### **Executive Summary**

This guide outlines the complete migration of Digital Sponsor from development to production Azure environment, optimized for cost-efficiency, performance, resilience, and mobile app support with integrated monetization.

**Timeline**: 5 weeks to full production  
**Estimated Cost**: $93-200/month (scales with usage)  
**Revenue Target**: $25k year 1, $75k year 2  
**Mobile Support**: iOS, Android, PWA  

## 📋 **Pre-Deployment Checklist**

### **Infrastructure Prerequisites**

```bash
# Azure CLI Setup
az login
az account set --subscription "your-subscription-id"
az group create --name rg-digitalsponsor-prod-eastus2 --location eastus2

# Required Azure Services
✅ Azure Container Registry
✅ Static Web Apps
✅ Container Apps Environment  
✅ PostgreSQL Flexible Server
✅ Redis Cache
✅ Front Door + CDN
✅ Key Vault
✅ Application Insights
✅ Storage Account
```

### **Domain & DNS Setup**

```dns
# Purchase domain: digitalsponsor.org
# Configure DNS records:
@               A       [Azure Front Door IP]
www             CNAME   digitalsponsor.org
api             CNAME   ca-digitalsponsor-backend.azurecontainerapps.io
mobile          CNAME   ca-digitalsponsor-backend.azurecontainerapps.io
cdn             CNAME   digitalsponsor.azurefd.net

# Security records
@               TXT     "v=spf1 include:spf.protection.outlook.com -all"
_dmarc          TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@digitalsponsor.org"
```

### **Third-Party Service Setup**

```typescript
// Required API Keys & Services
interface RequiredServices {
  stripe: {
    publishableKey: string,
    secretKey: string,
    webhookSecret: string
  },
  googleAds: {
    clientId: string,
    adUnitId: string
  },
  applicationInsights: {
    connectionString: string
  },
  sendGrid: {
    apiKey: string // For transactional emails
  }
}
```

## 🏗️ **Infrastructure Deployment**

### **Azure Bicep Templates**

```bicep
// main.bicep - Infrastructure as Code
param location string = 'eastus2'
param environmentName string = 'prod'
param appName string = 'digitalsponsor'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: 'rg-${appName}-${environmentName}-${location}'
  location: location
}

// Container Apps Environment
resource containerEnv 'Microsoft.App/managedEnvironments@2022-10-01' = {
  name: 'env-${appName}-${environmentName}'
  location: location
  properties: {
    vnetConfiguration: {
      internal: false
    }
  }
}

// PostgreSQL Flexible Server
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2022-12-01' = {
  name: 'psql-${appName}-${environmentName}'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: 'dbadmin'
    administratorLoginPassword: '@Microsoft.KeyVault(VaultName=${keyVault.name};SecretName=postgres-password)'
    version: '14'
    storage: {
      storageSizeGB: 32
    }
  }
}

// Redis Cache
resource redis 'Microsoft.Cache/Redis@2022-06-01' = {
  name: 'redis-${appName}-${environmentName}'
  location: location
  properties: {
    sku: {
      name: 'Basic'
      family: 'C'
      capacity: 0
    }
    enableNonSslPort: false
  }
}

// Key Vault
resource keyVault 'Microsoft.KeyVault/vaults@2022-07-01' = {
  name: 'kv-${appName}-${environmentName}'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
  }
}

// Static Web App (Frontend)
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: 'swa-${appName}-${environmentName}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    repositoryUrl: 'https://github.com/your-org/digital-sponsor'
    branch: 'main'
    buildProperties: {
      appLocation: '/frontend'
      outputLocation: 'dist'
    }
  }
}

// Container App (Backend API)
resource containerAppBackend 'Microsoft.App/containerApps@2022-10-01' = {
  name: 'ca-${appName}-backend-${environmentName}'
  location: location
  properties: {
    managedEnvironmentId: containerEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        allowInsecure: false
      }
      secrets: [
        {
          name: 'database-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/database-url'
        }
        {
          name: 'redis-url'
          keyVaultUrl: '${keyVault.properties.vaultUri}secrets/redis-url'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'backend-api'
          image: 'digitalsponsor.azurecr.io/backend:latest'
          resources: {
            cpu: '0.5'
            memory: '1Gi'
          }
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'REDIS_URL'
              secretRef: 'redis-url'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 10
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '70'
              }
            }
          }
        ]
      }
    }
  }
}

// Front Door CDN
resource frontDoor 'Microsoft.Cdn/profiles@2021-06-01' = {
  name: 'fd-${appName}-${environmentName}'
  location: 'global'
  sku: {
    name: 'Standard_AzureFrontDoor'
  }
}
```

### **Deployment Script**

```bash
#!/bin/bash
# deploy.sh - Complete Azure deployment

set -e

RESOURCE_GROUP="rg-digitalsponsor-prod-eastus2"
LOCATION="eastus2"
ENVIRONMENT="prod"

echo "🚀 Starting Digital Sponsor production deployment..."

# 1. Deploy infrastructure
echo "📦 Deploying Azure infrastructure..."
az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file infrastructure/main.bicep \
  --parameters environmentName=$ENVIRONMENT

# 2. Build and push container images
echo "🐳 Building and pushing container images..."
ACR_NAME="digitalsponsor${ENVIRONMENT}"
az acr build --registry $ACR_NAME --image backend:latest ./backend
az acr build --registry $ACR_NAME --image frontend:latest ./frontend

# 3. Update container app
echo "📱 Updating container app..."
az containerapp update \
  --name ca-digitalsponsor-backend-prod \
  --resource-group $RESOURCE_GROUP \
  --image ${ACR_NAME}.azurecr.io/backend:latest

# 4. Deploy frontend
echo "🌐 Deploying frontend to Static Web Apps..."
az staticwebapp deploy \
  --name swa-digitalsponsor-prod \
  --resource-group $RESOURCE_GROUP \
  --source ./frontend/dist

# 5. Configure custom domain
echo "🌍 Configuring custom domain..."
az staticwebapp hostname set \
  --name swa-digitalsponsor-prod \
  --resource-group $RESOURCE_GROUP \
  --hostname digitalsponsor.org

# 6. Update DNS records
echo "📡 Updating DNS records..."
# This would be done through your DNS provider

echo "✅ Deployment complete!"
echo "🌐 Frontend: https://digitalsponsor.org"
echo "🔗 API: https://api.digitalsponsor.org"
echo "📊 Monitoring: https://portal.azure.com"
```

## 🔄 **CI/CD Pipeline Configuration**

### **GitHub Actions Workflow**

```yaml
# .github/workflows/production-deploy.yml
name: Production Deployment

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
  AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        npm ci
        cd frontend && npm ci
        cd ../backend && npm ci
        
    - name: Run tests
      run: |
        npm run test:frontend
        npm run test:backend
        npm run test:integration
        
    - name: Security audit
      run: |
        npm audit --audit-level=high
        cd frontend && npm audit --audit-level=high
        cd ../backend && npm audit --audit-level=high
        
    - name: Code quality checks
      run: |
        npm run lint
        npm run type-check

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Build frontend
      run: |
        cd frontend
        npm ci
        npm run build
        
    - name: Upload frontend artifacts
      uses: actions/upload-artifact@v4
      with:
        name: frontend-dist
        path: frontend/dist/
        
    - name: Build backend Docker image
      run: |
        docker build -t digitalsponsor/backend:${{ github.sha }} ./backend
        
    - name: Save Docker image
      run: |
        docker save digitalsponsor/backend:${{ github.sha }} | gzip > backend-image.tar.gz
        
    - name: Upload backend image
      uses: actions/upload-artifact@v4
      with:
        name: backend-image
        path: backend-image.tar.gz

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
    - uses: actions/checkout@v4
    
    - name: Azure Login
      uses: azure/login@v1
      with:
        client-id: ${{ env.AZURE_CLIENT_ID }}
        tenant-id: ${{ env.AZURE_TENANT_ID }}
        subscription-id: ${{ env.AZURE_SUBSCRIPTION_ID }}
        
    - name: Download artifacts
      uses: actions/download-artifact@v4
      
    - name: Load and push Docker image
      run: |
        gunzip -c backend-image/backend-image.tar.gz | docker load
        docker tag digitalsponsor/backend:${{ github.sha }} digitalsponsor.azurecr.io/backend:${{ github.sha }}
        docker tag digitalsponsor/backend:${{ github.sha }} digitalsponsor.azurecr.io/backend:latest
        
        az acr login --name digitalsponsor
        docker push digitalsponsor.azurecr.io/backend:${{ github.sha }}
        docker push digitalsponsor.azurecr.io/backend:latest
        
    - name: Update Container App
      run: |
        az containerapp update \
          --name ca-digitalsponsor-backend-prod \
          --resource-group rg-digitalsponsor-prod-eastus2 \
          --image digitalsponsor.azurecr.io/backend:${{ github.sha }}
          
    - name: Deploy Static Web App
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "frontend-dist"
        
    - name: Run smoke tests
      run: |
        npm run test:smoke -- --url https://digitalsponsor.org
        
    - name: Notify deployment
      if: success()
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -H 'Content-type: application/json' \
          --data '{"text":"✅ Digital Sponsor deployed successfully to production!"}'
```

## 📊 **Monitoring & Observability**

### **Application Insights Configuration**

```typescript
// src/services/monitoring.ts
import { ApplicationInsights } from '@azure/applicationinsights-web'

class MonitoringService {
  private appInsights: ApplicationInsights
  
  constructor() {
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: process.env.REACT_APP_APPLICATIONINSIGHTS_CONNECTION_STRING,
        enableAutoRouteTracking: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true
      }
    })
    
    this.appInsights.loadAppInsights()
  }
  
  // Recovery-specific tracking
  trackRecoveryInteraction(event: string, properties: any) {
    this.appInsights.trackEvent({
      name: `Recovery_${event}`,
      properties: {
        ...properties,
        anonymous: true,
        timestamp: new Date().toISOString()
      }
    })
  }
  
  trackCrisisButtonUsed(location: string) {
    this.appInsights.trackEvent({
      name: 'Crisis_Support_Accessed',
      properties: {
        location,
        priority: 'critical',
        anonymous: true
      }
    })
  }
  
  trackDonationFlow(step: string, amount?: number) {
    this.appInsights.trackEvent({
      name: 'Donation_Flow',
      properties: { step },
      measurements: amount ? { amount } : undefined
    })
  }
  
  trackUserEngagement(feature: string, duration: number) {
    this.appInsights.trackEvent({
      name: 'User_Engagement',
      properties: { feature },
      measurements: { durationSeconds: duration }
    })
  }
}

export const monitoring = new MonitoringService()
```

### **Health Checks & Alerting**

```typescript
// backend/src/middleware/healthcheck.ts
import { Request, Response } from 'express'
import { prisma } from '../config/database'
import { redis } from '../config/redis'

export const healthCheck = async (req: Request, res: Response) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
      memory: 'unknown'
    }
  }
  
  try {
    // Database check
    await prisma.$queryRaw`SELECT 1`
    healthStatus.checks.database = 'healthy'
  } catch (error) {
    healthStatus.checks.database = 'unhealthy'
    healthStatus.status = 'degraded'
  }
  
  try {
    // Redis check
    await redis.ping()
    healthStatus.checks.redis = 'healthy'
  } catch (error) {
    healthStatus.checks.redis = 'unhealthy'
    healthStatus.status = 'degraded'
  }
  
  // Memory check
  const memUsage = process.memoryUsage()
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
  
  if (memUsagePercent > 90) {
    healthStatus.checks.memory = 'critical'
    healthStatus.status = 'unhealthy'
  } else if (memUsagePercent > 75) {
    healthStatus.checks.memory = 'warning'
    if (healthStatus.status === 'healthy') healthStatus.status = 'degraded'
  } else {
    healthStatus.checks.memory = 'healthy'
  }
  
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503
                    
  res.status(statusCode).json(healthStatus)
}
```

## 💰 **Cost Optimization Strategy**

### **Azure Cost Management**

```typescript
interface CostOptimization {
  compute: {
    containerApps: 'Consumption plan - pay per execution',
    staticWebApps: 'Standard tier - $9/month',
    autoShutdown: 'Scale to zero during low usage'
  },
  
  database: {
    tier: 'Burstable B1ms - $25/month',
    optimization: 'Auto-pause when idle',
    backup: 'Point-in-time recovery (7 days)'
  },
  
  storage: {
    tier: 'Hot LRS for active files',
    lifecycle: 'Move to Cool after 30 days',
    cdn: 'Cache static assets globally'
  },
  
  monitoring: {
    retention: '90 days for logs',
    sampling: '5% for detailed telemetry',
    alerts: 'Email notifications (free tier)'
  }
}
```

### **Scaling Thresholds**

```yaml
# Container Apps scaling configuration
scaling:
  minReplicas: 1
  maxReplicas: 10
  
  rules:
    - name: cpu-scaling
      type: cpu
      metadata:
        type: Utilization
        value: "70"
        
    - name: memory-scaling
      type: memory
      metadata:
        type: Utilization
        value: "80"
        
    - name: request-scaling
      type: http
      metadata:
        concurrentRequests: "100"
```

## 🔐 **Security Configuration**

### **Key Vault Secrets Management**

```bash
# Store sensitive configuration in Azure Key Vault
az keyvault secret set --vault-name kv-digitalsponsor-prod \
  --name "database-url" \
  --value "postgresql://user:password@server/db"

az keyvault secret set --vault-name kv-digitalsponsor-prod \
  --name "stripe-secret-key" \
  --value "sk_live_..."

az keyvault secret set --vault-name kv-digitalsponsor-prod \
  --name "jwt-secret" \
  --value "$(openssl rand -base64 32)"
```

### **Network Security Configuration**

```typescript
// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // HTTPS only
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  
  // Prevent XSS
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.digitalsponsor.org https://api.stripe.com"
  ].join('; '))
  
  next()
}
```

## 📱 **Mobile App Deployment**

### **Capacitor Build Configuration**

```json
// package.json - Mobile build scripts
{
  "scripts": {
    "mobile:build": "npm run build && npx cap sync",
    "mobile:ios": "npx cap run ios",
    "mobile:android": "npx cap run android",
    "mobile:build:ios": "npx cap build ios",
    "mobile:build:android": "npx cap build android",
    "mobile:deploy:ios": "cd ios && fastlane release",
    "mobile:deploy:android": "cd android && fastlane supply"
  }
}
```

### **App Store Deployment**

```ruby
# ios/fastlane/Fastfile
default_platform(:ios)

platform :ios do
  desc "Release to App Store"
  lane :release do
    build_app(scheme: "Digital Sponsor")
    upload_to_app_store(
      skip_metadata: false,
      skip_screenshots: false,
      submit_for_review: true,
      automatic_release: false,
      force: true,
      metadata_path: "fastlane/metadata"
    )
  end
end

# android/fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Deploy to Google Play Store"
  lane :deploy do
    gradle(task: "bundleRelease")
    upload_to_play_store(
      track: 'production',
      release_status: 'draft'
    )
  end
end
```

## 🎯 **Go-Live Checklist**

### **Final Pre-Launch Validation**

```bash
#!/bin/bash
# pre-launch-checklist.sh

echo "🚀 Digital Sponsor Pre-Launch Checklist"

# Infrastructure checks
echo "📋 Infrastructure validation..."
az containerapp show --name ca-digitalsponsor-backend-prod --resource-group rg-digitalsponsor-prod-eastus2
az staticwebapp show --name swa-digitalsponsor-prod --resource-group rg-digitalsponsor-prod-eastus2

# DNS validation
echo "🌐 DNS validation..."
nslookup digitalsponsor.org
nslookup api.digitalsponsor.org

# SSL certificate check
echo "🔒 SSL certificate validation..."
curl -I https://digitalsponsor.org
curl -I https://api.digitalsponsor.org

# API health checks
echo "💓 API health validation..."
curl https://api.digitalsponsor.org/health
curl https://api.digitalsponsor.org/crisis

# Performance tests
echo "⚡ Performance validation..."
npm run test:performance -- --url https://digitalsponsor.org

# Security scan
echo "🔐 Security validation..."
npm run security:scan

# Mobile app validation
echo "📱 Mobile app validation..."
curl -H "User-Agent: Mobile" https://digitalsponsor.org

echo "✅ Pre-launch validation complete!"
```

### **Launch Day Checklist**

- [ ] **DNS Cutover**: Point domain to Azure Front Door
- [ ] **SSL Verification**: Confirm HTTPS working across all endpoints
- [ ] **Monitoring**: Verify Application Insights collecting data
- [ ] **Performance**: Lighthouse score >90 for mobile
- [ ] **Security**: SSL Labs A+ rating
- [ ] **Functionality**: End-to-end user journey test
- [ ] **Mobile**: PWA install prompt working
- [ ] **Crisis Support**: Emergency resources accessible
- [ ] **Donations**: Payment processing functional
- [ ] **Analytics**: Revenue tracking operational

## 📈 **Post-Launch Operations**

### **Day 1-7: Intensive Monitoring**
- Monitor error rates and performance metrics hourly
- Track user adoption and feature usage
- Validate crisis support functionality
- Monitor donation conversion rates

### **Week 2-4: Optimization**
- A/B test donation prompts
- Optimize ad placements based on usage
- Fine-tune auto-scaling thresholds
- Collect user feedback for improvements

### **Month 2-3: Growth Phase**
- Launch mobile apps to app stores
- Implement premium features
- Begin corporate outreach
- Scale infrastructure based on user growth

---

**Migration Status: Ready for Implementation**  
**Deployment Timeline**: 5 weeks to production  
**Cost Estimate**: $93-200/month initial, scaling with revenue  
**Revenue Target**: $2,000+/month by month 6**  
**Mobile Ready**: iOS, Android, PWA optimized**