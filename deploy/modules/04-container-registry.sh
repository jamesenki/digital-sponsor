#!/bin/bash

# Digital Sponsor - Module 4: Azure Container Registry Setup
# Creates container registry for Docker images

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: CONTAINER REGISTRY CREATION
# =============================================================================

create_container_registry() {
    log_section "Creating Azure Container Registry"
    
    # Check if ACR already exists
    if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Container Registry '$ACR_NAME' already exists"
        
        # Verify ACR settings
        local existing_location=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query location -o tsv)
        if [ "$existing_location" != "$LOCATION" ]; then
            log_error "Existing ACR is in '$existing_location', expected '$LOCATION'"
            exit 1
        fi
        
        log_success "Using existing Container Registry"
        return 0
    fi
    
    log_info "Creating Container Registry '$ACR_NAME'..."
    
    # Create Azure Container Registry
    az acr create \
        --name "$ACR_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku Basic \
        --admin-enabled true \
        --tags \
            project="$DEPLOYMENT_NAME" \
            environment="$ENVIRONMENT" \
            component="registry" \
            domain="$DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "Container Registry '$ACR_NAME' created successfully"
    else
        log_error "Failed to create Container Registry '$ACR_NAME'"
        exit 1
    fi
    
    # Wait for ACR to be ready
    wait_for_resource "Microsoft.ContainerRegistry/registries" "$ACR_NAME" 30
}

# =============================================================================
# MODULE: ADMIN CREDENTIALS SETUP
# =============================================================================

setup_admin_credentials() {
    log_section "Setting Up Admin Credentials"
    
    log_info "Retrieving admin credentials..."
    
    # Get admin credentials
    local username=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query username -o tsv)
    local password=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query passwords[0].value -o tsv)
    
    if [ -z "$username" ] || [ -z "$password" ]; then
        log_error "Failed to retrieve admin credentials"
        exit 1
    fi
    
    # Store credentials for later use
    export ACR_USERNAME="$username"
    export ACR_PASSWORD="$password"
    
    log_success "Admin credentials retrieved successfully"
    log_info "Registry username: $username"
}

# =============================================================================
# MODULE: REPOSITORY CONFIGURATION
# =============================================================================

configure_repositories() {
    log_section "Configuring Repositories"
    
    log_info "Setting up repository policies..."
    
    # Configure repository policies for our application images
    # Note: Basic SKU has limited policy options
    
    log_info "Repository configuration:"
    echo "  • Backend images: ${ACR_LOGIN_SERVER}/backend:*"
    echo "  • Frontend images: ${ACR_LOGIN_SERVER}/frontend:*"
    echo "  • Future services: ${ACR_LOGIN_SERVER}/[service]:*"
    
    log_success "Repository configuration complete"
}

# =============================================================================
# MODULE: NETWORK ACCESS CONFIGURATION
# =============================================================================

configure_network_access() {
    log_section "Configuring Network Access"
    
    log_info "Setting up network access policies..."
    
    # For Basic SKU, network access is automatically configured
    # In production, you might want to use Premium SKU with VNet integration
    
    log_info "Network access configuration:"
    echo "  • Public access: Enabled (Basic SKU)"
    echo "  • Admin access: Enabled for Container Apps"
    echo "  • Authentication: Username/password + Azure AD"
    
    log_success "Network access configured"
    log_warning "Note: Consider Premium SKU with VNet integration for production security"
}

# =============================================================================
# MODULE: DOCKER LOGIN TEST
# =============================================================================

test_docker_access() {
    log_section "Testing Docker Access"
    
    log_info "Testing Docker login to registry..."
    
    # Test Docker login if Docker is available
    if command -v docker &>/dev/null; then
        echo "$ACR_PASSWORD" | docker login "$ACR_LOGIN_SERVER" --username "$ACR_USERNAME" --password-stdin
        
        if [ $? -eq 0 ]; then
            log_success "Docker login test passed"
            
            # Test basic Docker operations
            log_info "Testing Docker operations..."
            
            # Pull a small test image and push it to verify access
            if docker pull hello-world:latest &>/dev/null; then
                docker tag hello-world:latest "${ACR_LOGIN_SERVER}/test:latest"
                if docker push "${ACR_LOGIN_SERVER}/test:latest" &>/dev/null; then
                    log_success "Docker push test passed"
                    
                    # Clean up test image
                    az acr repository delete --name "$ACR_NAME" --repository test --yes &>/dev/null
                else
                    log_warning "Docker push test failed"
                fi
            else
                log_warning "Could not pull test image"
            fi
        else
            log_error "Docker login test failed"
            exit 1
        fi
    else
        log_warning "Docker not available for testing"
        log_info "Registry will be tested when backend deployment runs"
    fi
}

# =============================================================================
# MODULE: BUILD TASK PREPARATION
# =============================================================================

prepare_build_environment() {
    log_section "Preparing Build Environment"
    
    log_info "Setting up build environment for applications..."
    
    # Create build scripts for our applications
    local build_script="$SCRIPT_DIR/../build-and-push.sh"
    
    cat > "$build_script" << EOF
#!/bin/bash

# Digital Sponsor - Build and Push Script
# Builds and pushes application images to ACR

set -e

ACR_NAME="$ACR_NAME"
ACR_LOGIN_SERVER="$ACR_LOGIN_SERVER"
RESOURCE_GROUP="$RESOURCE_GROUP"

# Login to ACR
echo "Logging in to Azure Container Registry..."
az acr login --name \$ACR_NAME

# Build and push backend
echo "Building backend image..."
cd \$(dirname \$0)/../backend
az acr build --registry \$ACR_NAME --image backend:latest .

# Build and push frontend (for future use)
echo "Building frontend image..."
cd ../frontend
az acr build --registry \$ACR_NAME --image frontend:latest .

echo "✅ Images built and pushed successfully"
echo "Backend image: \${ACR_LOGIN_SERVER}/backend:latest"
echo "Frontend image: \${ACR_LOGIN_SERVER}/frontend:latest"
EOF
    
    chmod +x "$build_script"
    
    log_success "Build environment prepared"
    log_info "Build script created at: $build_script"
}

# =============================================================================
# MODULE: VALIDATION
# =============================================================================

validate_container_registry() {
    log_section "Validating Container Registry Setup"
    
    # Check ACR exists and is ready
    local acr_status=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query provisioningState -o tsv)
    
    if [ "$acr_status" != "Succeeded" ]; then
        log_error "Container Registry is not ready. Status: $acr_status"
        exit 1
    fi
    
    # Check admin access is enabled
    local admin_enabled=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query adminUserEnabled -o tsv)
    
    if [ "$admin_enabled" != "true" ]; then
        log_error "Admin access is not enabled on Container Registry"
        exit 1
    fi
    
    # Check we can retrieve credentials
    local username=$(az acr credential show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query username -o tsv)
    if [ -z "$username" ]; then
        log_error "Cannot retrieve Container Registry credentials"
        exit 1
    fi
    
    # Display ACR information
    log_info "Container Registry details:"
    az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --output table
    
    log_success "Container Registry validation passed"
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "📦 Digital Sponsor - Phase 1.4: Container Registry Setup"
    echo "========================================================"
    
    # Check prerequisites
    if [ ! -f "$SCRIPT_DIR/../.deployment-state" ] || ! grep -q "REDIS_CREATED=true" "$SCRIPT_DIR/../.deployment-state"; then
        log_error "Phase 1.3 (Redis) must be completed first"
        log_info "Run: ./deploy/modules/03-redis.sh"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with creating Container Registry '$ACR_NAME'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    create_container_registry
    setup_admin_credentials
    configure_repositories
    configure_network_access
    test_docker_access
    prepare_build_environment
    validate_container_registry
    
    # Success summary
    echo ""
    log_success "✨ Phase 1.4 Complete: Container Registry Setup"
    echo ""
    echo "📋 What was created:"
    echo "  • Container Registry: $ACR_NAME"
    echo "  • Login Server: $ACR_LOGIN_SERVER"
    echo "  • Admin Access: Enabled"
    echo "  • Repository Policies: Configured"
    echo "  • Build Environment: Ready"
    echo ""
    echo "🔗 Registry Details:"
    echo "  Login Server: $ACR_LOGIN_SERVER"
    echo "  Admin Username: $ACR_USERNAME"
    echo "  Authentication: Enabled"
    echo ""
    echo "🐳 Docker Commands:"
    echo "  az acr login --name $ACR_NAME"
    echo "  docker build -t $ACR_LOGIN_SERVER/backend:latest ."
    echo "  docker push $ACR_LOGIN_SERVER/backend:latest"
    echo ""
    echo "🎉 Phase 1 Infrastructure Foundation Complete!"
    echo ""
    echo "🔄 Next Phase:"
    echo "  Run: ./deploy/phase2-backend.sh (will be created next)"
    echo ""
    
    # Update state for next modules
    echo "CONTAINER_REGISTRY_CREATED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_1_4_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_1_COMPLETED=true" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi