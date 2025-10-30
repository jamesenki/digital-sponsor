#!/bin/bash

# Digital Sponsor - Phase 1: Infrastructure Foundation
# Orchestrates all Phase 1 modules in correct order

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load configuration
source "$SCRIPT_DIR/config/deployment-config.sh"

# =============================================================================
# PHASE 1 ORCHESTRATION
# =============================================================================

run_phase_1() {
    local start_step=${1:-1}
    
    echo "🏗️ Digital Sponsor - Phase 1: Infrastructure Foundation"
    echo "======================================================="
    echo ""
    
    show_deployment_summary
    
    echo "📋 Phase 1 Steps:"
    echo "  1.1 - Resource Group & Basic Infrastructure"
    echo "  1.2 - PostgreSQL Database + Literature Import"  
    echo "  1.3 - Redis Cache Setup"
    echo "  1.4 - Container Registry"
    echo ""
    
    # Step 1.1: Resource Group
    if [ $start_step -le 1 ]; then
        log_section "Phase 1.1: Resource Group Setup"
        if ! bash "$SCRIPT_DIR/modules/01-resource-group.sh"; then
            log_error "Phase 1.1 failed"
            exit 1
        fi
        echo ""
        log_success "Phase 1.1 completed successfully"
        echo ""
    fi
    
    # Step 1.2: Database
    if [ $start_step -le 2 ]; then
        log_section "Phase 1.2: Database Setup"
        if ! bash "$SCRIPT_DIR/modules/02-database.sh"; then
            log_error "Phase 1.2 failed"
            exit 1
        fi
        echo ""
        log_success "Phase 1.2 completed successfully"
        echo ""
    fi
    
    # Step 1.3: Redis
    if [ $start_step -le 3 ]; then
        log_section "Phase 1.3: Redis Setup"
        if ! bash "$SCRIPT_DIR/modules/03-redis.sh"; then
            log_error "Phase 1.3 failed"
            exit 1
        fi
        echo ""
        log_success "Phase 1.3 completed successfully"
        echo ""
    fi
    
    # Step 1.4: Container Registry
    if [ $start_step -le 4 ]; then
        log_section "Phase 1.4: Container Registry"
        if ! bash "$SCRIPT_DIR/modules/04-container-registry.sh"; then
            log_error "Phase 1.4 failed"
            exit 1
        fi
        echo ""
        log_success "Phase 1.4 completed successfully"
        echo ""
    fi
}

# =============================================================================
# USAGE AND HELP
# =============================================================================

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --step N          Start from step N (1-4)"
    echo "  --step-only N     Run only step N"
    echo "  --help           Show this help message"
    echo ""
    echo "Steps:"
    echo "  1 - Resource Group & Basic Infrastructure"
    echo "  2 - PostgreSQL Database + Literature Import"
    echo "  3 - Redis Cache Setup"
    echo "  4 - Container Registry"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all steps"
    echo "  $0 --step 2           # Start from step 2"
    echo "  $0 --step-only 1      # Run only step 1"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    local start_step=1
    local step_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --step)
                start_step="$2"
                shift 2
                ;;
            --step-only)
                start_step="$2"
                step_only=true
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Validate step number
    if [[ ! "$start_step" =~ ^[1-4]$ ]]; then
        log_error "Invalid step number: $start_step (must be 1-4)"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    
    # Run the phase
    if [ "$step_only" = true ]; then
        # Run only the specified step
        case $start_step in
            1)
                bash "$SCRIPT_DIR/modules/01-resource-group.sh"
                ;;
            2)
                bash "$SCRIPT_DIR/modules/02-database.sh"
                ;;
            3)
                bash "$SCRIPT_DIR/modules/03-redis.sh"
                ;;
            4)
                bash "$SCRIPT_DIR/modules/04-container-registry.sh"
                ;;
        esac
    else
        # Run from specified step onwards
        run_phase_1 "$start_step"
    fi
    
    if [ $start_step -eq 1 ] && [ "$step_only" = false ]; then
        echo ""
        log_success "🎉 Phase 1.1 Infrastructure Foundation Started!"
        echo ""
        echo "📋 What's Complete:"
        echo "  ✅ Resource Group: $RESOURCE_GROUP"
        echo "  ✅ Basic Azure Infrastructure"
        echo "  ✅ Resource Policies & Tags"
        echo ""
        echo "🔄 Next Steps:"
        echo "  1. Run: ./deploy/modules/02-database.sh"
        echo "  2. Run: ./deploy/modules/03-redis.sh" 
        echo "  3. Run: ./deploy/modules/04-container-registry.sh"
        echo ""
        echo "💡 Or run all remaining Phase 1 modules:"
        echo "  ./deploy/phase1-infrastructure.sh --step 2"
        echo ""
        echo "🚀 Or run complete Phase 1:"
        echo "  ./deploy/phase1-infrastructure.sh"
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi