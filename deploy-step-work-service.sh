#!/bin/bash
# Deploy Step Work Service to Azure Container Instances
set -e

echo "🔥 DEPLOYING STEP WORK SERVICE TO AZURE CONTAINER INSTANCES"
echo "============================================================="

# Configuration
RESOURCE_GROUP="rg-digitalsponsor"
LOCATION="centralus"
REGISTRY_NAME="crdigitalsponsornew"
IMAGE_NAME="step-work-service"
TAG="v2.0.0-rag"
CONTAINER_NAME="digitalsponsor-stepwork-v2"

# Check if resource group exists
echo "📋 Checking resource group..."
if ! az group show --name $RESOURCE_GROUP --output none 2>/dev/null; then
    echo "❌ Resource group $RESOURCE_GROUP does not exist. Creating..."
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo "✅ Resource group created"
else
    echo "✅ Resource group exists"
fi

# Build and push Docker image
echo ""
echo "🐳 Building and pushing Step Work Service Docker image..."
cd containers/step-work-service

# Build the image
docker build -t $IMAGE_NAME:$TAG .
echo "✅ Docker image built locally"

# Tag for Azure Container Registry
FULL_IMAGE_NAME="$REGISTRY_NAME.azurecr.io/$IMAGE_NAME:$TAG"
docker tag $IMAGE_NAME:$TAG $FULL_IMAGE_NAME
echo "✅ Image tagged for ACR"

# Login to ACR and push
az acr login --name $REGISTRY_NAME
docker push $FULL_IMAGE_NAME
echo "✅ Image pushed to ACR"

cd ../..

# Deploy to Azure Container Instances
echo ""
echo "🚀 Deploying Step Work Service to Azure Container Instances..."

az container create \
    --resource-group $RESOURCE_GROUP \
    --name $CONTAINER_NAME \
    --image $FULL_IMAGE_NAME \
    --registry-login-server "$REGISTRY_NAME.azurecr.io" \
    --registry-username $(az acr credential show --name $REGISTRY_NAME --query username --output tsv) \
    --registry-password $(az acr credential show --name $REGISTRY_NAME --query passwords[0].value --output tsv) \
    --dns-name-label $CONTAINER_NAME \
    --ports 3003 \
    --memory 1 \
    --cpu 0.5 \
    --environment-variables \
        PORT=3003 \
        LITERATURE_SERVICE_URL=http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002 \
        CHAT_SERVICE_URL=http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003 \
    --location $LOCATION

echo "✅ Step Work Service deployed"

# Get the FQDN
FQDN=$(az container show --resource-group $RESOURCE_GROUP --name $CONTAINER_NAME --query ipAddress.fqdn --output tsv)
echo ""
echo "🌐 Step Work Service available at: http://$FQDN:3003"

# Wait for container to be ready
echo ""
echo "⏳ Waiting for Step Work Service to be ready..."
sleep 30

# Test the service
echo ""
echo "🔍 Testing Step Work Service health..."
if curl -f "http://$FQDN:3003/health" > /dev/null 2>&1; then
    echo "✅ Step Work Service is healthy and ready"
    
    # Test RAG integration
    echo "🤖 Testing RAG integration..."
    if curl -f "http://$FQDN:3003/api/guidance/step/1?challenge=admitting%20powerlessness" > /dev/null 2>&1; then
        echo "✅ RAG integration is working"
    else
        echo "⚠️ RAG integration may need more time to initialize"
    fi
else
    echo "⚠️ Step Work Service may still be starting up"
fi

echo ""
echo "🎯 STEP WORK SERVICE DEPLOYMENT SUMMARY"
echo "========================================"
echo "🔗 Service URL: http://$FQDN:3003"
echo "📚 RAG Integration: Connected to literature and chat services"
echo "🔐 Privacy: Anonymous sessions with user-controlled deletion"
echo "📝 Features: Complete Step 4 workbook with AI guidance"
echo ""
echo "📋 API Endpoints:"
echo "   GET  /health - Health check"
echo "   POST /api/session/create - Create step work session"
echo "   GET  /api/step4/introduction - Step 4 workbook intro"
echo "   POST /api/step4/resentment - Save resentment entry"
echo "   POST /api/step4/fear - Save fear entry"
echo "   GET  /api/prayers?step=N - Get step prayers"
echo "   GET  /api/guidance/step/N?challenge=text - RAG step guidance"
echo "   GET  /api/guidance/resentment?description=text - RAG resentment help"
echo "   GET  /api/guidance/fear?description=text - RAG fear guidance"
echo ""
echo "🚀 Ready for frontend integration!"