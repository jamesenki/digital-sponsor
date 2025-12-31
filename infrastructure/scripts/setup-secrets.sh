#!/bin/bash

# Azure Key Vault Secret Setup Script
# Securely configures all required secrets for Digital Sponsor

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRASTRUCTURE_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$INFRASTRUCTURE_DIR")"

# Default values
ENVIRONMENT="${1:-dev}"
SUBSCRIPTION_ID="${2:-}"
KEY_VAULT_NAME="${3:-}"

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
Azure Key Vault Secret Setup Script

USAGE:
    $0 [ENVIRONMENT] [SUBSCRIPTION_ID] [KEY_VAULT_NAME]

PARAMETERS:
    ENVIRONMENT      Target environment (dev, staging, prod) - Default: dev
    SUBSCRIPTION_ID  Azure subscription ID (optional)
    KEY_VAULT_NAME   Key Vault name (auto-detected if not provided)

EXAMPLES:
    $0 dev
    $0 staging 12345678-1234-1234-1234-123456789012
    $0 prod 12345678-1234-1234-1234-123456789012 kv-digitalsponsorprod

SECRETS CONFIGURED:
    • OpenAI API key
    • JWT secret for authentication
    • SMTP configuration for email
    • Database connection strings
    • Redis connection strings
    • Admin email address
    • Crisis hotline numbers
    • Encryption keys

EOF
}

# Validation functions
validate_environment() {
    case $ENVIRONMENT in
        dev|staging|prod)
            log_info "Setting up secrets for environment: $ENVIRONMENT"
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

# Detect Key Vault name
detect_key_vault() {
    if [[ -z "$KEY_VAULT_NAME" ]]; then
        RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
        
        log_info "Auto-detecting Key Vault in resource group: $RESOURCE_GROUP"
        
        KEY_VAULT_NAME=$(az keyvault list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
        
        if [[ -z "$KEY_VAULT_NAME" ]]; then
            log_error "Could not detect Key Vault. Please provide the Key Vault name as a parameter."
            exit 1
        fi
    fi
    
    log_info "Using Key Vault: $KEY_VAULT_NAME"
}

# Check Key Vault access
check_key_vault_access() {
    log_info "Checking Key Vault access permissions..."
    
    if ! az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[0].name" -o tsv &> /dev/null; then
        log_error "No access to Key Vault '$KEY_VAULT_NAME'. Please check permissions."
        log_info "Required permissions: Key Vault Secrets Officer or Key Vault Administrator"
        exit 1
    fi
    
    log_success "Key Vault access confirmed"
}

# Generate secure random string
generate_secure_string() {
    local length="${1:-32}"
    openssl rand -base64 "$length" | tr -d "=+/" | cut -c1-"$length"
}

# Set secret safely with confirmation
set_secret() {
    local secret_name="$1"
    local secret_value="$2"
    local description="$3"
    local overwrite="${4:-false}"
    
    # Check if secret already exists
    if az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret_name" &> /dev/null; then
        if [[ "$overwrite" != "true" ]]; then
            log_warning "Secret '$secret_name' already exists. Use --overwrite to replace it."
            return 0
        else
            log_info "Overwriting existing secret: $secret_name"
        fi
    fi
    
    log_info "Setting secret: $secret_name ($description)"
    
    az keyvault secret set \
        --vault-name "$KEY_VAULT_NAME" \
        --name "$secret_name" \
        --value "$secret_value" \
        --content-type "text/plain" \
        --tags \
            environment="$ENVIRONMENT" \
            description="$description" \
            createdBy="setup-secrets-script" \
            createdAt="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        > /dev/null
    
    log_success "Secret '$secret_name' set successfully"
}

# Prompt for secret value
prompt_for_secret() {
    local prompt_text="$1"
    local secret_value=""
    
    echo -n "$prompt_text: "
    read -s secret_value
    echo ""
    
    if [[ -z "$secret_value" ]]; then
        log_error "Secret value cannot be empty"
        return 1
    fi
    
    echo "$secret_value"
}

# Setup OpenAI configuration
setup_openai_secrets() {
    log_info "Setting up OpenAI configuration..."
    
    if ! az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "openai-api-key" &> /dev/null; then
        OPENAI_API_KEY=$(prompt_for_secret "Enter OpenAI API Key")
        set_secret "openai-api-key" "$OPENAI_API_KEY" "OpenAI API key for chat functionality"
    else
        log_info "OpenAI API key already exists"
    fi
    
    # OpenAI model configuration
    set_secret "openai-model" "gpt-4o" "Default OpenAI model for chat"
    set_secret "openai-max-tokens" "2000" "Maximum tokens per OpenAI request"
    set_secret "openai-temperature" "0.3" "OpenAI temperature for consistent responses"
}

# Setup JWT secrets
setup_jwt_secrets() {
    log_info "Setting up JWT configuration..."
    
    JWT_SECRET=$(generate_secure_string 64)
    set_secret "jwt-secret" "$JWT_SECRET" "JWT signing secret for authentication"
    
    JWT_REFRESH_SECRET=$(generate_secure_string 64)
    set_secret "jwt-refresh-secret" "$JWT_REFRESH_SECRET" "JWT refresh token secret"
    
    set_secret "jwt-expires-in" "1h" "JWT token expiration time"
    set_secret "jwt-refresh-expires-in" "7d" "JWT refresh token expiration time"
}

# Setup database secrets
setup_database_secrets() {
    log_info "Setting up database configuration..."
    
    # Get Cosmos DB connection string
    RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
    COSMOS_ACCOUNT=$(az cosmosdb list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
    
    if [[ -n "$COSMOS_ACCOUNT" ]]; then
        COSMOS_CONNECTION=$(az cosmosdb keys list --resource-group "$RESOURCE_GROUP" --name "$COSMOS_ACCOUNT" --type connection-strings --query "connectionStrings[0].connectionString" -o tsv)
        set_secret "cosmos-connection-string" "$COSMOS_CONNECTION" "Cosmos DB connection string"
        
        COSMOS_ENDPOINT=$(az cosmosdb show --resource-group "$RESOURCE_GROUP" --name "$COSMOS_ACCOUNT" --query "documentEndpoint" -o tsv)
        set_secret "cosmos-endpoint" "$COSMOS_ENDPOINT" "Cosmos DB endpoint URL"
    else
        log_warning "Cosmos DB not found. Connection string will need to be set manually."
    fi
    
    set_secret "cosmos-database-name" "DigitalSponsor" "Cosmos DB database name"
}

# Setup Redis secrets
setup_redis_secrets() {
    log_info "Setting up Redis configuration..."
    
    # Get Redis connection details
    RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
    REDIS_CACHE=$(az redis list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
    
    if [[ -n "$REDIS_CACHE" ]]; then
        REDIS_HOSTNAME=$(az redis show --resource-group "$RESOURCE_GROUP" --name "$REDIS_CACHE" --query "hostName" -o tsv)
        REDIS_KEY=$(az redis list-keys --resource-group "$RESOURCE_GROUP" --name "$REDIS_CACHE" --query "primaryKey" -o tsv)
        
        # Build connection string
        REDIS_CONNECTION="$REDIS_HOSTNAME:6380,password=$REDIS_KEY,ssl=True,abortConnect=False"
        set_secret "redis-connection-string" "$REDIS_CONNECTION" "Redis cache connection string"
        set_secret "redis-hostname" "$REDIS_HOSTNAME" "Redis cache hostname"
    else
        log_warning "Redis cache not found. Connection string will need to be set manually."
    fi
}

# Setup SMTP configuration
setup_smtp_secrets() {
    log_info "Setting up SMTP configuration for email..."
    
    if [[ "$ENVIRONMENT" == "prod" ]]; then
        # Production SMTP configuration
        SMTP_HOST=$(prompt_for_secret "Enter SMTP host (e.g., smtp.sendgrid.net)" || echo "smtp.sendgrid.net")
        SMTP_USER=$(prompt_for_secret "Enter SMTP username")
        SMTP_PASSWORD=$(prompt_for_secret "Enter SMTP password")
        
        set_secret "smtp-host" "$SMTP_HOST" "SMTP server hostname"
        set_secret "smtp-port" "587" "SMTP server port"
        set_secret "smtp-user" "$SMTP_USER" "SMTP username"
        set_secret "smtp-password" "$SMTP_PASSWORD" "SMTP password"
        set_secret "smtp-secure" "true" "SMTP TLS enabled"
    else
        # Development/staging SMTP configuration (using test service)
        set_secret "smtp-host" "smtp.ethereal.email" "Test SMTP server"
        set_secret "smtp-port" "587" "SMTP server port"
        set_secret "smtp-user" "ethereal.user" "Test SMTP username"
        set_secret "smtp-password" "ethereal.pass" "Test SMTP password"
        set_secret "smtp-secure" "true" "SMTP TLS enabled"
    fi
}

# Setup admin configuration
setup_admin_secrets() {
    log_info "Setting up admin configuration..."
    
    ADMIN_EMAIL="${ADMIN_EMAIL:-jamessimonster@gmail.com}"
    set_secret "admin-email" "$ADMIN_EMAIL" "Administrator email address"
    
    SUPPORT_EMAIL="${SUPPORT_EMAIL:-support@commonsolution.org}"
    set_secret "support-email" "$SUPPORT_EMAIL" "Support team email address"
}

# Setup crisis support configuration
setup_crisis_secrets() {
    log_info "Setting up crisis support configuration..."
    
    # National Suicide Prevention Lifeline
    set_secret "crisis-hotline-national" "988" "National Suicide Prevention Lifeline"
    set_secret "crisis-text-line" "741741" "Crisis Text Line"
    
    # AA Central Office (example)
    set_secret "aa-central-office" "+1-212-870-3400" "AA General Service Office"
    
    # Emergency services
    set_secret "emergency-number" "911" "Emergency services number"
    
    # Crisis support message template
    CRISIS_MESSAGE="If you are having thoughts of suicide or self-harm, please reach out for help immediately. Contact 988 (Suicide & Crisis Lifeline) or text HOME to 741741 (Crisis Text Line). You are not alone."
    set_secret "crisis-support-message" "$CRISIS_MESSAGE" "Crisis support message template"
}

# Setup encryption keys
setup_encryption_secrets() {
    log_info "Setting up encryption configuration..."
    
    # Step work encryption key
    STEP_WORK_KEY=$(generate_secure_string 64)
    set_secret "step-work-encryption-key" "$STEP_WORK_KEY" "Step work data encryption key"
    
    # Session encryption key
    SESSION_KEY=$(generate_secure_string 32)
    set_secret "session-encryption-key" "$SESSION_KEY" "Session data encryption key"
    
    # File encryption key (for future use)
    FILE_ENCRYPTION_KEY=$(generate_secure_string 64)
    set_secret "file-encryption-key" "$FILE_ENCRYPTION_KEY" "File encryption key"
}

# Setup API keys and external services
setup_external_service_secrets() {
    log_info "Setting up external service configuration..."
    
    # Application Insights (if not auto-configured)
    RESOURCE_GROUP="rg-digital-sponsor-${ENVIRONMENT}"
    APP_INSIGHTS=$(az monitor app-insights component list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv 2>/dev/null || true)
    
    if [[ -n "$APP_INSIGHTS" ]]; then
        INSIGHTS_CONNECTION=$(az monitor app-insights component show --resource-group "$RESOURCE_GROUP" --app "$APP_INSIGHTS" --query "connectionString" -o tsv)
        set_secret "application-insights-connection-string" "$INSIGHTS_CONNECTION" "Application Insights connection string"
    fi
    
    # Meeting finder API key (future integration)
    set_secret "meeting-finder-api-key" "placeholder" "Meeting finder service API key"
    
    # Literature service API key (future integration)  
    set_secret "literature-api-key" "placeholder" "Literature service API key"
}

# Verify all secrets are set
verify_secrets() {
    log_info "Verifying all required secrets are configured..."
    
    REQUIRED_SECRETS=(
        "openai-api-key"
        "jwt-secret"
        "admin-email"
        "crisis-hotline-national"
        "step-work-encryption-key"
    )
    
    MISSING_SECRETS=()
    
    for secret in "${REQUIRED_SECRETS[@]}"; do
        if ! az keyvault secret show --vault-name "$KEY_VAULT_NAME" --name "$secret" &> /dev/null; then
            MISSING_SECRETS+=("$secret")
        fi
    done
    
    if [[ ${#MISSING_SECRETS[@]} -eq 0 ]]; then
        log_success "All required secrets are configured"
    else
        log_error "Missing required secrets: ${MISSING_SECRETS[*]}"
        exit 1
    fi
}

# Export configuration for applications
export_configuration() {
    log_info "Exporting configuration for application use..."
    
    OUTPUT_FILE="$ROOT_DIR/.env.$ENVIRONMENT"
    
    cat > "$OUTPUT_FILE" << EOF
# Digital Sponsor Environment Configuration
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
# Environment: $ENVIRONMENT
# Key Vault: $KEY_VAULT_NAME

# Core Configuration
NODE_ENV=$ENVIRONMENT
KEY_VAULT_URL=https://$KEY_VAULT_NAME.vault.azure.net/

# Azure Configuration
AZURE_KEY_VAULT_NAME=$KEY_VAULT_NAME
AZURE_CLIENT_ID=\${AZURE_CLIENT_ID}

# Application Settings
APP_NAME=Digital Sponsor
APP_VERSION=1.0.0
LOG_LEVEL=info
PORT=3000

# Security Settings
ENABLE_CORS=true
ENABLE_HELMET=true
ENABLE_RATE_LIMITING=true

# Feature Flags
ENABLE_CHAT=true
ENABLE_STEP_WORK=true
ENABLE_CRISIS_SUPPORT=true
ENABLE_MEETING_FINDER=false
ENABLE_ANALYTICS=true

EOF

    log_success "Configuration exported to: $OUTPUT_FILE"
    log_warning "Remember to add .env.* files to .gitignore"
}

# List all configured secrets (names only for security)
list_secrets() {
    log_info "Configured secrets in Key Vault '$KEY_VAULT_NAME':"
    echo "----------------------------------------"
    
    az keyvault secret list --vault-name "$KEY_VAULT_NAME" --query "[].{Name:name,Updated:attributes.updated}" -o table
}

# Main execution
main() {
    # Handle help flag
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    log_info "Starting Azure Key Vault secret setup for Digital Sponsor"
    log_info "Environment: $ENVIRONMENT"
    echo ""
    
    # Execute setup steps
    validate_environment
    validate_azure_cli
    set_subscription
    detect_key_vault
    check_key_vault_access
    
    # Setup all secret categories
    setup_openai_secrets
    setup_jwt_secrets
    setup_database_secrets
    setup_redis_secrets
    setup_smtp_secrets
    setup_admin_secrets
    setup_crisis_secrets
    setup_encryption_secrets
    setup_external_service_secrets
    
    # Verification and export
    verify_secrets
    export_configuration
    list_secrets
    
    log_success "✅ Secret setup completed successfully!"
    log_info "Key Vault: https://$KEY_VAULT_NAME.vault.azure.net/"
    log_info "Configuration file: .env.$ENVIRONMENT"
    echo ""
    log_info "Next steps:"
    echo "1. Test Key Vault connectivity from your application"
    echo "2. Configure GitHub secrets for CI/CD pipeline"
    echo "3. Review and update any placeholder values"
    echo "4. Set up secret rotation schedule"
}

# Execute main function with all arguments
main "$@"