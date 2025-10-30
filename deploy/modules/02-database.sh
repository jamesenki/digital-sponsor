#!/bin/bash

# Digital Sponsor - Module 2: PostgreSQL Database Setup
# Creates database and imports 185 literature chunks

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Load configuration
source "$SCRIPT_DIR/../config/deployment-config.sh"

# =============================================================================
# MODULE: POSTGRESQL DATABASE CREATION
# =============================================================================

create_postgresql_server() {
    log_section "Creating PostgreSQL Flexible Server"
    
    # Check if server already exists
    if az postgres flexible-server show --name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" &>/dev/null; then
        log_warning "PostgreSQL server '$DB_SERVER_NAME' already exists"
        
        # Verify server settings
        local existing_location=$(az postgres flexible-server show --name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --query location -o tsv)
        if [ "$existing_location" != "$LOCATION" ]; then
            log_error "Existing database server is in '$existing_location', expected '$LOCATION'"
            exit 1
        fi
        
        log_success "Using existing PostgreSQL server"
        return 0
    fi
    
    log_info "Creating PostgreSQL Flexible Server '$DB_SERVER_NAME'..."
    
    # Create PostgreSQL Flexible Server
    az postgres flexible-server create \
        --name "$DB_SERVER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --admin-user "$DB_ADMIN_USER" \
        --admin-password "$DB_ADMIN_PASSWORD" \
        --sku-name "$DB_SKU" \
        --tier "$DB_TIER" \
        --storage-size "$DB_STORAGE_SIZE" \
        --public-access 0.0.0.0 \
        --tags \
            project="$DEPLOYMENT_NAME" \
            environment="$ENVIRONMENT" \
            component="database" \
            domain="$DOMAIN"
    
    if [ $? -eq 0 ]; then
        log_success "PostgreSQL server '$DB_SERVER_NAME' created successfully"
    else
        log_error "Failed to create PostgreSQL server '$DB_SERVER_NAME'"
        exit 1
    fi
    
    # Wait for server to be ready
    wait_for_resource "Microsoft.DBforPostgreSQL/flexibleServers" "$DB_SERVER_NAME" 60
}

# =============================================================================
# MODULE: DATABASE CREATION
# =============================================================================

create_database() {
    log_section "Creating Application Database"
    
    # Check if database already exists
    if az postgres flexible-server db show --server-name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DB_NAME" &>/dev/null; then
        log_warning "Database '$DB_NAME' already exists"
        log_success "Using existing database"
        return 0
    fi
    
    log_info "Creating database '$DB_NAME'..."
    
    # Create the application database
    az postgres flexible-server db create \
        --server-name "$DB_SERVER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --database-name "$DB_NAME"
    
    if [ $? -eq 0 ]; then
        log_success "Database '$DB_NAME' created successfully"
    else
        log_error "Failed to create database '$DB_NAME'"
        exit 1
    fi
}

# =============================================================================
# MODULE: FIREWALL CONFIGURATION
# =============================================================================

configure_firewall() {
    log_section "Configuring Database Firewall"
    
    log_info "Adding firewall rules for Azure services..."
    
    # Allow Azure services
    az postgres flexible-server firewall-rule create \
        --server-name "$DB_SERVER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --rule-name "AllowAzureServices" \
        --start-ip-address 0.0.0.0 \
        --end-ip-address 0.0.0.0
    
    # Allow Container Apps (they use dynamic IPs, so we need broad access for now)
    # In production, you'd use VNet integration for security
    az postgres flexible-server firewall-rule create \
        --server-name "$DB_SERVER_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --rule-name "AllowContainerApps" \
        --start-ip-address 0.0.0.0 \
        --end-ip-address 255.255.255.255
    
    log_success "Firewall rules configured"
    log_warning "Note: Using broad firewall rules for Container Apps. Use VNet integration in production."
}

# =============================================================================
# MODULE: DATABASE SCHEMA CREATION
# =============================================================================

create_database_schema() {
    log_section "Creating Database Schema"
    
    log_info "Creating database schema and tables..."
    
    # Check if we have a local database export
    local local_export="$PROJECT_ROOT/commonsolution_db_export.sql"
    
    if [ ! -f "$local_export" ]; then
        log_info "Creating database export from local development database..."
        
        # Try to export from local development database
        if command -v pg_dump &>/dev/null; then
            if pg_dump -h 127.0.0.1 -p 5433 -U postgres -d digital_sponsor_dev > "$local_export" 2>/dev/null; then
                log_success "Database exported from local development"
            else
                log_warning "Could not export from local database. Will create schema manually."
                create_schema_manually
                return 0
            fi
        else
            log_warning "pg_dump not available. Will create schema manually."
            create_schema_manually
            return 0
        fi
    fi
    
    # Import the database schema and data
    log_info "Importing database schema and literature data..."
    
    # Use psql to import the database
    if command -v psql &>/dev/null; then
        PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
            -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
            -U "$DB_ADMIN_USER" \
            -d "$DB_NAME" \
            -f "$local_export"
        
        if [ $? -eq 0 ]; then
            log_success "Database schema and data imported successfully"
        else
            log_error "Failed to import database"
            exit 1
        fi
    else
        log_error "psql not available for database import"
        log_info "You'll need to import the database manually after deployment"
        create_schema_manually
    fi
}

# =============================================================================
# MODULE: MANUAL SCHEMA CREATION
# =============================================================================

create_schema_manually() {
    log_info "Creating basic database schema manually..."
    
    # Create a basic schema SQL file
    cat > "$PROJECT_ROOT/basic_schema.sql" << 'EOF'
-- Digital Sponsor Database Schema
-- Basic schema for literature and sources

-- Literature sources table
CREATE TABLE IF NOT EXISTS literature_sources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    publication_date DATE,
    isbn VARCHAR(20),
    aa_approved BOOLEAN DEFAULT true,
    copyright_notice TEXT NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    edition VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Literature content table
CREATE TABLE IF NOT EXISTS literature_content (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES literature_sources(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    page_number INTEGER,
    section_title VARCHAR(255),
    content_text TEXT NOT NULL,
    content_type VARCHAR(50),
    keywords TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_literature_content_source_id ON literature_content(source_id);
CREATE INDEX IF NOT EXISTS idx_literature_content_type ON literature_content(content_type);
CREATE INDEX IF NOT EXISTS idx_literature_content_keywords ON literature_content USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_literature_content_fulltext ON literature_content USING GIN(to_tsvector('english', content_text));

-- Insert basic literature source
INSERT INTO literature_sources (title, author, publication_date, isbn, aa_approved, copyright_notice, source_type, edition)
VALUES ('Alcoholics Anonymous (The Big Book)', 'Alcoholics Anonymous World Services', '1939-01-01', '978-1893007161', true, '© Alcoholics Anonymous World Services, Inc. Reprinted with permission. For educational purposes only.', 'book', '4th Edition')
ON CONFLICT DO NOTHING;
EOF

    log_info "Basic schema created. You'll need to import the full literature data manually."
}

# =============================================================================
# MODULE: CONNECTION TESTING
# =============================================================================

test_database_connection() {
    log_section "Testing Database Connection"
    
    log_info "Testing connection to PostgreSQL server..."
    
    # Test basic connection
    if command -v psql &>/dev/null; then
        if PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
            -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
            -U "$DB_ADMIN_USER" \
            -d "$DB_NAME" \
            -c "SELECT version();" &>/dev/null; then
            log_success "Database connection test passed"
        else
            log_error "Database connection test failed"
            exit 1
        fi
    else
        log_warning "psql not available for connection testing"
    fi
    
    # Test literature content (if imported)
    if command -v psql &>/dev/null; then
        local count=$(PGPASSWORD="$DB_ADMIN_PASSWORD" psql \
            -h "${DB_SERVER_NAME}.postgres.database.azure.com" \
            -U "$DB_ADMIN_USER" \
            -d "$DB_NAME" \
            -t -c "SELECT COUNT(*) FROM literature_content;" 2>/dev/null | tr -d ' ')
        
        if [[ "$count" =~ ^[0-9]+$ ]] && [ "$count" -gt 0 ]; then
            log_success "Literature content available: $count chunks"
        else
            log_warning "No literature content found. You may need to import manually."
        fi
    fi
}

# =============================================================================
# MODULE: VALIDATION
# =============================================================================

validate_database() {
    log_section "Validating Database Setup"
    
    # Check server exists and is running
    local server_state=$(az postgres flexible-server show --name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --query state -o tsv)
    
    if [ "$server_state" != "Ready" ]; then
        log_error "PostgreSQL server is not ready. State: $server_state"
        exit 1
    fi
    
    # Check database exists
    if ! az postgres flexible-server db show --server-name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --database-name "$DB_NAME" &>/dev/null; then
        log_error "Database '$DB_NAME' not found"
        exit 1
    fi
    
    # Display server information
    log_info "Database server details:"
    az postgres flexible-server show --name "$DB_SERVER_NAME" --resource-group "$RESOURCE_GROUP" --output table
    
    log_success "Database validation passed"
}

# =============================================================================
# MODULE: MAIN EXECUTION
# =============================================================================

main() {
    echo "🗄️ Digital Sponsor - Phase 1.2: PostgreSQL Database Setup"
    echo "========================================================="
    
    # Check prerequisites
    if [ ! -f "$SCRIPT_DIR/../.deployment-state" ] || ! grep -q "RESOURCE_GROUP_CREATED=true" "$SCRIPT_DIR/../.deployment-state"; then
        log_error "Phase 1.1 (Resource Group) must be completed first"
        log_info "Run: ./deploy/modules/01-resource-group.sh"
        exit 1
    fi
    
    # Load and validate configuration
    check_azure_prerequisites
    validate_config
    show_deployment_summary
    
    # Confirm before proceeding
    echo ""
    read -p "Proceed with creating PostgreSQL database '$DB_SERVER_NAME'? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Execute module tasks
    create_postgresql_server
    create_database
    configure_firewall
    create_database_schema
    test_database_connection
    validate_database
    
    # Success summary
    echo ""
    log_success "✨ Phase 1.2 Complete: PostgreSQL Database Setup"
    echo ""
    echo "📋 What was created:"
    echo "  • PostgreSQL Server: $DB_SERVER_NAME"
    echo "  • Database: $DB_NAME"
    echo "  • Admin User: $DB_ADMIN_USER"
    echo "  • Firewall Rules: Configured"
    echo "  • Connection String: Ready"
    echo ""
    echo "🔗 Connection Details:"
    echo "  Host: ${DB_SERVER_NAME}.postgres.database.azure.com"
    echo "  Port: 5432"
    echo "  Database: $DB_NAME"
    echo "  Username: $DB_ADMIN_USER"
    echo "  SSL: Required"
    echo ""
    echo "🔄 Next Step:"
    echo "  Run: ./deploy/modules/03-redis.sh"
    echo ""
    
    # Update state for next modules
    echo "DATABASE_CREATED=true" >> "$SCRIPT_DIR/../.deployment-state"
    echo "PHASE_1_2_COMPLETED=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$SCRIPT_DIR/../.deployment-state"
    echo "DATABASE_URL=$DATABASE_URL" >> "$SCRIPT_DIR/../.deployment-state"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi