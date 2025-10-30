#!/bin/bash

# Digital Sponsor - Module 1: Resource Group Creation (TEST MODE)
# This shows exactly what will happen when you run the real deployment

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

echo "🧪 TEST MODE: Digital Sponsor - Phase 1.1: Resource Group Setup"
echo "=============================================================="
echo ""

echo "ℹ️  This is a TEST RUN showing exactly what will happen"
echo "ℹ️  No actual Azure resources will be created"
echo ""

# Show what the configuration will be
show_deployment_summary

echo ""
echo "🔧 Phase 1.1: Resource Group Creation"
echo "====================================="
echo ""

echo "📋 The following Azure CLI commands will be executed:"
echo ""

echo "1️⃣ Check Prerequisites:"
echo "   az account show  # Verify login"
echo "   az account list  # Show available subscriptions"
echo ""

echo "2️⃣ Create Resource Group:"
echo "   az group create \\"
echo "     --name '$RESOURCE_GROUP' \\"
echo "     --location '$LOCATION' \\"
echo "     --tags \\"
echo "       project='$DEPLOYMENT_NAME' \\"
echo "       environment='$ENVIRONMENT' \\"
echo "       domain='$DOMAIN' \\"
echo "       created='$(date -u +%Y-%m-%dT%H:%M:%SZ)' \\"
echo "       owner='jamessimonster@gmail.com'"
echo ""

echo "3️⃣ Validate Resource Group:"
echo "   az group show --name '$RESOURCE_GROUP' --output table"
echo ""

echo "4️⃣ Set Resource Policies:"
echo "   # Configure consistent tagging for all future resources"
echo "   # Set up naming conventions"
echo "   # Configure default resource policies"
echo ""

echo "✅ Expected Results:"
echo "   • Resource Group: $RESOURCE_GROUP (created)"
echo "   • Location: $LOCATION"
echo "   • Tags: project, environment, domain, created, owner"
echo "   • Status: Ready for Phase 1.2 (Database)"
echo ""

echo "💰 Cost Impact:"
echo "   • Resource Group: FREE"
echo "   • No billable resources created in Phase 1.1"
echo ""

echo "🔄 Next Steps After Phase 1.1:"
echo "   1. Phase 1.2: PostgreSQL Database (~$25/month)"
echo "   2. Phase 1.3: Redis Cache (~$17/month)"
echo "   3. Phase 1.4: Container Registry (~$5/month)"
echo ""

echo "📁 State File Created:"
echo "   deploy/.deployment-state will contain:"
echo "   RESOURCE_GROUP_CREATED=true"
echo "   PHASE_1_1_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Simulate creating the state file
echo "RESOURCE_GROUP_CREATED=true" > "$SCRIPT_DIR/../.deployment-state"
echo "PHASE_1_1_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"

echo "✨ TEST COMPLETE: Phase 1.1 simulation finished"
echo ""
echo "🚀 To run for real:"
echo "   1. Install Azure CLI: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
echo "   2. Login: az login"
echo "   3. Run: ./deploy/modules/01-resource-group.sh"
echo ""
echo "📋 Or run the full phase:"
echo "   ./deploy/phase1-infrastructure.sh --step-only 1"