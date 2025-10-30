#!/bin/bash

# Digital Sponsor - Module 7: DNS Configuration
# Sets up custom domain for digitalsponsor.commonsolution.org

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: DOMAIN VERIFICATION SETUP
# =============================================================================

setup_domain_verification() {
    log_section "Setting Up Domain Verification"
    
    # Get the Static Web App default hostname
    local default_hostname=$(az staticwebapp show --name "$FRONTEND_APP_NAME" --resource-group "$RESOURCE_GROUP" --query defaultHostname -o tsv)
    
    if [ -z "$default_hostname" ]; then
        log_error "Could not retrieve Static Web App hostname"
        exit 1
    fi
    
    log_info "Static Web App hostname: $default_hostname"
    
    # Add custom domain to Static Web App
    log_info "Adding custom domain '$FULL_DOMAIN' to Static Web App..."
    
    az staticwebapp hostname set \
        --name "$FRONTEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --hostname "$FULL_DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "Custom domain added successfully"
        export SWA_DEFAULT_HOSTNAME="$default_hostname"
    else
        log_error "Failed to add custom domain"
        exit 1
    fi
}

# =============================================================================
# MODULE: DNS RECORDS CONFIGURATION
# =============================================================================

configure_dns_records() {
    log_section "DNS Records Configuration"
    
    log_info "Setting up DNS records for '$DOMAIN'..."
    
    # Display required DNS records
    echo ""
    log_info "🌐 DNS RECORDS REQUIRED:"
    echo "=================================================="
    echo ""
    echo "You need to add these DNS records to your domain provider:"
    echo ""
    echo "📋 Frontend (Static Web App):"
    echo "   Type: CNAME"
    echo "   Name: $SUBDOMAIN"
    echo "   Value: $SWA_DEFAULT_HOSTNAME"
    echo "   TTL: 300 (5 minutes)"
    echo ""
    
    # Get backend hostname for API subdomain
    local backend_hostname=$(echo "$BACKEND_URL" | sed 's|https://||')
    
    echo "📋 Backend API (Optional - for api.commonsolution.org):"
    echo "   Type: CNAME" 
    echo "   Name: api"
    echo "   Value: $backend_hostname"
    echo "   TTL: 300 (5 minutes)"
    echo ""
    
    echo "📋 Root Domain (Optional - for commonsolution.org):"
    echo "   Type: CNAME"
    echo "   Name: @"
    echo "   Value: $SWA_DEFAULT_HOSTNAME"
    echo "   TTL: 300 (5 minutes)"
    echo ""
    
    log_warning "DNS propagation can take 5-48 hours to complete globally"
}

# =============================================================================
# MODULE: DOMAIN VERIFICATION STATUS
# =============================================================================

