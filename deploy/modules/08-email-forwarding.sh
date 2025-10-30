#!/bin/bash

# Digital Sponsor - Module 8: Email Forwarding Setup
# Sets up admin@commonsolution.org forwarding to jamessimonster@gmail.com

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: CLOUDFLARE EMAIL ROUTING SETUP
# =============================================================================

setup_cloudflare_email() {
    log_section "Cloudflare Email Routing Setup"
    
    log_info "Setting up Cloudflare Email Routing for $DOMAIN..."
    
    echo ""
    log_info "📧 CLOUDFLARE EMAIL ROUTING SETUP:"
    echo "=================================================="
    echo ""
    echo "Cloudflare Email Routing is FREE and handles unlimited email forwarding."
    echo ""
    
    echo "🔗 Setup Steps:"
    echo ""
    echo "1. Go to Cloudflare Dashboard:"
    echo "   https://dash.cloudflare.com"
    echo ""
    
    echo "2. Select domain: $DOMAIN"
    echo ""
    
    echo "3. Navigate to Email > Email Routing"
    echo ""
    
    echo "4. Click 'Get started' or 'Enable Email Routing'"
    echo ""
    
    echo "5. Add forwarding address:"
    echo "   • Destination email: jamessimonster@gmail.com"
    echo "   • Click 'Send verification email'"
    echo "   • Check jamessimonster@gmail.com and verify"
    echo ""
    
    echo "6. Create forwarding rule:"
    echo "   • Custom address: admin@$DOMAIN"
    echo "   • Forward to: jamessimonster@gmail.com" 
    echo "   • Action: Forward"
    echo "   • Click 'Save'"
    echo ""
    
    log_success "Cloudflare Email Routing setup instructions provided"
}

# =============================================================================
# MODULE: DNS RECORDS FOR EMAIL
# =============================================================================

configure_email_dns() {
    log_section "Email DNS Configuration"
    
    log_info "Required DNS records for email forwarding..."
    
    echo ""
    log_info "📬 EMAIL DNS RECORDS:"
    echo "=================================================="
    echo ""
    echo "These records will be automatically added by Cloudflare Email Routing:"
    echo ""
    
    echo "🔸 MX Record:"
    echo "   Type: MX"
    echo "   Name: @"
    echo "   Value: route.mx.cloudflare.net"
    echo "   Priority: 10"
    echo "   TTL: Auto"
    echo ""
    
    echo "🔸 SPF Record:"
    echo "   Type: TXT"
    echo "   Name: @"
    echo "   Value: v=spf1 include:_spf.mx.cloudflare.net ~all"
    echo "   TTL: Auto"
    echo ""
    
    echo "🔸 DKIM Record (optional):"
    echo "   Type: TXT"
    echo "   Name: *._domainkey"
    echo "   Value: v=DKIM1; p="
    echo "   TTL: Auto"
    echo ""
    
    echo "🔸 DMARC Record (optional):"
    echo "   Type: TXT"
    echo "   Name: _dmarc"
    echo "   Value: v=DMARC1; p=quarantine; rua=mailto:admin@$DOMAIN"
    echo "   TTL: Auto"
    echo ""
    
    log_warning "Cloudflare will automatically manage these records"
    log_info "No manual DNS configuration required for email"
}

# =============================================================================
# MODULE: ALTERNATIVE EMAIL PROVIDERS
# =============================================================================

show_alternative_email_providers() {
    log_section "Alternative Email Providers"
    
    echo ""
    log_info "🔄 OTHER EMAIL FORWARDING OPTIONS:"
    echo "=================================================="
    echo ""
    
    echo "🔸 Option 1: Cloudflare Email Routing (RECOMMENDED)"
    echo "   • Cost: FREE"
    echo "   • Unlimited forwarding"
    echo "   • Automatic DNS management"
    echo "   • Enterprise-grade security"
    echo ""
    
    echo "🔸 Option 2: Google Workspace"
    echo "   • Cost: \$6/month per user"
    echo "   • Full email hosting"
    echo "   • Gmail interface"
    echo "   • 30GB storage"
    echo ""
    
    echo "🔸 Option 3: Microsoft 365"
    echo "   • Cost: \$6/month per user"
    echo "   • Outlook interface"
    echo "   • 50GB storage"
    echo "   • Office apps included"
    echo ""
    
    echo "🔸 Option 4: Zoho Mail"
    echo "   • Cost: FREE (1 user, 5GB)"
    echo "   • Full email hosting"
    echo "   • Web interface"
    echo "   • Custom domain"
    echo ""
    
    log_success "Email provider options provided"
}

# =============================================================================
# MODULE: EMAIL TESTING SETUP
# =============================================================================

