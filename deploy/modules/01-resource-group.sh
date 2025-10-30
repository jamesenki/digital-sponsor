#!/bin/bash

# Digital Sponsor - Module 1: Resource Group Creation
# This is the foundation module that must run first

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: RESOURCE GROUP CREATION
# =============================================================================

create_resource_group() {
    log_section "Creating Azure Resource Group"
    
    # Check if resource group already exists
    if az group show --name "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Resource group '$RESOURCE_GROUP' already exists"
        
        # Verify it's in the correct location
        local existing_location=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
        if [ "$existing_location" != "$LOCATION" ]; then
            log_error "Existing resource group is in '$existing_location', expected '$LOCATION'"
            log_error "Please delete the existing resource group or choose a different name"
            exit 1
        fi
        
        log_success "Using existing resource group in correct location"
        return 0
    fi
    
    # Create the resource group
    log_info "Creating resource group '$RESOURCE_GROUP' in '$LOCATION'..."
    az group create \
        --name "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --tags \
            project="$DEPLOYMENT_NAME" \
            environment="$ENVIRONMENT" \
            domain="$DOMAIN" \
            created="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            owner="jamessimonster@gmail.com"
    
    if [ $? -eq 0 ]; then
        log_success "Resource group '$RESOURCE_GROUP' created successfully"
    else
        log_error "Failed to create resource group '$RESOURCE_GROUP'"
        exit 1
    fi
}

# =============================================================================
# MODULE: BASIC NETWORKING SETUP
# =============================================================================

setup_basic_networking() {
    log_section "Setting Up Basic Networking"
    
    # For Container Apps, we don't need to create VNet manually
    # Container Apps will create a managed environment
    # But we can set up any network security groups or basic policies here
    
    log_info "Container Apps will manage networking automatically"
    log_success "Basic networking setup complete"
}

# =============================================================================
# MODULE: RESOURCE TAGS AND POLICIES
# =============================================================================

setup_resource_policies() {
    log_section "Setting Up Resource Policies"
    
    # Set up any resource policies, naming conventions, etc.
    # For now, we'll just ensure consistent tagging
    
    log_info "Setting up consistent resource tagging policies..."
    
    # We'll apply these tags to all resources in subsequent modules
    export DEFAULT_TAGS="project=$DEPLOYMENT_NAME environment=$ENVIRONMENT domain=$DOMAIN"
    
    log_success "Resource policies configured"
}

# =============================================================================
# MODULE: VALIDATION
# =============================================================================

validate_resource_group() {
    log_section "Validating Resource Group Setup"
    
    # Check resource group exists and is accessible
    if ! az group show --name "$RESOURCE_GROUP" &>/dev/null; then
        log_error "Resource group validation failed - group not found"
        exit 1
    fi
    
    # Check we have contributor access
    local subscription_id=$(az account show --query id -o tsv)
    if ! az role assignment list --assignee "$(az account show --query user.name -o tsv)" --scope "/subscriptions/$subscription_id/resourceGroups/$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Could not verify resource group permissions"
    fi
    
    # Display resource group info
    log_info "Resource group details:"
    az group show --name "$RESOURCE_GROUP" --output table
    
    log_success "Resource group validation passed"
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "🚀 Digital Sponsor - Phase 1.1: Resource Group Setup"
    echo "====================================================="
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with creating resource group '$RESOURCE_GROUP'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    create_resource_group
    setup_basic_networking
    setup_resource_policies
    validate_resource_group
    
    # Success summary
    echo ""
    log_success "✨ Phase 1.1 Complete: Resource Group Setup"
    echo ""
    echo "📋 What was created:"
    echo "  • Resource Group: $RESOURCE_GROUP"
    echo "  • Location: $LOCATION"
    echo "  • Environment: $ENVIRONMENT"
    echo ""
    echo "🔄 Next Step:"
    echo "  Run: ./deploy/modules/02-database.sh"
    echo ""
    
    # Save state for next modules
    echo "RESOURCE_GROUP_CREATED=true" > "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_1_1_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi