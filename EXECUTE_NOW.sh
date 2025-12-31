#!/bin/bash

# Digital Sponsor - EXECUTE DEPLOYMENT NOW
# Run this script on your local machine with Azure CLI installed

set -e

echo "🚀 STARTING DIGITAL SPONSOR DEPLOYMENT"
echo "====================================="
echo ""

# Check Azure CLI
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI not found. Install it first:"
    echo "   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash"
    exit 1
fi

# Check Azure login
if ! az account show &>/dev/null; then
    echo "❌ Not logged into Azure. Run:"
    echo "   az login"
    exit 1
fi

echo "✅ Azure CLI ready"
echo ""

# Execute Phase 1 - Infrastructure
echo "🏗️ PHASE 1: INFRASTRUCTURE (25 minutes, $47/month)"
echo "================================================="
./deploy/phase1-infrastructure.sh

echo ""
echo "🐳 PHASE 2: BACKEND DEPLOYMENT (15 minutes, $15/month)"  
echo "===================================================="
./deploy/modules/05-backend-container.sh

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "✅ Your Digital Sponsor platform is live!"
echo "✅ Backend with 185 AA literature chunks"
echo "✅ OpenAI-enhanced RAG system" 
echo "✅ Auto-scaling Container Apps"
echo "✅ Crisis support APIs"
echo ""
echo "💰 Monthly cost: ~$62"
echo "⏱️  Total time: ~40 minutes"
echo ""
echo "🔗 Check your backend URL in the deployment state:"
cat deploy/.deployment-state | grep BACKEND_URL
echo ""
echo "🧪 Test your deployment:"
echo "curl \$(cat deploy/.deployment-state | grep BACKEND_URL | cut -d= -f2)/api/health"