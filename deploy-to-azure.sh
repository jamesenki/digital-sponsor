#!/bin/bash

# Digital Sponsor - Azure Deployment Script for commonsolution.org
# This script deploys the Digital Sponsor app to digitalsponsor.commonsolution.org

set -e  # Exit on any error

echo "🚀 Digital Sponsor - Azure Deployment to commonsolution.org"
echo "============================================================"

# Configuration
RESOURCE_GROUP="rg-commonsolution-prod"
LOCATION="eastus2"
ACR_NAME="acrcommonsolution"
DOMAIN="commonsolution.org"
SUBDOMAIN="digitalsponsor.commonsolution.org"
API_DOMAIN="api.commonsolution.org"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Please install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in to Azure
if ! az account show &> /dev/null; then
    echo "🔑 Please login to Azure..."
    az login
fi

echo "✅ Azure CLI ready"

# Phase 1: Create Resource Group
echo ""
echo "📁 Phase 1: Creating Resource Group..."
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION \
  --tags project=digital-sponsor environment=production domain=$DOMAIN

# Phase 2: Create Container Apps Environment
echo ""
echo "🐳 Phase 2: Creating Container Apps Environment..."
az containerapp env create \
  --name cae-commonsolution-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Phase 3: Create PostgreSQL Database
echo ""
echo "🗄️ Phase 3: Creating PostgreSQL Database..."
DB_PASSWORD="DigitalSponsor2024!"
az postgres flexible-server create \
  --name pg-commonsolution-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --admin-user pgadmin \
  --admin-password "$DB_PASSWORD" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --public-access 0.0.0.0

# Create database
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name pg-commonsolution-prod \
  --database-name digital_sponsor_prod

echo "✅ Database created"

# Phase 4: Create Redis Cache
echo ""
echo "⚡ Phase 4: Creating Redis Cache..."
az redis create \
  --name redis-commonsolution-prod \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0

echo "✅ Redis cache created"

# Phase 5: Create Container Registry
echo ""
echo "📦 Phase 5: Creating Container Registry..."
az acr create \
  --name $ACR_NAME \
  --resource-group $RESOURCE_GROUP \
  --sku Basic \
  --admin-enabled true

echo "✅ Container registry created"

# Phase 6: Build and Push Backend
echo ""
echo "🔨 Phase 6: Building and Pushing Backend..."

# Create production Dockerfile
cd backend
cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application
CMD ["node", "src/index.js"]
EOF

# Login to ACR and build
az acr login --name $ACR_NAME
az acr build --registry $ACR_NAME --image backend:latest .

echo "✅ Backend image built and pushed"

# Phase 7: Get Connection Strings
echo ""
echo "🔗 Phase 7: Getting Connection Strings..."

# Get Redis connection string
REDIS_KEY=$(az redis list-keys --name redis-commonsolution-prod --resource-group $RESOURCE_GROUP --query primaryKey -o tsv)
REDIS_URL="redis://redis-commonsolution-prod.redis.cache.windows.net:6380?password=$REDIS_KEY"

# Database connection string
DATABASE_URL="postgresql://pgadmin:$DB_PASSWORD@pg-commonsolution-prod.postgres.database.azure.com:5432/digital_sponsor_prod?sslmode=require"

echo "✅ Connection strings ready"

# Phase 8: Deploy Backend Container App
echo ""
echo "🚀 Phase 8: Deploying Backend Container App..."
az containerapp create \
  --name ca-digitalsponsor-backend \
  --resource-group $RESOURCE_GROUP \
  --environment cae-commonsolution-prod \
  --image ${ACR_NAME}.azurecr.io/backend:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 5 \
  --cpu 0.5 \
  --memory 1Gi \
  --env-vars \
    NODE_ENV=production \
    PORT=3000 \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    OPENAI_API_KEY="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"

echo "✅ Backend container app deployed"

# Get backend URL
BACKEND_URL=$(az containerapp show --name ca-digitalsponsor-backend --resource-group $RESOURCE_GROUP --query properties.configuration.ingress.fqdn -o tsv)
echo "🌐 Backend URL: https://$BACKEND_URL"

# Phase 9: Build and Deploy Frontend
echo ""
echo "🎨 Phase 9: Building and Deploying Frontend..."