setup_email_testing() {
    log_section "Email Testing Instructions"
    
    echo ""
    log_info "🧪 EMAIL TESTING STEPS:"
    echo "=================================================="
    echo ""
    
    echo "After setting up email forwarding:"
    echo ""
    
    echo "1. Wait 10-15 minutes for DNS propagation"
    echo ""
    
    echo "2. Test email forwarding:"
    echo "   • Send test email to: admin@$DOMAIN"
    echo "   • Check: jamessimonster@gmail.com"
    echo "   • Expected: Email should arrive within 1-2 minutes"
    echo ""
    
    echo "3. Test from different email providers:"
    echo "   • Gmail → admin@$DOMAIN"
    echo "   • Outlook → admin@$DOMAIN"  
    echo "   • Yahoo → admin@$DOMAIN"
    echo ""
    
    echo "4. Check spam/junk folders if not received"
    echo ""
    
    echo "5. Verify MX record propagation:"
    echo "   dig MX $DOMAIN"
    echo "   nslookup -type=MX $DOMAIN"
    echo ""
    
    log_success "Email testing instructions provided"
}

# =============================================================================
# MODULE: SECURITY AND DELIVERABILITY
# =============================================================================

configure_email_security() {
    log_section "Email Security Configuration"
    
    echo ""
    log_info "🔒 EMAIL SECURITY BEST PRACTICES:"
    echo "=================================================="
    echo ""
    
    echo "🔸 SPF (Sender Policy Framework):"
    echo "   • Prevents email spoofing"
    echo "   • Automatically configured by Cloudflare"
    echo "   • Value: v=spf1 include:_spf.mx.cloudflare.net ~all"
    echo ""
    
    echo "🔸 DKIM (DomainKeys Identified Mail):"
    echo "   • Email authentication"
    echo "   • Optional for forwarding"
    echo "   • Can be enabled in Cloudflare"
    echo ""
    
    echo "🔸 DMARC (Domain-based Message Authentication):"
    echo "   • Email policy enforcement"
    echo "   • Recommended for business use"
    echo "   • Reports sent to admin@$DOMAIN"
    echo ""
    
    echo "🔸 Email Forwarding Security:"
    echo "   • All forwarded emails are scanned"
    echo "   • Spam filtering included"
    echo "   • Virus protection enabled"
    echo "   • Rate limiting (300 emails/minute)"
    echo ""
    
    log_success "Email security configuration explained"
}

# =============================================================================
# MODULE: MONITORING AND MAINTENANCE
# =============================================================================

setup_email_monitoring() {
    log_section "Email Monitoring Setup"
    
    echo ""
    log_info "📊 EMAIL MONITORING:"
    echo "=================================================="
    echo ""
    
    echo "🔸 Cloudflare Email Analytics:"
    echo "   • Go to: Email > Overview"
    echo "   • View forwarded emails count"
    echo "   • Monitor delivery success rate"
    echo "   • Check blocked/spam emails"
    echo ""
    
    echo "🔸 Delivery Reports:"
    echo "   • DMARC reports to admin@$DOMAIN"
    echo "   • Forwarding success notifications"
    echo "   • Bounce notifications"
    echo ""
    
    echo "🔸 Maintenance Tasks:"
    echo "   • Monthly: Review forwarding rules"
    echo "   • Quarterly: Check delivery rates"
    echo "   • Annually: Verify DNS records"
    echo ""
    
    log_success "Email monitoring setup explained"
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "📧 Digital Sponsor - Phase 4.2: Email Forwarding Setup"
    echo "====================================================="
    
    # Check prerequisites - email can be set up independently
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with email forwarding setup for admin@$DOMAIN? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Email setup cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    setup_cloudflare_email
    configure_email_dns
    show_alternative_email_providers
    configure_email_security
    setup_email_testing
    setup_email_monitoring
    
    # Success summary
    echo ""
    log_success "✨ Phase 4.2 Complete: Email Forwarding Setup"
    echo ""
    echo "📋 What was configured:"
    echo "  • Cloudflare Email Routing instructions"
    echo "  • DNS records configuration (automatic)"
    echo "  • Email security best practices"
    echo "  • Testing and monitoring setup"
    echo ""
    echo "📧 Email Configuration:"
    echo "  Source: admin@$DOMAIN"
    echo "  Destination: jamessimonster@gmail.com"
    echo "  Provider: Cloudflare Email Routing (FREE)"
    echo ""
    echo "⏰ Next Steps:"
    echo "  1. Complete Cloudflare Email Routing setup"
    echo "  2. Verify destination email: jamessimonster@gmail.com"
    echo "  3. Test email forwarding"
    echo "  4. Monitor delivery in Cloudflare dashboard"
    echo ""
    echo "🔄 Next Module:"
    echo "  Run: ./deploy/modules/09-production-validation.sh"
    echo ""
    
    # Update state for next modules
    echo "EMAIL_CONFIGURED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_4_2_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "EMAIL_FORWARD=admin@$DOMAIN->jamessimonster@gmail.com" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi