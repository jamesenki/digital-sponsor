#!/bin/bash
set -e

echo "🌍 Testing Azure Function App deployment across regions..."
echo "========================================================="

# List of regions to test (starting with US, then expanding)
REGIONS=(
    "westus"
    "centralus" 
    "westus2"
    "southcentralus"
    "northcentralus"
    "eastus"
    "westeurope"
    "northeurope"
    "uksouth"
    "francecentral"
    "canadacentral"
    "australiaeast"
    "japaneast"
)

SUCCESSFUL_REGION=""
DEPLOYMENT_NAME=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

for REGION in "${REGIONS[@]}"; do
    echo ""
    echo -e "${YELLOW}🧪 Testing region: $REGION${NC}"
    
    # Create resource group name
    RG_NAME="rg-dstest-${REGION}"
    DEPLOYMENT_NAME="test-${REGION}-$(date +%H%M%S)"
    
    # Create resource group
    echo "Creating resource group: $RG_NAME"
    if az group create --name "$RG_NAME" --location "$REGION" --tags testing=true --output none; then
        echo "✅ Resource group created"
        
        # Try Function App deployment
        echo "🚀 Testing Function App deployment..."
        if az deployment group create \
            --resource-group "$RG_NAME" \
            --template-file infrastructure/function-test.bicep \
            --parameters location="$REGION" \
            --name "$DEPLOYMENT_NAME" \
            --output none 2>/dev/null; then
            
            echo -e "${GREEN}🎉 SUCCESS! Function App deployed in $REGION${NC}"
            SUCCESSFUL_REGION="$REGION"
            SUCCESSFUL_RG="$RG_NAME"
            break
        else
            echo -e "${RED}❌ Failed in $REGION (likely quota)${NC}"
            # Clean up failed deployment
            echo "🧹 Cleaning up failed deployment..."
            az group delete --name "$RG_NAME" --yes --no-wait --output none
        fi
    else
        echo -e "${RED}❌ Failed to create resource group in $REGION${NC}"
    fi
done

echo ""
echo "========================================================="
if [ -n "$SUCCESSFUL_REGION" ]; then
    echo -e "${GREEN}🎯 FOUND WORKING REGION: $SUCCESSFUL_REGION${NC}"
    echo -e "${GREEN}📋 Resource Group: $SUCCESSFUL_RG${NC}"
    echo ""
    echo "🎉 We can now deploy the full Digital Sponsor infrastructure to $SUCCESSFUL_REGION!"
    echo ""
    echo "Next steps:"
    echo "1. Update main Bicep template to use $SUCCESSFUL_REGION"
    echo "2. Deploy full infrastructure"
    echo "3. Deploy Function App code"
    
    # Get the Function App URL
    FUNC_URL=$(az deployment group show \
        --resource-group "$SUCCESSFUL_RG" \
        --name "$DEPLOYMENT_NAME" \
        --query "properties.outputs.functionAppUrl.value" \
        --output tsv 2>/dev/null || echo "URL not available")
    
    if [ "$FUNC_URL" != "URL not available" ]; then
        echo "4. Test deployment at: $FUNC_URL"
    fi
else
    echo -e "${RED}💥 NO WORKING REGIONS FOUND${NC}"
    echo "All tested regions have quota issues."
    echo "Recommendation: Submit support request with Microsoft"
fi

echo ""
echo "🏁 Region testing completed."