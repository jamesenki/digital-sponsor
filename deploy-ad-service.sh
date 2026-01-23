#!/bin/bash

# Deploy Ad Service to Azure Central US
# Phase 1 implementation

set -e

echo "🚀 Deploying Digital Sponsor Ad Service..."

# Configuration
RESOURCE_GROUP="rg-digitalsponsor-new"
LOCATION="centralus"
AD_SERVICE_NAME="digitalsponsor-ad-service"
REGISTRY_NAME="crdigitalsponsornew"

# Environment variables for the container
COSMOS_ENDPOINT="https://digitalsponsor-cosmos.documents.azure.com:443/"
COSMOS_DATABASE="DigitalSponsor"
REDIS_URL="redis://digitalsponsor-redis.redis.cache.windows.net:6380"

echo "📦 Building ad-service container..."
cd containers/ad-service

# Build and tag the container
docker build -t ${AD_SERVICE_NAME}:latest .

echo "🔐 Logging into Azure Container Registry..."
az acr login --name $REGISTRY_NAME

# Tag for registry
docker tag ${AD_SERVICE_NAME}:latest ${REGISTRY_NAME}.azurecr.io/${AD_SERVICE_NAME}:latest

echo "📤 Pushing container to registry..."
docker push ${REGISTRY_NAME}.azurecr.io/${AD_SERVICE_NAME}:latest

echo "🚀 Deploying container to Azure Container Instances..."

# Create container instance
az container create \
  --resource-group $RESOURCE_GROUP \
  --name $AD_SERVICE_NAME \
  --image ${REGISTRY_NAME}.azurecr.io/${AD_SERVICE_NAME}:latest \
  --registry-login-server ${REGISTRY_NAME}.azurecr.io \
  --registry-username $REGISTRY_NAME \
  --registry-password $(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv) \
  --location $LOCATION \
  --cpu 1 \
  --memory 2 \
  --ports 8000 \
  --dns-name-label $AD_SERVICE_NAME \
  --environment-variables \
    COSMOS_ENDPOINT="$COSMOS_ENDPOINT" \
    COSMOS_DATABASE="$COSMOS_DATABASE" \
    REDIS_URL="$REDIS_URL" \
    ENVIRONMENT="production"

echo "⏳ Waiting for deployment to complete..."
sleep 30

# Get the FQDN
FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $AD_SERVICE_NAME --query ipAddress.fqdn --output tsv)

echo "✅ Ad Service deployed successfully!"
echo "🌐 Service URL: http://$FQDN:8000"
echo "📊 Health Check: http://$FQDN:8000/health"
echo "📚 API Docs: http://$FQDN:8000/docs"

# Test the health endpoint
echo "🏥 Testing health endpoint..."
sleep 10
curl -f "http://$FQDN:8000/health" || echo "Health check failed"

echo ""
echo "🎯 Phase 1 Ad Service deployment complete!"
echo "Next steps:"
echo "1. Test ad request API: POST http://$FQDN:8000/api/request-ad"
echo "2. Configure frontend integration"
echo "3. Set up monitoring and alerts"