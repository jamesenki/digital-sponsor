#!/bin/bash

# Azure AD B2C Tenant Setup Script
# Sets up B2C tenant and configures user flows with AA Traditions compliance

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="digital-sponsor"
ENVIRONMENT="${1:-dev}"
LOCATION="${2:-eastus}"
RESOURCE_GROUP="${PROJECT_NAME}-${ENVIRONMENT}-rg"

# B2C Configuration
B2C_TENANT_NAME="${PROJECT_NAME}${ENVIRONMENT}"
B2C_DOMAIN="${B2C_TENANT_NAME}.onmicrosoft.com"

# Policy Names
SIGNUP_SIGNIN_POLICY="B2C_1_SignUpSignIn"
EDIT_PROFILE_POLICY="B2C_1_EditProfile"
PASSWORD_RESET_POLICY="B2C_1_PasswordReset"

# Application Names
FRONTEND_APP_NAME="${PROJECT_NAME}-frontend-${ENVIRONMENT}"
BACKEND_API_NAME="${PROJECT_NAME}-api-${ENVIRONMENT}"

echo -e "${BLUE}=== Azure AD B2C Tenant Setup ===${NC}"
echo -e "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo -e "Location: ${YELLOW}${LOCATION}${NC}"
echo -e "B2C Tenant: ${YELLOW}${B2C_DOMAIN}${NC}"

# Check if user is logged in to Azure
echo -e "\n${BLUE}Checking Azure CLI authentication...${NC}"
if ! az account show &> /dev/null; then
    echo -e "${RED}Error: Not logged in to Azure CLI. Please run 'az login' first.${NC}"
    exit 1
fi

# Function to create B2C tenant (requires manual Azure portal setup)
create_b2c_tenant() {
    echo -e "\n${YELLOW}=== B2C Tenant Creation ===${NC}"
    echo -e "${YELLOW}⚠️  B2C tenant creation must be done manually through Azure Portal:${NC}"
    echo -e "1. Go to Azure Portal → Create a resource → Azure Active Directory B2C"
    echo -e "2. Choose 'Create a new Azure AD B2C Tenant'"
    echo -e "3. Organization name: ${PROJECT_NAME}"
    echo -e "4. Initial domain name: ${B2C_TENANT_NAME}"
    echo -e "5. Country/Region: United States"
    echo -e "6. Subscription: Select your subscription"
    echo -e "7. Resource group: ${RESOURCE_GROUP}"
    echo -e "8. Location: ${LOCATION}"
    echo -e "\n${BLUE}Continue when tenant is created...${NC}"
    read -p "Press Enter when B2C tenant is ready..."
}

# Function to configure custom attributes
configure_custom_attributes() {
    echo -e "\n${BLUE}Configuring custom attributes for AA compliance...${NC}"
    
    # Switch to B2C tenant context
    echo "Switching to B2C tenant context..."
    az ad signed-in-user show --query userPrincipalName -o tsv
    
    # Note: Custom attributes must be configured through Azure Portal or Graph API
    echo -e "${YELLOW}⚠️  Custom attributes must be configured manually:${NC}"
    echo -e "1. Go to Azure Portal → Azure AD B2C → User attributes"
    echo -e "2. Create the following custom attributes:"
    echo -e "   - AnonymousMode (Boolean) - For AA Tradition 11 compliance"
    echo -e "   - PreferredName (String) - Display name for meetings"
    echo -e "   - SobrietyDate (DateTime) - Optional sobriety date"
    echo -e "   - HomeMeetingId (String) - Optional home meeting"
    echo -e "   - CrisisContactConsent (Boolean) - Crisis support consent"
}

# Function to create application registrations
create_app_registrations() {
    echo -e "\n${BLUE}Creating application registrations...${NC}"
    
    # Create backend API registration
    echo "Creating backend API application..."
    BACKEND_APP_ID=$(az ad app create \
        --display-name "${BACKEND_API_NAME}" \
        --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
        --web-redirect-uris "https://${PROJECT_NAME}-${ENVIRONMENT}.azurecontainerapps.io/auth/callback" \
        --identifier-uris "api://${BACKEND_API_NAME}" \
        --query appId -o tsv)
    
    echo -e "Backend API App ID: ${GREEN}${BACKEND_APP_ID}${NC}"
    
    # Create frontend application registration
    echo "Creating frontend application..."
    case $ENVIRONMENT in
        "prod")
            FRONTEND_REDIRECT_URI="https://digitalsponsor.app"
            ;;
        "staging")
            FRONTEND_REDIRECT_URI="https://staging.digitalsponsor.app"
            ;;
        *)
            FRONTEND_REDIRECT_URI="http://localhost:3000"
            ;;
    esac
    
    FRONTEND_APP_ID=$(az ad app create \
        --display-name "${FRONTEND_APP_NAME}" \
        --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
        --public-client-redirect-uris "${FRONTEND_REDIRECT_URI}" "${FRONTEND_REDIRECT_URI}/auth/callback" \
        --query appId -o tsv)
    
    echo -e "Frontend App ID: ${GREEN}${FRONTEND_APP_ID}${NC}"
    
    # Configure API permissions
    echo "Configuring API permissions..."
    az ad app permission add \
        --id "${FRONTEND_APP_ID}" \
        --api "${BACKEND_APP_ID}" \
        --api-permissions "user_impersonation=Scope"
}

# Function to configure user flows
configure_user_flows() {
    echo -e "\n${BLUE}Configuring user flows...${NC}"
    echo -e "${YELLOW}⚠️  User flows must be configured manually through Azure Portal:${NC}"
    echo -e "1. Go to Azure Portal → Azure AD B2C → User flows"
    echo -e "2. Create the following user flows:"
    echo -e "\n${GREEN}Sign up and sign in flow (${SIGNUP_SIGNIN_POLICY}):${NC}"
    echo -e "   - User flow type: Sign up and sign in"
    echo -e "   - Version: Recommended"
    echo -e "   - Identity providers: Email signup"
    echo -e "   - Multifactor authentication: Email"
    echo -e "   - User attributes: Given name, Surname, Email Address"
    echo -e "   - Application claims: Given name, Surname, Email Address, User's Object ID"
    echo -e "\n${GREEN}Profile editing flow (${EDIT_PROFILE_POLICY}):${NC}"
    echo -e "   - User flow type: Profile editing"
    echo -e "   - Version: Recommended"
    echo -e "   - User attributes: Given name, Surname, Custom attributes"
    echo -e "\n${GREEN}Password reset flow (${PASSWORD_RESET_POLICY}):${NC}"
    echo -e "   - User flow type: Password reset"
    echo -e "   - Version: Recommended"
    echo -e "   - Identity providers: Reset password using email address"
}

# Function to configure MFA
configure_mfa() {
    echo -e "\n${BLUE}Configuring Multi-Factor Authentication...${NC}"
    echo -e "${YELLOW}⚠️  MFA must be configured in user flows:${NC}"
    echo -e "1. In each user flow → Multifactor authentication"
    echo -e "2. Enable: Email"
    echo -e "3. Enforcement: ${ENVIRONMENT == 'prod' ? 'Always' : 'When needed'}"
    echo -e "4. For production: Consider SMS and Authenticator app options"
}

