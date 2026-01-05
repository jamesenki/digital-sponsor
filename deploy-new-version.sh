#!/bin/bash
set -e

echo "🚀 Digital Sponsor - New Deployment Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESOURCE_GROUP="rg-digitalsponsor-new"
LOCATION="eastus2"
DEPLOYMENT_NAME="digitalsponsor-$(date +%Y%m%d-%H%M%S)"

echo -e "${BLUE}📋 Deployment Configuration:${NC}"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"
echo "Deployment Name: $DEPLOYMENT_NAME"
echo ""

# Check if logged in to Azure
echo -e "${YELLOW}Checking Azure CLI authentication...${NC}"
if ! az account show >/dev/null 2>&1; then
    echo -e "${RED}❌ Not logged in to Azure CLI${NC}"
    echo "Please run: az login"
    exit 1
fi

CURRENT_SUB=$(az account show --query name -o tsv)
echo -e "${GREEN}✅ Logged in to subscription: $CURRENT_SUB${NC}"

# Create resource group
echo ""
echo -e "${YELLOW}🏗️  Creating resource group...${NC}"
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output table

# Build the Docker images first (if needed)
echo ""
echo -e "${YELLOW}🐳 Building and pushing Docker images...${NC}"

# Build auth service
echo "Building authentication service..."
docker build -t digitalsponsor/auth:latest ./services/auth

# Tag for Azure Container Registry (will need ACR name)
echo -e "${YELLOW}📝 Note: You'll need to push to Azure Container Registry after it's created${NC}"

# Deploy infrastructure using Bicep
echo ""
echo -e "${YELLOW}🏗️  Deploying infrastructure with Bicep...${NC}"
az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file infrastructure/main.bicep \
    --parameters environment=prod \
    --name "$DEPLOYMENT_NAME" \
    --verbose

# Get deployment outputs
echo ""
echo -e "${YELLOW}📋 Retrieving deployment outputs...${NC}"
OUTPUTS=$(az deployment group show \
    --resource-group "$RESOURCE_GROUP" \
    --name "$DEPLOYMENT_NAME" \
    --query properties.outputs \
    --output json)

echo -e "${GREEN}✅ Infrastructure deployed successfully!${NC}"
echo ""

# Show next steps
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Push Docker images to the created Azure Container Registry"
echo "2. Update Container Apps with the new images"
echo "3. Configure DNS records to point to the new deployment"
echo "4. Test the new deployment"
echo "5. Update environment variables and secrets"
echo ""

# Show useful outputs
echo -e "${YELLOW}📊 Deployment Outputs:${NC}"
echo "$OUTPUTS" | jq -r 'to_entries[] | "\(.key): \(.value.value)"' || echo "$OUTPUTS"

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"