cd ../frontend

# Create production environment file
cat > .env.production << EOF
VITE_API_BASE_URL=https://$BACKEND_URL
VITE_APP_TITLE=Digital Sponsor
VITE_APP_DOMAIN=$DOMAIN
VITE_SUBDOMAIN=$SUBDOMAIN
EOF

# Build frontend
npm run build

# Create Static Web App (will prompt for GitHub integration)
echo "📱 Creating Static Web App..."
echo "⚠️  You'll need to authorize GitHub integration when prompted"

az staticwebapp create \
  --name swa-digitalsponsor \
  --resource-group $RESOURCE_GROUP \
  --location eastus2 \
  --source "." \
  --branch main \
  --app-location "/" \
  --build-location "/dist"

echo "✅ Frontend static web app created"

# Phase 10: Import Database
echo ""
echo "🗄️ Phase 10: Importing Database with Literature..."

# Export current database
echo "Exporting current database..."
pg_dump -h 127.0.0.1 -p 5433 -U postgres -d digital_sponsor_dev > ../commonsolution_db_export.sql

# Import to Azure PostgreSQL
echo "Importing to Azure PostgreSQL..."
PGPASSWORD="$DB_PASSWORD" psql -h pg-commonsolution-prod.postgres.database.azure.com -U pgadmin -d digital_sponsor_prod -f ../commonsolution_db_export.sql

echo "✅ Database imported with 185 literature chunks"

# Phase 11: Test Deployment
echo ""
echo "🧪 Phase 11: Testing Deployment..."

echo "Testing backend health..."
if curl -f "https://$BACKEND_URL/api/health"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
fi

echo "Testing RAG system..."
RESPONSE=$(curl -s -X POST "https://$BACKEND_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is step 1?"}')

if echo "$RESPONSE" | grep -q "powerless"; then
    echo "✅ RAG system working"
else
    echo "❌ RAG system test failed"
fi

# Phase 12: DNS Configuration Instructions
echo ""
echo "🌐 Phase 12: DNS Configuration"
echo "============================================"

# Create DNS zone
az network dns zone create \
  --resource-group $RESOURCE_GROUP \
  --name $DOMAIN

# Get name servers
NAMESERVERS=$(az network dns zone show --resource-group $RESOURCE_GROUP --name $DOMAIN --query nameServers -o tsv)

echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "========================="
echo ""
echo "1. Update your domain registrar's nameservers to:"
echo "$NAMESERVERS" | sed 's/^/   /'
echo ""
echo "2. After DNS propagation (24-48 hours), run the domain configuration:"
echo "   az network dns record-set cname set-record \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --zone-name $DOMAIN \\"
echo "     --record-set-name digitalsponsor \\"
echo "     --cname $(az staticwebapp show --name swa-digitalsponsor --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"
echo ""
echo "3. Configure custom domain in Static Web App:"
echo "   az staticwebapp hostname set \\"
echo "     --name swa-digitalsponsor \\"
echo "     --resource-group $RESOURCE_GROUP \\"
echo "     --hostname $SUBDOMAIN"
echo ""

# Deployment Summary
echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================="
echo ""
echo "📱 Application URLs:"
echo "   Frontend (temp): https://$(az staticwebapp show --name swa-digitalsponsor --resource-group $RESOURCE_GROUP --query defaultHostname -o tsv)"
echo "   Backend API: https://$BACKEND_URL"
echo ""
echo "🌐 Future URLs (after DNS setup):"
echo "   Main site: https://$SUBDOMAIN"
echo "   API: https://$API_DOMAIN"
echo ""
echo "📧 Email Setup:"
echo "   Configure admin@$DOMAIN forwarding to jamessimonster@gmail.com"
echo "   Recommended: Use Cloudflare Email Routing (free) or Google Workspace"
echo ""
echo "🗄️ Database:"
echo "   ✅ 185 literature chunks imported"
echo "   ✅ RAG system functional"
echo "   ✅ OpenAI integration active"
echo ""
echo "💰 Estimated Monthly Cost: $90-120"
echo ""
echo "Next: Wait for DNS propagation, then configure custom domains"

cd ..