# Function to create configuration files
create_config_files() {
    echo -e "\n${BLUE}Creating configuration files...${NC}"
    
    # Create MSAL configuration
    cat > "${SCRIPT_DIR}/../config/msal-config-${ENVIRONMENT}.json" << EOF
{
  "auth": {
    "clientId": "${FRONTEND_APP_ID:-[REPLACE_WITH_FRONTEND_CLIENT_ID]}",
    "authority": "https://${B2C_DOMAIN}/${SIGNUP_SIGNIN_POLICY}",
    "knownAuthorities": ["${B2C_DOMAIN}"],
    "redirectUri": "${FRONTEND_REDIRECT_URI:-http://localhost:3000}",
    "postLogoutRedirectUri": "${FRONTEND_REDIRECT_URI:-http://localhost:3000}"
  },
  "cache": {
    "cacheLocation": "localStorage",
    "storeAuthStateInCookie": false
  },
  "system": {
    "loggerOptions": {
      "piiLoggingEnabled": false,
      "logLevel": "${ENVIRONMENT == 'dev' ? 3 : 1}"
    }
  },
  "b2cPolicies": {
    "signUpSignIn": {
      "authority": "https://${B2C_DOMAIN}/${SIGNUP_SIGNIN_POLICY}"
    },
    "editProfile": {
      "authority": "https://${B2C_DOMAIN}/${EDIT_PROFILE_POLICY}"
    },
    "resetPassword": {
      "authority": "https://${B2C_DOMAIN}/${PASSWORD_RESET_POLICY}"
    }
  },
  "apiConfig": {
    "uri": "${BACKEND_APP_ID:-[REPLACE_WITH_BACKEND_URI]}",
    "scopes": [
      "https://${B2C_DOMAIN}/${BACKEND_API_NAME}/step-work.read",
      "https://${B2C_DOMAIN}/${BACKEND_API_NAME}/step-work.write",
      "https://${B2C_DOMAIN}/${BACKEND_API_NAME}/meetings.read",
      "https://${B2C_DOMAIN}/${BACKEND_API_NAME}/chat.participate",
      "https://${B2C_DOMAIN}/${BACKEND_API_NAME}/crisis.access"
    ]
  }
}
EOF

    # Create environment variables file
    cat > "${SCRIPT_DIR}/../config/b2c-env-${ENVIRONMENT}.env" << EOF
# Azure AD B2C Configuration for ${ENVIRONMENT}
B2C_TENANT_NAME=${B2C_TENANT_NAME}
B2C_TENANT_DOMAIN=${B2C_DOMAIN}
B2C_CLIENT_ID=${FRONTEND_APP_ID:-[REPLACE_WITH_CLIENT_ID]}
B2C_API_ID=${BACKEND_APP_ID:-[REPLACE_WITH_API_ID]}

# User Flow Names
B2C_SIGNUP_SIGNIN_POLICY=${SIGNUP_SIGNIN_POLICY}
B2C_EDIT_PROFILE_POLICY=${EDIT_PROFILE_POLICY}
B2C_PASSWORD_RESET_POLICY=${PASSWORD_RESET_POLICY}

# API Scopes
B2C_STEP_WORK_READ_SCOPE=https://${B2C_DOMAIN}/${BACKEND_API_NAME}/step-work.read
B2C_STEP_WORK_WRITE_SCOPE=https://${B2C_DOMAIN}/${BACKEND_API_NAME}/step-work.write
B2C_MEETINGS_READ_SCOPE=https://${B2C_DOMAIN}/${BACKEND_API_NAME}/meetings.read
B2C_CHAT_PARTICIPATE_SCOPE=https://${B2C_DOMAIN}/${BACKEND_API_NAME}/chat.participate
B2C_CRISIS_ACCESS_SCOPE=https://${B2C_DOMAIN}/${BACKEND_API_NAME}/crisis.access

# MFA Configuration
B2C_MFA_ENABLED=true
B2C_MFA_GRACE_PERIOD_DAYS=${ENVIRONMENT == 'dev' ? 30 : 7}

# AA Traditions Compliance
B2C_ANONYMOUS_MODE_SUPPORTED=true
B2C_PREFERRED_NAME_ATTRIBUTE=extension_PreferredName
B2C_SOBRIETY_DATE_ATTRIBUTE=extension_SobrietyDate
B2C_HOME_MEETING_ATTRIBUTE=extension_HomeMeetingId
B2C_CRISIS_CONSENT_ATTRIBUTE=extension_CrisisContactConsent
EOF

    echo -e "${GREEN}Configuration files created:${NC}"
    echo -e "  - ${SCRIPT_DIR}/../config/msal-config-${ENVIRONMENT}.json"
    echo -e "  - ${SCRIPT_DIR}/../config/b2c-env-${ENVIRONMENT}.env"
}

# Function to store secrets in Key Vault
store_secrets() {
    echo -e "\n${BLUE}Storing B2C configuration in Key Vault...${NC}"
    
    KEY_VAULT_NAME="${PROJECT_NAME}-${ENVIRONMENT}-kv"
    
    if az keyvault show --name "${KEY_VAULT_NAME}" --resource-group "${RESOURCE_GROUP}" &> /dev/null; then
        # Store B2C configuration
        az keyvault secret set \
            --vault-name "${KEY_VAULT_NAME}" \
            --name "B2C-TenantDomain" \
            --value "${B2C_DOMAIN}" > /dev/null
        
        az keyvault secret set \
            --vault-name "${KEY_VAULT_NAME}" \
            --name "B2C-FrontendClientId" \
            --value "${FRONTEND_APP_ID:-[MANUAL_SETUP_REQUIRED]}" > /dev/null
        
        az keyvault secret set \
            --vault-name "${KEY_VAULT_NAME}" \
            --name "B2C-BackendApiId" \
            --value "${BACKEND_APP_ID:-[MANUAL_SETUP_REQUIRED]}" > /dev/null
        
        az keyvault secret set \
            --vault-name "${KEY_VAULT_NAME}" \
            --name "B2C-SignUpSignInPolicy" \
            --value "${SIGNUP_SIGNIN_POLICY}" > /dev/null
        
        echo -e "${GREEN}B2C configuration stored in Key Vault${NC}"
    else
        echo -e "${YELLOW}Warning: Key Vault ${KEY_VAULT_NAME} not found. Secrets not stored.${NC}"
    fi
}

# Function to print next steps
print_next_steps() {
    echo -e "\n${GREEN}=== B2C Setup Complete ===${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "1. ${YELLOW}Complete manual B2C tenant setup in Azure Portal${NC}"
    echo -e "2. ${YELLOW}Configure custom attributes as listed above${NC}"
    echo -e "3. ${YELLOW}Create and configure user flows${NC}"
    echo -e "4. ${YELLOW}Update application IDs in configuration files${NC}"
    echo -e "5. ${YELLOW}Test authentication flow with frontend application${NC}"
    echo -e "\n${BLUE}AA Traditions Compliance Notes:${NC}"
    echo -e "- ${GREEN}Tradition 6:${NC} No endorsement - scopes limited to personal tools"
    echo -e "- ${GREEN}Tradition 8:${NC} No professional advice - literature-based guidance only"
    echo -e "- ${GREEN}Tradition 11:${NC} Anonymity support via AnonymousMode and PreferredName"
    echo -e "- ${GREEN}Tradition 12:${NC} Personal recovery focus in all permissions"
    echo -e "\n${BLUE}Configuration Files:${NC}"
    echo -e "- MSAL Config: ${SCRIPT_DIR}/../config/msal-config-${ENVIRONMENT}.json"
    echo -e "- Environment: ${SCRIPT_DIR}/../config/b2c-env-${ENVIRONMENT}.env"
}

# Main execution
main() {
    echo -e "${BLUE}Starting Azure AD B2C setup for ${ENVIRONMENT} environment...${NC}"
    
    # Create config directory if it doesn't exist
    mkdir -p "${SCRIPT_DIR}/../config"
    
    # Execute setup steps
    create_b2c_tenant
    configure_custom_attributes
    create_app_registrations
    configure_user_flows
    configure_mfa
    create_config_files
    store_secrets
    print_next_steps
    
    echo -e "\n${GREEN}Azure AD B2C setup completed successfully!${NC}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi