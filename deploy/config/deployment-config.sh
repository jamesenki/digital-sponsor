#!/bin/bash

# Digital Sponsor - Deployment Configuration
# Centralized configuration for all deployment modules

set -e

# =============================================================================
# CORE CONFIGURATION
# =============================================================================

export DEPLOYMENT_NAME="digital-sponsor"
export DOMAIN="commonsolution.org"
export SUBDOMAIN="digitalsponsor"
export FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"
export API_DOMAIN="api.${DOMAIN}"

# Azure Configuration
export AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-$(az account show --query id -o tsv 2>/dev/null || echo '')}"
export RESOURCE_GROUP="rg-commonsolution-prod"
export LOCATION="eastus2"
export ENVIRONMENT="production"

# Container Registry
export ACR_NAME="acrcommonsolution"
export ACR_LOGIN_SERVER="${ACR_NAME}.azurecr.io"

# Database Configuration
export DB_SERVER_NAME="pg-commonsolution-prod"
export DB_NAME="digital_sponsor_prod"
export DB_ADMIN_USER="pgadmin"
export DB_ADMIN_PASSWORD="DigitalSponsor2024!"
export DB_SKU="Standard_B1ms"
export DB_TIER="Burstable"
export DB_STORAGE_SIZE="32"

# Redis Configuration
export REDIS_NAME="redis-commonsolution-prod"
export REDIS_SKU="Basic"
export REDIS_VM_SIZE="c0"

# Container Apps Configuration
export CONTAINER_ENV_NAME="cae-commonsolution-prod"
export BACKEND_APP_NAME="ca-digitalsponsor-backend"
export BACKEND_IMAGE_NAME="backend"
export BACKEND_PORT="3000"

# Static Web App Configuration
export FRONTEND_APP_NAME="swa-digitalsponsor"
export FRONTEND_BUILD_PATH="/dist"

# OpenAI Configuration
export OPENAI_API_KEY="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"

# Email Configuration
export ADMIN_EMAIL="admin@${DOMAIN}"
export FORWARD_TO_EMAIL="jamessimonster@gmail.com"

# =============================================================================
# DERIVED CONFIGURATION
# =============================================================================

export DATABASE_URL="postgresql://${DB_ADMIN_USER}:${DB_ADMIN_PASSWORD}@${DB_SERVER_NAME}.postgres.database.azure.com:5432/${DB_NAME}?sslmode=require"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1" >&2
}

log_warning() {
    echo "⚠️  $1"
}

log_section() {
    echo ""
    echo "🔧 $1"
    echo "$(printf '=%.0s' {1..50})"
}

# Check if Azure CLI is installed and user is logged in
check_azure_prerequisites() {
    log_section "Checking Prerequisites"
    
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI not found. Please install: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        log_warning "Not logged in to Azure. Please run: az login"
        az login
    fi
    
    if [ -z "$AZURE_SUBSCRIPTION_ID" ]; then
        export AZURE_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
        log_info "Using subscription: $AZURE_SUBSCRIPTION_ID"
    fi
    
    log_success "Prerequisites check passed"
}

# Wait for resource to be ready
wait_for_resource() {
    local resource_type=$1
    local resource_name=$2
    local max_attempts=${3:-30}
    local attempt=1
    
    log_info "Waiting for $resource_type '$resource_name' to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if az resource show --name "$resource_name" --resource-group "$RESOURCE_GROUP" --resource-type "$resource_type" &>/dev/null; then
            log_success "$resource_type '$resource_name' is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - waiting 30 seconds..."
        sleep 30
        ((attempt++))
    done
    
    log_error "$resource_type '$resource_name' not ready after $max_attempts attempts"
    return 1
}

# Get connection string for Redis
get_redis_connection_string() {
    local redis_key=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv)
    echo "redis://${REDIS_NAME}.redis.cache.windows.net:6380?password=${redis_key}"
}

# Validate deployment configuration
validate_config() {
    log_section "Validating Configuration"
    
    local errors=0
    
    if [ -z "$DOMAIN" ]; then
        log_error "DOMAIN not set"
        ((errors++))
    fi
    
    if [ -z "$RESOURCE_GROUP" ]; then
        log_error "RESOURCE_GROUP not set"
        ((errors++))
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        log_error "OPENAI_API_KEY not set"
        ((errors++))
    fi
    
    if [ $errors -gt 0 ]; then
        log_error "Configuration validation failed with $errors errors"
        exit 1
    fi
    
    log_success "Configuration validation passed"
}

# Display deployment summary
show_deployment_summary() {
    log_section "Deployment Configuration Summary"
    echo "Domain: $FULL_DOMAIN"
    echo "API Domain: $API_DOMAIN"
    echo "Resource Group: $RESOURCE_GROUP"
    echo "Location: $LOCATION"
    echo "Database: $DB_SERVER_NAME"
    echo "Redis: $REDIS_NAME"
    echo "Container Registry: $ACR_NAME"
    echo "Email: $ADMIN_EMAIL → $FORWARD_TO_EMAIL"
    echo ""
}

# =============================================================================
# EXPORT ALL FUNCTIONS
# =============================================================================

export -f log_info log_success log_error log_warning log_section
export -f check_azure_prerequisites wait_for_resource get_redis_connection_string
export -f validate_config show_deployment_summary