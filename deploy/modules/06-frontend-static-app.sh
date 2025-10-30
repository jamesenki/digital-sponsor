#!/bin/bash

# Digital Sponsor - Module 6: Frontend Static Web App Deployment
# Deploys React frontend to Azure Static Web Apps

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: FRONTEND BUILD PREPARATION
# =============================================================================

prepare_frontend_build() {
    log_section "Preparing Frontend Build"
    
    log_info "Configuring frontend environment for production..."
    
    # Create production environment file
    cat > "$PROJECT_ROOT/frontend/.env.production" << EOF
# Digital Sponsor Frontend - Production Environment
REACT_APP_API_URL=$BACKEND_URL
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Digital Sponsor
REACT_APP_DOMAIN=$FULL_DOMAIN
GENERATE_SOURCEMAP=false
EOF

    log_success "Frontend environment configured"
    log_info "Backend URL: $BACKEND_URL"
    log_info "Frontend Domain: $FULL_DOMAIN"
}

# =============================================================================
# MODULE: STATIC WEB APP CREATION
# =============================================================================

create_static_web_app() {
    log_section "Creating Azure Static Web App"
    
    # Check if Static Web App already exists
    if az staticwebapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Static Web App '$FRONTEND_APP_NAME' already exists"
        log_info "Updating existing Static Web App..."
        return 0
    fi
    
    log_info "Creating Static Web App '$FRONTEND_APP_NAME'..."
    
    # Create Static Web App
    az staticwebapp create \
        --name "$FRONTEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Free \
        --tags \
            project="$DEPLOYMENT_NAME" \
            environment="$ENVIRONMENT" \
            component="frontend" \
            domain="$DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "Static Web App created successfully"
    else
        log_error "Failed to create Static Web App"
        exit 1
    fi
    
    # Wait for Static Web App to be ready
    wait_for_static_web_app_ready 60
}

# =============================================================================
# MODULE: FRONTEND BUILD AND DEPLOYMENT
# =============================================================================

build_and_deploy_frontend() {
    log_section "Building and Deploying Frontend"
    
    log_info "Building React application for production..."
    cd "$PROJECT_ROOT/frontend"
    
    # Install dependencies
    log_info "Installing frontend dependencies..."
    npm ci
    
    # Build for production
    log_info "Building frontend application..."
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Frontend build completed successfully"
    else
        log_error "Frontend build failed"
        exit 1
    fi
    
    # Get deployment token
    log_info "Getting deployment token..."
    local deployment_token=$(az staticwebapp secrets list --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.apiKey -o tsv)
    
    if [ -z "$deployment_token" ]; then
        log_error "Could not retrieve deployment token"
        exit 1
    fi
    
    # Deploy using Azure CLI
    log_info "Deploying frontend to Static Web App..."
    
    # Use SWA CLI if available, otherwise use az deployment
    if command -v swa &>/dev/null; then
        # Deploy with SWA CLI
        swa deploy ./build \
            --deployment-token "$deployment_token" \
            --env production
    else
        # Deploy with Azure CLI
        az staticwebapp environment set \
            --name "$FRONTEND_APP_NAME" \
            --resource-group "$RESOURCE_GROUP" \
            --source ./build
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Frontend deployed successfully"
    else
        log_error "Frontend deployment failed"
        exit 1
    fi
}

# =============================================================================
# MODULE: CUSTOM DOMAIN CONFIGURATION
# =============================================================================

configure_custom_domain() {
    log_section "Configuring Custom Domain"
    
    # Get the default hostname
    local default_hostname=$(az staticwebapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query defaultHostname -o tsv)
    
    log_info "Default hostname: https://$default_hostname"
    
    # Add custom domain (this will require DNS verification)
    log_info "Adding custom domain '$FULL_DOMAIN'..."
    
    az staticwebapp hostname set \
        --name "$FRONTEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --hostname "$FULL_DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "Custom domain added (DNS verification required)"
        log_info "You'll need to add CNAME record: $SUBDOMAIN -> $default_hostname"
    else
        log_warning "Custom domain setup failed - will use default hostname"
    fi
    
    export FRONTEND_URL="https://$default_hostname"
}

# =============================================================================
# MODULE: API CONFIGURATION
# =============================================================================