check_domain_verification() {
    log_section "Checking Domain Verification Status"
    
    log_info "Checking verification status for '$FULL_DOMAIN'..."
    
    # Check Static Web App hostname status
    local hostname_status=$(az staticwebapp hostname show \
        --name "$FRONTEND_APP_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --hostname "$FULL_DOMAIN" \
        --query validationToken -o tsv 2>/dev/null || echo "not_found")
    
    if [ "$hostname_status" != "not_found" ] && [ -n "$hostname_status" ]; then
        log_info "Domain verification token: $hostname_status"
        log_warning "Domain verification is pending DNS setup"
    else
        log_info "Domain verification will be available after DNS records are added"
    fi
    
    # Test current DNS resolution
    log_info "Testing current DNS resolution..."
    
    if nslookup "$FULL_DOMAIN" &>/dev/null; then
        local current_ip=$(nslookup "$FULL_DOMAIN" | grep -A1 "Name:" | tail -1 | awk '{print $2}' || echo "unknown")
        log_info "Current DNS resolution: $FULL_DOMAIN -> $current_ip"
    else
        log_info "Domain '$FULL_DOMAIN' not yet configured in DNS"
    fi
}

# =============================================================================
# MODULE: SSL CERTIFICATE SETUP
# =============================================================================

setup_ssl_certificate() {
    log_section "SSL Certificate Configuration"
    
    log_info "Configuring SSL certificate for '$FULL_DOMAIN'..."
    
    # Azure Static Web Apps automatically provisions SSL certificates
    # once domain verification is complete
    
    log_info "SSL certificate will be automatically provisioned by Azure when:"
    echo "  1. DNS records are properly configured"
    echo "  2. Domain verification is complete"
    echo "  3. DNS propagation is finished (5-48 hours)"
    echo ""
    
    log_success "SSL certificate setup is automatic - no manual action required"
}

# =============================================================================
# MODULE: CLOUDFLARE INTEGRATION SETUP
# =============================================================================

setup_cloudflare_integration() {
    log_section "Cloudflare Integration Setup"
    
    log_info "Setting up Cloudflare for enhanced performance and security..."
    
    echo ""
    log_info "🌩️ CLOUDFLARE SETUP:"
    echo "=================================================="
    echo ""
    echo "1. Add your domain to Cloudflare:"
    echo "   • Go to: https://dash.cloudflare.com"
    echo "   • Click 'Add a Site'"
    echo "   • Enter: $DOMAIN"
    echo "   • Choose Free plan"
    echo ""
    
    echo "2. Configure DNS records in Cloudflare:"
    echo "   • $SUBDOMAIN CNAME $SWA_DEFAULT_HOSTNAME"
    echo "   • api CNAME $(echo "$BACKEND_URL" | sed 's|https://||')"
    echo "   • @ CNAME $SWA_DEFAULT_HOSTNAME (for root domain)"
    echo ""
    
    echo "3. Update nameservers at your domain registrar to:"
    echo "   • (Cloudflare will provide specific nameservers)"
    echo ""
    
    echo "4. Enable Cloudflare features:"
    echo "   • SSL/TLS: Full (strict)"
    echo "   • Always Use HTTPS: On"
    echo "   • Auto Minify: CSS, JS, HTML"
    echo "   • Brotli Compression: On"
    echo ""
    
    log_success "Cloudflare setup instructions provided"
}

# =============================================================================
# MODULE: EMAIL FORWARDING CONFIGURATION
# =============================================================================

configure_email_forwarding() {
    log_section "Email Forwarding Configuration"
    
    log_info "Setting up email forwarding for admin@$DOMAIN..."
    
    echo ""
    log_info "📧 EMAIL FORWARDING SETUP:"
    echo "=================================================="
    echo ""
    echo "Using Cloudflare Email Routing (FREE):"
    echo ""
    
    echo "1. In Cloudflare Dashboard:"
    echo "   • Go to Email > Email Routing"
    echo "   • Click 'Get started'"
    echo "   • Enable Email Routing for $DOMAIN"
    echo ""
    
    echo "2. Add forwarding rule:"
    echo "   • From: admin@$DOMAIN"
    echo "   • To: jamessimonster@gmail.com"
    echo "   • Action: Forward"
    echo ""
    
    echo "3. Verify MX records (auto-added by Cloudflare):"
    echo "   • Type: MX"
    echo "   • Name: @"
    echo "   • Value: route.mx.cloudflare.net"
    echo "   • Priority: 10"
    echo ""
    
    echo "4. SPF record (auto-added by Cloudflare):"
    echo "   • Type: TXT"
    echo "   • Name: @"
    echo "   • Value: v=spf1 include:_spf.mx.cloudflare.net ~all"
    echo ""
    
    log_success "Email forwarding configuration provided"
}

# =============================================================================
# MODULE: VERIFICATION TESTING
# =============================================================================

test_domain_configuration() {
    log_section "Testing Domain Configuration"
    
    log_info "Testing domain configuration for '$FULL_DOMAIN'..."
    
    # Test HTTP/HTTPS connectivity
    log_info "Testing HTTPS connectivity..."
    
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s -I "https://$FULL_DOMAIN" &>/dev/null; then
            log_success "HTTPS connectivity test passed"
            break
        fi
        
        log_info "Attempt $attempt/$max_attempts - DNS may still be propagating..."
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_warning "HTTPS test failed - DNS propagation may still be in progress"
        log_info "This is normal and will resolve once DNS records are properly configured"
    fi
    
    # Test current working URLs
    echo ""
    log_info "🔗 CURRENT WORKING URLs:"
    echo "=================================================="
    echo "Backend API: $BACKEND_URL"
    echo "Frontend (temporary): $FRONTEND_URL"
    echo "Frontend (custom - after DNS): https://$FULL_DOMAIN"
    echo ""
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "🌐 Digital Sponsor - Phase 4.1: DNS Configuration"
    echo "================================================="
    
    # Check prerequisites
    if [ ! -f "$SCRIPT_DIR/../.deployment-state" ] || ! grep -q "FRONTEND_DEPLOYED=true" "$SCRIPT_DIR/../.deployment-state"; then
        log_error "Phase 3 (Frontend) must be completed first"
        log_info "Run: ./deploy/modules/06-frontend-static-app.sh"
        exit 1
    fi
    
    # Load URLs from state
    source "$SCRIPT_DIR/../.deployment-state"
    
    if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
        log_error "Frontend or Backend URLs not found in deployment state"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with DNS configuration for '$FULL_DOMAIN'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "DNS configuration cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    setup_domain_verification
    configure_dns_records
    setup_ssl_certificate
    setup_cloudflare_integration
    configure_email_forwarding
    check_domain_verification
    test_domain_configuration
    
    # Success summary
    echo ""
    log_success "✨ Phase 4.1 Complete: DNS Configuration"
    echo ""
    echo "📋 What was configured:"
    echo "  • Custom domain added to Static Web App"
    echo "  • DNS records configuration provided"
    echo "  • SSL certificate setup (automatic)"
    echo "  • Cloudflare integration instructions"
    echo "  • Email forwarding configuration"
    echo ""
    echo "🔗 Domain Details:"
    echo "  Custom Domain: https://$FULL_DOMAIN"
    echo "  API Domain: https://api.$DOMAIN (optional)"
    echo "  Email: admin@$DOMAIN → jamessimonster@gmail.com"
    echo ""
    echo "⏰ Next Steps:"
    echo "  1. Add DNS records to your domain provider"
    echo "  2. Wait for DNS propagation (5-48 hours)"
    echo "  3. Verify domain in Azure portal"
    echo "  4. Set up Cloudflare (optional but recommended)"
    echo ""
    echo "🔄 Next Module:"
    echo "  Run: ./deploy/modules/08-production-validation.sh"
    echo ""
    
    # Update state for next modules
    echo "DNS_CONFIGURED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_4_1_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "CUSTOM_DOMAIN=$FULL_DOMAIN" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi