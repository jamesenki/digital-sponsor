#!/bin/bash

# Azure Infrastructure Deployment Script
# Deploys Digital Sponsor infrastructure using Bicep templates

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$INFRASTRUCTURE_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
SUBSCRIPTION_ID="${2:-}"
LOCATION="${3:-eastus2}"
RESOURCE_GROUP_NAME="rg-digital-sponsor-${ENVIRONMENT}"
DEPLOYMENT_NAME="digital-sponsor-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Azure Infrastructure Deployment Script

USAGE:
    $0 [ENVIRONMENT] [SUBSCRIPTION_ID] [LOCATION]

PARAMETERS:
    ENVIRONMENT      Target environment (dev, staging, prod) - Default: dev
    SUBSCRIPTION_ID  Azure subscription ID (optional)
    LOCATION         Azure region - Default: eastus2

EXAMPLES:
    $0 dev
    $0 staging 12345678-1234-1234-1234-123456789012
    $0 prod 12345678-1234-1234-1234-123456789012 westus2

PREREQUISITES:
    - Azure CLI installed and logged in
    - Bicep CLI installed
    - Appropriate Azure permissions
    - OpenAI API key stored in shared Key Vault

EOF
}

# Validation functions
validate_environment() {
    case $ENVIRONMENT in
        dev|staging|prod)
            log_info "Deploying to environment: $ENVIRONMENT"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod"
            show_help
            exit 1
            ;;
    esac
}

validate_azure_cli() {
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed. Please install it first."
        exit 1
    fi

    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure CLI. Please run 'az login'"
        exit 1
    fi

    log_success "Azure CLI is installed and authenticated"
}

validate_bicep() {
    if ! command -v bicep &> /dev/null; then
        log_warning "Bicep CLI not found. Installing via Azure CLI..."
        az bicep install
    fi

    log_success "Bicep CLI is available"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    validate_environment
    validate_azure_cli
    validate_bicep
    
    # Validate Bicep template
    log_info "Validating Bicep template..."
    if ! az bicep build --file "$INFRASTRUCTURE_DIR/main.bicep" --stdout > /dev/null; then
        log_error "Bicep template validation failed"
        exit 1
    fi
    log_success "Bicep template validation passed"
    
    # Check parameter file exists
    PARAM_FILE="$INFRASTRUCTURE_DIR/parameters/${ENVIRONMENT}.parameters.json"
    if [[ ! -f "$PARAM_FILE" ]]; then
        log_error "Parameter file not found: $PARAM_FILE"
        exit 1
    fi
    log_success "Parameter file found: $PARAM_FILE"
}

# Set Azure subscription
set_subscription() {
    if [[ -n "$SUBSCRIPTION_ID" ]]; then
        log_info "Setting Azure subscription to: $SUBSCRIPTION_ID"
        az account set --subscription "$SUBSCRIPTION_ID"
    else
        CURRENT_SUB=$(az account show --query id -o tsv)
        log_info "Using current Azure subscription: $CURRENT_SUB"
    fi
}

# Create resource group
create_resource_group() {
    log_info "Creating resource group: $RESOURCE_GROUP_NAME"
    
    if az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
        log_warning "Resource group already exists: $RESOURCE_GROUP_NAME"
    else
        az group create \
            --name "$RESOURCE_GROUP_NAME" \
            --location "$LOCATION" \
            --tags \
                environment="$ENVIRONMENT" \
                application="Digital Sponsor" \
                managedBy="Bicep" \
                deployedBy="$(whoami)" \
                deployedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        
        log_success "Resource group created: $RESOURCE_GROUP_NAME"
    fi
}

# Deploy infrastructure
deploy_infrastructure() {
    log_info "Starting infrastructure deployment..."
    log_info "Deployment name: $DEPLOYMENT_NAME"
    
    PARAM_FILE="$INFRASTRUCTURE_DIR/parameters/${ENVIRONMENT}.parameters.json"
    
    # Start deployment
    az deployment group create \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --name "$DEPLOYMENT_NAME" \
        --template-file "$INFRASTRUCTURE_DIR/main.bicep" \
        --parameters "@$PARAM_FILE" \
        --verbose
    
    if [[ $? -eq 0 ]]; then
        log_success "Infrastructure deployment completed successfully"
    else
        log_error "Infrastructure deployment failed"
        exit 1
    fi
}

# Get deployment outputs
get_deployment_outputs() {
    log_info "Retrieving deployment outputs..."
    
    OUTPUT_FILE="$ROOT_DIR/.azure-outputs-${ENVIRONMENT}.json"
    
    az deployment group show \
        --resource-group "$RESOURCE_GROUP_NAME" \
        --name "$DEPLOYMENT_NAME" \
        --query properties.outputs > "$OUTPUT_FILE"
    
    log_success "Deployment outputs saved to: $OUTPUT_FILE"
    
    # Display key outputs
    echo ""
    log_info "Key deployment information:"
    echo "----------------------------------------"
    
    STATIC_WEB_APP=$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs.staticWebAppDefaultHostname.value -o tsv)
    CONTAINER_APP=$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs.containerAppFqdn.value -o tsv)
    KEY_VAULT=$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs.keyVaultName.value -o tsv)
    
    echo "Frontend URL: https://$STATIC_WEB_APP"
    echo "API URL: https://$CONTAINER_APP"
    echo "Key Vault: $KEY_VAULT"
    echo "Resource Group: $RESOURCE_GROUP_NAME"
    echo "----------------------------------------"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment health..."
    
    # Wait for services to be ready
    sleep 30
    
    # Check Static Web App
    STATIC_WEB_APP=$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs.staticWebAppDefaultHostname.value -o tsv)
    
    if curl -sf "https://$STATIC_WEB_APP" > /dev/null; then
        log_success "Frontend is accessible"
    else
        log_warning "Frontend is not yet accessible (may take a few minutes)"
    fi
    
    # Container App health check will be available after first deployment
    log_info "API health check will be available after container deployment"
}

# Post-deployment tasks
post_deployment_tasks() {
    log_info "Running post-deployment tasks..."
    
    # Set GitHub secrets for CI/CD
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        log_info "Updating GitHub secrets for CI/CD..."
        
        STATIC_WEB_APP_TOKEN=$(az staticwebapp secrets list --name "$(az deployment group show --resource-group "$RESOURCE_GROUP_NAME" --name "$DEPLOYMENT_NAME" --query properties.outputs.staticWebAppName.value -o tsv)" --query properties.apiKey -o tsv)
        
        gh secret set "AZURE_STATIC_WEB_APPS_API_TOKEN_${ENVIRONMENT^^}" --body "$STATIC_WEB_APP_TOKEN" --repo "$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')"
        
        log_success "GitHub secrets updated"
    else
        log_warning "GitHub CLI not available or not authenticated. Please manually update GitHub secrets."
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup tasks here
}

# Main execution
main() {
    # Handle help flag
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    log_info "Starting Azure infrastructure deployment for Digital Sponsor"
    log_info "Environment: $ENVIRONMENT"
    log_info "Location: $LOCATION"
    log_info "Resource Group: $RESOURCE_GROUP_NAME"
    echo ""
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    pre_deployment_checks
    set_subscription
    create_resource_group
    deploy_infrastructure
    get_deployment_outputs
    verify_deployment
    post_deployment_tasks
    
    log_success "✅ Deployment completed successfully!"
    log_info "Next steps:"
    echo "1. Update DNS records if using custom domain"
    echo "2. Deploy application code using GitHub Actions"
    echo "3. Run health checks and validation tests"
    echo "4. Configure monitoring alerts"
}

# Execute main function with all arguments
main "$@"