#!/bin/bash

# Azure Key Vault Secret Rotation Script
# Automates secure rotation of critical secrets

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default values
ENVIRONMENT="${1:-dev}"
KEY_VAULT_NAME="${2:-}"
SECRET_NAME="${3:-}"
ROTATION_MODE="${4:-manual}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Help function
show_help() {
    cat << EOF
Azure Key Vault Secret Rotation Script

USAGE:
    $0 [ENVIRONMENT] [KEY_VAULT_NAME] [SECRET_NAME] [ROTATION_MODE]

PARAMETERS:
    ENVIRONMENT      Target environment (dev, staging, prod)
    KEY_VAULT_NAME   Key Vault name (auto-detected if not provided)
    SECRET_NAME      Specific secret to rotate (optional, rotates all if not specified)
    ROTATION_MODE    Rotation mode: manual, automatic, emergency (default: manual)

EXAMPLES:
    $0 prod                                    # Rotate all secrets in production
    $0 dev kv-digitalsponsordev jwt-secret    # Rotate specific secret
    $0 prod "" "" emergency                   # Emergency rotation of all secrets

ROTATABLE SECRETS:
    • jwt-secret, jwt-refresh-secret
    • step-work-encryption-key, session-encryption-key
    • smtp-password (if using dynamic credentials)
    • api-keys (meeting-finder, literature-api)

NON-ROTATABLE SECRETS (manual only):
    • openai-api-key (requires manual update with OpenAI)
    • admin-email (configuration, not secret)
    • crisis-hotline-* (public numbers, not rotatable)

EOF
}

# Generate secure random string
generate_secure_string() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Detect Key Vault name
detect_key_vault() {
    if [[ -z "$KEY_VAULT_NAME" ]]; then
        RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
        KEY_VAULT_NAME=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
        
        if [[ -z "$KEY_VAULT_NAME" ]]; then
            log_error "Could not detect Key Vault. Please provide the Key Vault name."
            exit 1
        fi
    fi
    log_info "Using Key Vault: $KEY_VAULT_NAME"
}

# Check Key Vault access
check_access() {
    if ! az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[0].name" -o tsv &> /dev/null; then
        log_error "No access to Key Vault '$KEY_VAULT_NAME'"
        exit 1
    fi
}

# Backup secret before rotation
backup_secret() {
    local secret_name="$1"
    local timestamp=$(date -u +%Y%m%d-%H%M%S)
    local backup_name="${secret_name}-backup-${timestamp}"
    
    log_info "Creating backup: $backup_name"
    
    # Get current secret value
    local current_value=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret_name" --query "value" -o tsv)
    
    # Store backup with expiration (90 days)
    local expiry_date=$(date -d "+90 days" -u +%Y-%m-%dT%H:%M:%SZ)
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$backup_name" \
        --value "$current_value" \
        --expires "$expiry_date" \
        --content-type "text/plain" \
        --tags \
            isBackup="true" \
            originalSecret="$secret_name" \
            rotatedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rotationMode="$ROTATION_MODE" \
        > /dev/null
    
    log_success "Backup created: $backup_name (expires: $expiry_date)"
}

# Rotate JWT secrets
rotate_jwt_secret() {
    local secret_name="$1"
    log_info "Rotating JWT secret: $secret_name"
    
    backup_secret "$secret_name"
    
    local new_value=$(generate_secure_string 64)
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$new_value" \
        --content-type "text/plain" \
        --tags \
            rotatedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rotatedBy="rotation-script" \
            rotationMode="$ROTATION_MODE" \
            previousBackup="${secret_name}-backup-$(date -u +%Y%m%d-%H%M%S)" \
        > /dev/null
    
    log_success "Rotated: $secret_name"
}

# Rotate encryption keys
rotate_encryption_key() {
    local secret_name="$1"
    log_info "Rotating encryption key: $secret_name"
    
    backup_secret "$secret_name"
    
    local key_length=64
    if [[ "$secret_name" == "session-encryption-key" ]]; then
        key_length=32
    fi
    
    local new_value=$(generate_secure_string "$key_length")
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$new_value" \
        --content-type "text/plain" \
        --tags \
            rotatedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rotatedBy="rotation-script" \
            rotationMode="$ROTATION_MODE" \
            keyLength="$key_length" \
        > /dev/null
    
    log_success "Rotated: $secret_name"
    
    # Additional warning for encryption keys
    if [[ "$secret_name" == "step-work-encryption-key" ]]; then
        log_warning "IMPORTANT: Step work data encrypted with old key will need re-encryption"
        log_warning "Ensure proper data migration is performed"
    fi
}

# Rotate API keys
rotate_api_key() {
    local secret_name="$1"
    log_info "Rotating API key: $secret_name"
    
    case "$secret_name" in
        "meeting-finder-api-key"|"literature-api-key")
            log_warning "API key rotation for external services requires manual coordination"
            log_info "1. Generate new key with external provider"
            log_info "2. Test new key"
            log_info "3. Update Key Vault"
            log_info "4. Deploy applications"
            log_info "5. Revoke old key"
            
            if [[ "$ROTATION_MODE" == "automatic" ]]; then
                log_warning "Skipping automatic rotation - manual intervention required"
                return 0
            fi
            ;;
    esac
    
    backup_secret "$secret_name"
    
    # Generate placeholder for manual replacement
    local new_value="REPLACE_WITH_NEW_$(echo "$secret_name" | tr '[:lower:]' '[:upper:]' | tr '-' '_')_$(date +%Y%m%d)"
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$new_value" \
        --content-type "text/plain" \
        --tags \
            rotatedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            rotatedBy="rotation-script" \
            rotationMode="$ROTATION_MODE" \
            requiresManualUpdate="true" \
        > /dev/null
    
    log_warning "Rotated with placeholder: $secret_name"
    log_warning "Manual update required with actual API key"
}

# Get secrets that can be rotated
get_rotatable_secrets() {
    local all_secrets=(
        "jwt-secret"
        "jwt-refresh-secret"
        "step-work-encryption-key"
        "session-encryption-key"
        "file-encryption-key"
        "meeting-finder-api-key"
        "literature-api-key"
    )
    
    local existing_secrets=()
    
    for secret in "${all_secrets[@]}"; do
        if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret" &> /dev/null; then
            existing_secrets+=("$secret")
        fi
    done
    
    echo "${existing_secrets[@]}"
}

# Rotate specific secret
rotate_secret() {
    local secret_name="$1"
    
    log_info "Starting rotation for: $secret_name"
    
    # Check if secret exists
    if ! az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret_name" &> /dev/null; then
        log_error "Secret '$secret_name' not found in Key Vault"
        return 1
    fi
    
    # Determine rotation method based on secret type
    case "$secret_name" in
        jwt-secret|jwt-refresh-secret)
            rotate_jwt_secret "$secret_name"
            ;;
        *encryption-key)
            rotate_encryption_key "$secret_name"
            ;;
        *api-key)
            rotate_api_key "$secret_name"
            ;;
        *)
            log_warning "Unknown secret type: $secret_name"
            log_info "Using generic rotation method"
            backup_secret "$secret_name"
            
            local new_value=$(generate_secure_string 32)
            az keyvault secret set \
                --vault-name "$KEY_VAULT_NAME" \
                --name "$secret_name" \
                --value "$new_value" \
                --tags rotatedAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
                > /dev/null
            
            log_success "Rotated: $secret_name"
            ;;
    esac
}

# Verify applications still work after rotation
verify_rotation() {
    log_info "Verifying rotation impact..."
    
    # Check if Container Apps are running
    RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
    CONTAINER_APPS=$(az containerapp list --resource-group "$RESOURCE_GROUP" --query "[].name" -o tsv 2>/dev/null || true)
    
    for app in $CONTAINER_APPS; do
        log_info "Restarting Container App: $app"
        
        # Restart to pick up new secrets
        az containerapp revision restart \
            --resource-group "$RESOURCE_GROUP" \
            --name "$app" \
            > /dev/null 2>&1 || log_warning "Could not restart $app"
    done
    
    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 30
    
    # Basic health check (if health endpoint exists)
    local api_url=$(az containerapp show --resource-group "$RESOURCE_GROUP" --name "$CONTAINER_APPS" --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || true)
    
    if [[ -n "$api_url" ]]; then
        if curl -f -s "https://$api_url/api/health" > /dev/null; then
            log_success "Health check passed"
        else
            log_warning "Health check failed - may need manual intervention"
        fi
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than 90 days..."
    
    local cutoff_date=$(date -d "-90 days" +%Y-%m-%d)
    
    # List all backup secrets
    local backup_secrets=$(az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[?tags.isBackup=='true'].name" -o tsv)
    
    for backup in $backup_secrets; do
        local created_date=$(az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$backup" --query "attributes.created" -o tsv | cut -c1-10)
        
        if [[ "$created_date" < "$cutoff_date" ]]; then
            log_info "Deleting old backup: $backup"
            az keyvault secret delete --vault-name "$KEY_VAULT_NAME" --name "$backup" > /dev/null
        fi
    done
}

# Emergency rotation
emergency_rotation() {
    log_error "🚨 EMERGENCY ROTATION MODE ACTIVATED"
    log_warning "This will rotate ALL rotatable secrets immediately"
    
    echo ""
    read -p "Type 'EMERGENCY' to confirm emergency rotation: " confirmation
    if [[ "$confirmation" != "EMERGENCY" ]]; then
        log_info "Emergency rotation cancelled"
        exit 0
    fi
    
    log_info "Starting emergency rotation of all secrets..."
    
    local secrets=($(get_rotatable_secrets))
    for secret in "${secrets[@]}"; do
        rotate_secret "$secret"
    done
    
    verify_rotation
    
    log_error "🚨 EMERGENCY ROTATION COMPLETED"
    log_warning "All rotatable secrets have been changed"
    log_warning "Manual intervention may be required for external API keys"
}

# Main execution
main() {
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    log_info "Starting secret rotation for Digital Sponsor"
    log_info "Environment: $ENVIRONMENT"
    log_info "Rotation Mode: $ROTATION_MODE"
    echo ""
    
    # Validation
    if ! command -v az &> /dev/null; then
        log_error "Azure CLI is not installed"
        exit 1
    fi
    
    if ! az account show &> /dev/null; then
        log_error "Not logged in to Azure CLI"
        exit 1
    fi
    
    detect_key_vault
    check_access
    
    # Handle emergency mode
    if [[ "$ROTATION_MODE" == "emergency" ]]; then
        emergency_rotation
        exit 0
    fi
    
    # Rotate specific secret or all rotatable secrets
    if [[ -n "$SECRET_NAME" ]]; then
        rotate_secret "$SECRET_NAME"
    else
        log_info "Rotating all rotatable secrets..."
        local secrets=($(get_rotatable_secrets))
        
        if [[ ${#secrets[@]} -eq 0 ]]; then
            log_warning "No rotatable secrets found"
            exit 0
        fi
        
        log_info "Found ${#secrets[@]} rotatable secrets: ${secrets[*]}"
        
        if [[ "$ROTATION_MODE" == "manual" ]]; then
            echo ""
            read -p "Continue with rotation? (y/N): " confirmation
            if [[ "${confirmation,,}" != "y" ]]; then
                log_info "Rotation cancelled"
                exit 0
            fi
        fi
        
        for secret in "${secrets[@]}"; do
            rotate_secret "$secret"
        done
    fi
    
    # Post-rotation steps
    verify_rotation
    cleanup_old_backups
    
    log_success "✅ Secret rotation completed successfully!"
    
    echo ""
    log_info "Post-rotation checklist:"
    echo "1. Monitor application health and logs"
    echo "2. Update any external API keys manually"
    echo "3. Test critical user flows"
    echo "4. Update CI/CD pipeline secrets if needed"
    echo "5. Document rotation in change log"
}

main "$@"