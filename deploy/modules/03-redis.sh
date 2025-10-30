#!/bin/bash

# Digital Sponsor - Module 3: Redis Cache Setup
# Creates Redis cache for session management and caching

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: REDIS CACHE CREATION
# =============================================================================

create_redis_cache() {
    log_section "Creating Redis Cache"
    
    # Check if Redis cache already exists
    if az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "Redis cache '$REDIS_NAME' already exists"
        
        # Verify cache settings
        local existing_location=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query location -o tsv)
        if [ "$existing_location" != "$LOCATION" ]; then
            log_error "Existing Redis cache is in '$existing_location', expected '$LOCATION'"
            exit 1
        fi
        
        log_success "Using existing Redis cache"
        return 0
    fi
    
    log_info "Creating Redis cache '$REDIS_NAME'..."
    
    # Create Redis Cache
    az redis create \
        --name "$REDIS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku "$REDIS_SKU" \
        --vm-size "$REDIS_VM_SIZE" \
        --tags \
            project="$DEPLOYMENT_NAME" \
            environment="$ENVIRONMENT" \
            component="cache" \
            domain="$DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "Redis cache '$REDIS_NAME' created successfully"
    else
        log_error "Failed to create Redis cache '$REDIS_NAME'"
        exit 1
    fi
    
    # Wait for Redis to be ready
    wait_for_redis_ready 60
}

# =============================================================================
# MODULE: REDIS CONFIGURATION
# =============================================================================

configure_redis_settings() {
    log_section "Configuring Redis Settings"
    
    log_info "Configuring Redis cache settings..."
    
    # Configure Redis settings for session management
    # Note: Basic tier has limited configuration options
    
    # Set maxmemory policy for session management
    az redis patch \
        --name "$REDIS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --set "redisConfiguration.maxmemory-policy=allkeys-lru"
    
    if [ $? -eq 0 ]; then
        log_success "Redis configuration updated"
    else
        log_warning "Redis configuration update failed (may not be supported in Basic tier)"
    fi
}

# =============================================================================
# MODULE: ACCESS KEY MANAGEMENT
# =============================================================================

setup_redis_access() {
    log_section "Setting Up Redis Access"
    
    log_info "Retrieving Redis access keys..."
    
    # Get Redis keys
    local primary_key=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv)
    local secondary_key=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query secondaryKey -o tsv)
    
    if [ -z "$primary_key" ]; then
        log_error "Failed to retrieve Redis primary key"
        exit 1
    fi
    
    # Get Redis hostname
    local hostname=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query hostName -o tsv)
    local port=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query sslPort -o tsv)
    
    # Create connection string
    export REDIS_CONNECTION_STRING="redis://${hostname}:${port}?password=${primary_key}"
    
    log_success "Redis access keys retrieved successfully"
    log_info "Redis hostname: $hostname"
    log_info "Redis SSL port: $port"
}

# =============================================================================
# MODULE: FIREWALL CONFIGURATION
# =============================================================================

configure_redis_firewall() {
    log_section "Configuring Redis Firewall"
    
    log_info "Setting up Redis firewall rules..."
    
    # For Basic Redis, we need to allow access from Azure services
    # In production, you'd use VNet integration for better security
    
    # Get current firewall rules
    local rules=$(az redis firewall-rule list --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query length(@))
    
    if [ "$rules" -eq 0 ]; then
        log_info "Adding firewall rule for Azure services..."
        
        # Allow Azure services (0.0.0.0 is a special case for Azure services)
        az redis firewall-rule create \
            --name "AllowAzureServices" \
            --resource-group "$RESOURCE_GROUP" \
            --redis-name "$REDIS_NAME" \
            --start-ip 0.0.0.0 \
            --end-ip 0.0.0.0
        
        log_success "Redis firewall rules configured"
    else
        log_info "Firewall rules already exist"
    fi
    
    log_warning "Note: Using basic firewall rules. Consider VNet integration for production."
}

# =============================================================================
# MODULE: CONNECTION TESTING
# =============================================================================

test_redis_connection() {
    log_section "Testing Redis Connection"
    
    log_info "Testing connection to Redis cache..."
    
    # Test Redis connection using redis-cli if available
    if command -v redis-cli &>/dev/null; then
        local hostname=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query hostName -o tsv)
        local port=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query sslPort -o tsv)
        local primary_key=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv)
        
        if redis-cli -h "$hostname" -p "$port" -a "$primary_key" --tls ping | grep -q "PONG"; then
            log_success "Redis connection test passed"
        else
            log_error "Redis connection test failed"
            exit 1
        fi
    else
        log_warning "redis-cli not available for connection testing"
        log_info "Connection will be tested when backend is deployed"
    fi
}

# =============================================================================
# MODULE: HELPER FUNCTIONS
# =============================================================================

wait_for_redis_ready() {
    local max_attempts=${1:-30}
    local attempt=1
    
    log_info "Waiting for Redis cache to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        local status=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query provisioningState -o tsv 2>/dev/null)
        
        if [ "$status" = "Succeeded" ]; then
            log_success "Redis cache is ready"
            return 0
        fi
        
        log_info "Attempt $attempt/$max_attempts - Redis status: $status - waiting 60 seconds..."
        sleep 60
        ((attempt++))
    done
    
    log_error "Redis cache not ready after $max_attempts attempts"
    return 1
}

# =============================================================================
# MODULE: VALIDATION
# =============================================================================

validate_redis() {
    log_section "Validating Redis Setup"
    
    # Check Redis exists and is running
    local redis_status=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query provisioningState -o tsv)
    
    if [ "$redis_status" != "Succeeded" ]; then
        log_error "Redis cache is not ready. Status: $redis_status"
        exit 1
    fi
    
    # Check we can retrieve keys
    local primary_key=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv)
    if [ -z "$primary_key" ]; then
        log_error "Cannot retrieve Redis primary key"
        exit 1
    fi
    
    # Display Redis information
    log_info "Redis cache details:"
    az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --output table
    
    log_success "Redis validation passed"
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "⚡ Digital Sponsor - Phase 1.3: Redis Cache Setup"
    echo "================================================="
    
    # Check prerequisites
    if [ ! -f "$SCRIPT_DIR/../.deployment-state" ] || ! grep -q "DATABASE_CREATED=true" "$SCRIPT_DIR/../.deployment-state"; then
        log_error "Phase 1.2 (Database) must be completed first"
        log_info "Run: ./deploy/modules/02-database.sh"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with creating Redis cache '$REDIS_NAME'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    create_redis_cache
    configure_redis_settings
    setup_redis_access
    configure_redis_firewall
    test_redis_connection
    validate_redis
    
    # Success summary
    echo ""
    log_success "✨ Phase 1.3 Complete: Redis Cache Setup"
    echo ""
    echo "📋 What was created:"
    echo "  • Redis Cache: $REDIS_NAME"
    echo "  • SKU: $REDIS_SKU ($REDIS_VM_SIZE)"
    echo "  • SSL Port: 6380"
    echo "  • Firewall Rules: Configured"
    echo "  • Access Keys: Retrieved"
    echo ""
    echo "🔗 Connection Details:"
    echo "  Host: ${REDIS_NAME}.redis.cache.windows.net"
    echo "  SSL Port: 6380"
    echo "  Auth: Required (access key)"
    echo ""
    echo "🔄 Next Step:"
    echo "  Run: ./deploy/modules/04-container-registry.sh"
    echo ""
    
    # Update state for next modules
    echo "REDIS_CREATED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_1_3_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "REDIS_URL=$(get_redis_connection_string)" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi