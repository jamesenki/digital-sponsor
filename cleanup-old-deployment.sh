#!/bin/bash
set -e

echo "🧹 Digital Sponsor - Azure Cleanup Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Resource groups to check
OLD_RG="rg-commonsolution-prod"
DNS_RG="digitalsponsor"

echo -e "${YELLOW}Checking current Azure subscription...${NC}"
CURRENT_SUB=$(az account show --query name -o tsv)
echo "Current subscription: $CURRENT_SUB"

echo ""
echo -e "${YELLOW}Resources found in $OLD_RG:${NC}"
az resource list --resource-group "$OLD_RG" --query "[].{Name:name, Type:type}" --output table

echo ""
echo -e "${YELLOW}Resources found in $DNS_RG:${NC}"
az resource list --resource-group "$DNS_RG" --query "[].{Name:name, Type:type}" --output table

echo ""
echo -e "${RED}⚠️  WARNING: This will DELETE all resources in both resource groups!${NC}"
echo -e "${RED}⚠️  This action is IRREVERSIBLE!${NC}"
echo ""

read -p "Do you want to proceed with cleanup? (type 'DELETE' to confirm): " confirm

if [ "$confirm" != "DELETE" ]; then
    echo -e "${GREEN}✅ Cleanup cancelled. No resources were deleted.${NC}"
    exit 0
fi

echo ""
echo -e "${RED}🗑️  Deleting resource group: $OLD_RG${NC}"
az group delete --name "$OLD_RG" --yes --no-wait

echo -e "${YELLOW}📋 Deletion initiated for $OLD_RG (running in background)${NC}"
echo ""

# Ask about DNS resources separately since they're important
echo -e "${YELLOW}DNS and domain resources found in $DNS_RG:${NC}"
az resource list --resource-group "$DNS_RG" --query "[].name" --output table

echo ""
read -p "Do you want to delete DNS resources too? (y/N): " delete_dns

if [[ $delete_dns =~ ^[Yy]$ ]]; then
    echo -e "${RED}🗑️  Deleting resource group: $DNS_RG${NC}"
    az group delete --name "$DNS_RG" --yes --no-wait
    echo -e "${YELLOW}📋 Deletion initiated for $DNS_RG (running in background)${NC}"
else
    echo -e "${GREEN}✅ Keeping DNS resources in $DNS_RG${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cleanup initiated successfully!${NC}"
echo -e "${YELLOW}📝 Note: Deletions are running in background. Check Azure portal to monitor progress.${NC}"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo "1. Wait for deletions to complete (check Azure portal)"
echo "2. Run './deploy-new-version.sh' to deploy the new implementation"
echo "3. Update DNS records if needed"