configure_api_proxy() {
    log_section "Configuring API Proxy"
    
    log_info "Setting up API proxy configuration..."
    
    # Create staticwebapp.config.json for API routing
    cat > "$PROJECT_ROOT/frontend/build/staticwebapp.config.json" << EOF
{
  "routes": [
    {
      "route": "/api/*",
      "rewrite": "$BACKEND_URL/api/"
    },
    {
      "route": "/*",
      "serve": "/index.html",
      "statusCode": 200
    }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/login",
      "statusCode": 302
    },
    "403": {
      "redirect": "/unauthorized",
      "statusCode": 302
    },
    "404": {
      "redirect": "/404",
      "statusCode": 404
    }
  },
  "globalHeaders": {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' $BACKEND_URL;"
  }
}
EOF

    log_success "API proxy configuration created"
}

# =============================================================================
# MODULE: FRONTEND TESTING
# =============================================================================

test_frontend_deployment() {
    log_section "Testing Frontend Deployment"
    
    # Get the frontend URL
    local frontend_url="$FRONTEND_URL"
    
    log_info "Testing frontend at: $frontend_url"
    
    # Test frontend is accessible
    local max_attempts=20
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$frontend_url" &>/dev/null; then
            log_success "Frontend is accessible"
            break
        fi
        
        log_info "Attempt $attempt/$max_attempts - waiting 15 seconds..."
        sleep 15
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Frontend health check failed after $max_attempts attempts"
        exit 1
    fi
    
    # Test API connectivity through frontend
    log_info "Testing API connectivity..."
    local api_test_url="$frontend_url/api/health"
    
    if curl -f -s "$api_test_url" &>/dev/null; then
        log_success "API proxy is working"
    else
        log_warning "API proxy may not be working correctly"
        log_info "Direct backend URL: $BACKEND_URL/api/health"
    fi
}

# =============================================================================
# MODULE: HELPER FUNCTIONS
# =============================================================================

wait_for_static_web_app_ready() {
    local max_attempts=${1:-30}
    local attempt=1
    
    log_info "Waiting for Static Web App to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(az staticwebapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query properties.status -o tsv 2>/dev/null)
        
        if [ "$status" = "Ready" ]; then
            log_success "Static Web App is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Status: $status - waiting 30 seconds..."
        sleep 30
        ((attempt++))
    done
    
    log_error "Static Web App not ready after $max_attempts attempts"
    return 1
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "🎨 Digital Sponsor - Phase 3.1: Frontend Static Web App Deployment"
    echo "=================================================================="
    
    # Check prerequisites
    if [ ! -f "$SCRIPT_DIR/../.deployment-state" ] || ! grep -q "BACKEND_DEPLOYED=true" "$SCRIPT_DIR/../.deployment-state"; then
        log_error "Phase 2 (Backend) must be completed first"
        log_info "Run: ./deploy/modules/05-backend-container.sh"
        exit 1
    fi
    
    # Load backend URL from state
    source "$SCRIPT_DIR/../.deployment-state"
    
    if [ -z "$BACKEND_URL" ]; then
        log_error "BACKEND_URL not found in deployment state"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with deploying frontend Static Web App '$FRONTEND_APP_NAME'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    prepare_frontend_build
    create_static_web_app
    configure_api_proxy
    build_and_deploy_frontend
    configure_custom_domain
    test_frontend_deployment
    
    # Success summary
    echo ""
    log_success "✨ Phase 3.1 Complete: Frontend Static Web App Deployment"
    echo ""
    echo "📋 What was deployed:"
    echo "  • Static Web App: $FRONTEND_APP_NAME"
    echo "  • React Application: Production build"
    echo "  • API Proxy: Connected to $BACKEND_URL"
    echo "  • Custom Domain: $FULL_DOMAIN (DNS verification needed)"
    echo ""
    echo "🔗 Frontend URLs:"
    echo "  Default: $FRONTEND_URL"
    echo "  Custom (after DNS): https://$FULL_DOMAIN"
    echo ""
    echo "🎯 Features Available:"
    echo "  • React Frontend with PWA capabilities"
    echo "  • API proxy to backend RAG system"
    echo "  • Mobile-responsive design"
    echo "  • SSL/TLS encryption"
    echo "  • CDN distribution"
    echo ""
    echo "🔄 Next Step:"
    echo "  Run: ./deploy/modules/07-dns-configuration.sh"
    echo ""
    
    # Update state for next modules
    echo "FRONTEND_DEPLOYED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_3_1_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "FRONTEND_URL=$FRONTEND_URL" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi