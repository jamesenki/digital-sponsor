#!/bin/bash

# Digital Sponsor - Production Ready Deployment Script
# Deploys consolidated Python container architecture with HTTPS

set -e

echo "🚀 Digital Sponsor Production Deployment"
echo "=========================================="

# Configuration
RESOURCE_GROUP="rg-digitalsponsor-new"
LOCATION="centralus"
ENVIRONMENT="prod"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        error "Azure CLI is not installed"
    fi
    
    # Check login status
    if ! az account show &> /dev/null; then
        error "Please login to Azure: az login"
    fi
    
    # Check subscription
    SUBSCRIPTION=$(az account show --query name -o tsv)
    log "Using subscription: $SUBSCRIPTION"
    
    success "Prerequisites check passed"
}

# Deploy infrastructure
deploy_infrastructure() {
    log "Deploying infrastructure..."
    
    # Ensure resource group exists
    az group create \
        --name $RESOURCE_GROUP \
        --location $LOCATION \
        --tags project=digitalsponsor environment=$ENVIRONMENT
    
    success "Resource group ready"
    
    # Deploy Application Gateway
    log "Deploying Application Gateway with WAF..."
    az deployment group create \
        --resource-group $RESOURCE_GROUP \
        --template-file infrastructure/application-gateway.bicep \
        --parameters location=$LOCATION environmentName=$ENVIRONMENT
    
    # Get the public IP for DNS configuration
    APP_GW_IP=$(az network public-ip show \
        --resource-group $RESOURCE_GROUP \
        --name "pip-digitalsponsor-appgw-$ENVIRONMENT" \
        --query ipAddress -o tsv)
    
    success "Infrastructure deployed"
    warning "Please configure DNS records:"
    echo "  A record: api.digitalsponsor.commonsolution.org -> $APP_GW_IP"
    echo "  CNAME record: digitalsponsor.commonsolution.org -> your-static-web-app.azurestaticapps.net"
}

# Deploy container services
deploy_services() {
    log "Deploying Python container services..."
    
    # Create container registry if needed
    ACR_NAME="crdigitalsponsor"
    if ! az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
        log "Creating container registry..."
        az acr create \
            --resource-group $RESOURCE_GROUP \
            --name $ACR_NAME \
            --sku Basic \
            --admin-enabled true
    fi
    
    # Build and deploy auth service
    log "Building and deploying Auth Service..."
    cd containers/auth-service
    az acr build \
        --registry $ACR_NAME \
        --image digital-sponsor-auth:latest \
        --image digital-sponsor-auth:$(git rev-parse --short HEAD) \
        .
    cd ../..
    
    # Build and deploy literature service
    log "Building and deploying Literature Service..."
    cd containers/literature-service
    az acr build \
        --registry $ACR_NAME \
        --image digital-sponsor-literature:latest \
        --image digital-sponsor-literature:$(git rev-parse --short HEAD) \
        --file Dockerfile.massive \
        .
    cd ../..
    
    # Build and deploy chat service
    log "Building and deploying Chat Service..."
    cd containers/chat-service
    az acr build \
        --registry $ACR_NAME \
        --image digital-sponsor-chat:latest \
        --image digital-sponsor-chat:$(git rev-parse --short HEAD) \
        .
    cd ../..
    
    success "Container images built and pushed"
}

# Deploy containers to Container Instances
deploy_containers() {
    log "Deploying containers to Azure Container Instances..."
    
    ACR_LOGIN_SERVER="$ACR_NAME.azurecr.io"
    ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)
    
    # Deploy Auth Service
    log "Deploying Auth Service container..."
    az container create \
        --resource-group $RESOURCE_GROUP \
        --name digitalsponsor-auth-prod \
        --image $ACR_LOGIN_SERVER/digital-sponsor-auth:latest \
        --cpu 1 --memory 2 \
        --restart-policy Always \
        --ports 8080 \
        --environment-variables \
            PORT=8080 \
            ADMIN_KEY="${ADMIN_KEY:-DS-ADMIN-2026-BETA}" \
            JWT_SECRET="${JWT_SECRET:-temp-jwt-secret}" \
        --ip-address Public \
        --dns-name-label digitalsponsor-auth-prod \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --os-type Linux
    
    # Deploy Literature Service
    log "Deploying Literature Service container..."
    az container create \
        --resource-group $RESOURCE_GROUP \
        --name digitalsponsor-literature-massive \
        --image $ACR_LOGIN_SERVER/digital-sponsor-literature:latest \
        --cpu 2 --memory 4 \
        --restart-policy Always \
        --ports 3002 \
        --ip-address Public \
        --dns-name-label digitalsponsor-literature-massive \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --os-type Linux
    
    # Deploy Chat Service
    log "Deploying Chat Service container..."
    az container create \
        --resource-group $RESOURCE_GROUP \
        --name digitalsponsor-chat-v2 \
        --image $ACR_LOGIN_SERVER/digital-sponsor-chat:latest \
        --cpu 1 --memory 2 \
        --restart-policy Always \
        --ports 3003 \
        --environment-variables \
            LITERATURE_SERVICE_URL="http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002" \
        --ip-address Public \
        --dns-name-label digitalsponsor-chat-v2 \
        --registry-login-server $ACR_LOGIN_SERVER \
        --registry-username $ACR_USERNAME \
        --registry-password $ACR_PASSWORD \
        --os-type Linux
    
    success "All containers deployed"
}

# Health check deployment
health_check() {
    log "Running health checks..."
    
    sleep 60  # Wait for containers to start
    
    # Check auth service
    AUTH_IP=$(az container show --resource-group $RESOURCE_GROUP --name digitalsponsor-auth-prod --query ipAddress.ip -o tsv)
    if curl -f "http://$AUTH_IP:8080/health" > /dev/null 2>&1; then
        success "Auth Service: Healthy"
    else
        warning "Auth Service: Not responding"
    fi
    
    # Check literature service
    LIT_IP=$(az container show --resource-group $RESOURCE_GROUP --name digitalsponsor-literature-massive --query ipAddress.ip -o tsv)
    if curl -f "http://$LIT_IP:3002/health" > /dev/null 2>&1; then
        success "Literature Service: Healthy"
    else
        warning "Literature Service: Not responding"
    fi
    
    # Check chat service
    CHAT_IP=$(az container show --resource-group $RESOURCE_GROUP --name digitalsponsor-chat-v2 --query ipAddress.ip -o tsv)
    if curl -f "http://$CHAT_IP:3003/health" > /dev/null 2>&1; then
        success "Chat Service: Healthy"
    else
        warning "Chat Service: Not responding"
    fi
}

# Display deployment summary
deployment_summary() {
    echo ""
    echo "🎉 Digital Sponsor Production Deployment Complete!"
    echo "=================================================="
    echo ""
    echo "📍 Service Endpoints:"
    echo "  Frontend: https://digitalsponsor.commonsolution.org (after DNS setup)"
    echo "  API Gateway: https://api.digitalsponsor.commonsolution.org (after DNS setup)"
    echo "  Admin Panel: https://digitalsponsor.commonsolution.org/admin"
    echo ""
    echo "🔧 Direct Container Endpoints (for testing):"
    echo "  Auth: http://digitalsponsor-auth-prod.centralus.azurecontainer.io:8080"
    echo "  Literature: http://digitalsponsor-literature-massive.centralus.azurecontainer.io:3002"
    echo "  Chat: http://digitalsponsor-chat-v2.centralus.azurecontainer.io:3003"
    echo ""
    echo "⚠️  DNS Configuration Required:"
    echo "  1. Set A record: api.digitalsponsor.commonsolution.org -> $APP_GW_IP"
    echo "  2. Verify CNAME: digitalsponsor.commonsolution.org -> static web app"
    echo ""
    echo "🎫 Demo Invitation Codes:"
    echo "  - DS-GENERAL-DEMO2026 (General Beta)"
    echo "  - DS-ADMIN-SETUP001 (Admin Access)"
    echo ""
    echo "👤 Admin Credentials:"
    echo "  Email: jamesenki@digitalsponsor.ai"
    echo "  Password: Pamala2018*"
    echo ""
    echo "🔐 Security Notes:"
    echo "  - Change default admin password"
    echo "  - Configure Azure Key Vault for secrets"
    echo "  - Enable SSL certificates in Application Gateway"
    echo ""
}

# Main deployment flow
main() {
    echo "Starting Digital Sponsor production deployment..."
    echo ""
    
    check_prerequisites
    deploy_infrastructure
    deploy_services
    deploy_containers
    health_check
    deployment_summary
}

# Run main deployment
main "$@"