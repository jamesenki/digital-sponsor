#!/bin/bash

# Azure Infrastructure Destruction Script
# Safely removes Digital Sponsor infrastructure

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
SUBSCRIPTION_ID="${2:-}"
RESOURCE_GROUP_NAME="rg-digital-sponsor-${ENVIRONMENT}"

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
Azure Infrastructure Destruction Script

USAGE:
    $0 [ENVIRONMENT] [SUBSCRIPTION_ID]

PARAMETERS:
    ENVIRONMENT      Target environment (dev, staging, prod) - Default: dev
    SUBSCRIPTION_ID  Azure subscription ID (optional)

EXAMPLES:
    $0 dev
    $0 staging 12345678-1234-1234-1234-123456789012

WARNING:
    This script will permanently delete all resources in the resource group.
    Use with caution, especially in production environments.

EOF
}

# Validation functions
validate_environment() {
    case $ENVIRONMENT in
        dev|staging|prod)
            log_info "Target environment: $ENVIRONMENT"
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

# Confirmation prompt
confirm_destruction() {
    echo ""
    log_warning "⚠️  DANGER: You are about to delete ALL resources in resource group: $RESOURCE_GROUP_NAME"
    log_warning "This action is IRREVERSIBLE and will permanently delete:"
    echo "  • Container Apps and environments"
    echo "  • Static Web Apps"
    echo "  • Cosmos DB databases and data"
    echo "  • Key Vault and all secrets"
    echo "  • Container Registry and images"
    echo "  • Redis Cache"
    echo "  • Log Analytics workspace and logs"
    echo "  • Application Insights data"
    echo ""
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_error "🚨 PRODUCTION ENVIRONMENT DETECTED!"
        log_error "This will delete production data and services!"
        echo ""
        read -p "Type 'DELETE PRODUCTION' to continue: " confirmation
        if [[ "$confirmation" != "DELETE PRODUCTION" ]]; then
            log_info "Destruction cancelled"
            exit 0
        fi
    else
        read -p "Type 'yes' to continue with destruction: " confirmation
        if [[ "$confirmation" != "yes" ]]; then
            log_info "Destruction cancelled"
            exit 0
        fi
    fi
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

# Backup critical data (optional)
backup_critical_data() {
    log_info "Checking for backup requirements..."
    
    if az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
        log_warning "Consider backing up critical data before destruction:"
        echo "  • Cosmos DB data"
        echo "  • Key Vault secrets"
        echo "  • Application logs"
        echo ""
        read -p "Have you backed up critical data? (y/N): " backup_confirmed
        if [[ "${backup_confirmed,,}" != "y" ]]; then
            log_warning "Consider running backup procedures first"
            log_info "Destruction cancelled"
            exit 0
        fi
    fi
}

# Remove resource locks
remove_resource_locks() {
    log_info "Checking for resource locks..."
    
    LOCKS=$(az lock list --resource-group "$RESOURCE_GROUP_NAME" --query "[].{Name:name,Level:level}" -o tsv 2>/dev/null || true)
    
    if [[ -n "$LOCKS" ]]; then
        log_warning "Found resource locks that need to be removed:"
        echo "$LOCKS"
        
        while IFS=$'\t' read -r lock_name lock_level; do
            if [[ -n "$lock_name" ]]; then
                log_info "Removing lock: $lock_name ($lock_level)"
                az lock delete --name "$lock_name" --resource-group "$RESOURCE_GROUP_NAME"
            fi
        done <<< "$LOCKS"
    fi
}

# Gracefully stop services
stop_services() {
    log_info "Gracefully stopping services..."
    
    # Stop Container Apps
    CONTAINER_APPS=$(az containerapp list --resource-group "$RESOURCE_GROUP_NAME" --query "[].name" -o tsv 2>/dev/null || true)
    for app in $CONTAINER_APPS; do
        if [[ -n "$app" ]]; then
            log_info "Stopping Container App: $app"
            az containerapp update --name "$app" --resource-group "$RESOURCE_GROUP_NAME" --min-replicas 0 --max-replicas 0 || true
        fi
    done
    
    log_info "Waiting for services to stop gracefully..."
    sleep 30
}

# Delete resource group
delete_resource_group() {
    log_info "Deleting resource group: $RESOURCE_GROUP_NAME"
    
    if ! az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
        log_warning "Resource group does not exist: $RESOURCE_GROUP_NAME"
        return 0
    fi
    
    # Start deletion
    az group delete \
        --name "$RESOURCE_GROUP_NAME" \
        --yes \
        --no-wait
    
    log_info "Resource group deletion initiated (running in background)"
    log_info "You can monitor progress with: az group wait --name '$RESOURCE_GROUP_NAME' --deleted"
}

# Cleanup GitHub secrets (optional)
cleanup_github_secrets() {
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        log_info "Cleaning up GitHub secrets..."
        
        REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/' 2>/dev/null || true)
        if [[ -n "$REPO" ]]; then
            # Remove environment-specific secrets
            gh secret delete "AZURE_STATIC_WEB_APPS_API_TOKEN_${ENVIRONMENT^^}" --repo "$REPO" 2>/dev/null || true
            log_success "GitHub secrets cleaned up"
        fi
    fi
}

# Verify deletion
verify_deletion() {
    log_info "Verifying resource group deletion..."
    
    # Wait for deletion to complete (with timeout)
    local timeout=600  # 10 minutes
    local elapsed=0
    
    while az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; do
        if [[ $elapsed -ge $timeout ]]; then
            log_warning "Deletion is taking longer than expected. Check Azure portal for status."
            break
        fi
        
        echo -n "."
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    echo ""
    
    if ! az group show --name "$RESOURCE_GROUP_NAME" &> /dev/null; then
        log_success "Resource group successfully deleted"
    else
        log_warning "Resource group deletion is still in progress"
    fi
}

# Main execution
main() {
    # Handle help flag
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    log_info "Starting Azure infrastructure destruction for Digital Sponsor"
    log_info "Environment: $ENVIRONMENT"
    log_info "Resource Group: $RESOURCE_GROUP_NAME"
    echo ""
    
    # Execute destruction steps
    validate_environment
    validate_azure_cli
    set_subscription
    backup_critical_data
    confirm_destruction
    remove_resource_locks
    stop_services
    delete_resource_group
    cleanup_github_secrets
    verify_deletion
    
    log_success "✅ Infrastructure destruction completed!"
    log_info "The following items may require manual cleanup:"
    echo "  • DNS records (if using custom domain)"
    echo "  • External monitoring configurations"
    echo "  • Third-party service integrations"
}

# Execute main function with all arguments
main "$@"