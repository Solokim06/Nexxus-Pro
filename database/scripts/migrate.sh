#!/bin/bash

# ============================================
# Database Migration Script
# Description: Runs database migrations
# Usage: ./migrate.sh [up|down|status|create]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_DIR="../migrations"
DB_NAME=${DB_NAME:-"nexxus_pro"}
LOG_FILE="./migration_$(date +"%Y%m%d_%H%M%S").log"

# Load environment variables
if [ -f "../../.env" ]; then
    source "../../.env"
elif [ -f "../.env" ]; then
    source "../.env"
elif [ -f ".env" ]; then
    source ".env"
fi

# Use environment variables or defaults
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-""}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v psql &> /dev/null; then
        error "psql not found. Please install PostgreSQL client tools."
    fi
    
    success "Dependencies check passed"
}

# Test database connection
test_connection() {
    log "Testing database connection..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &> /dev/null; then
        success "Database connection successful"
    else
        error "Failed to connect to database"
    fi
    
    unset PGPASSWORD
}

# Create migrations table if not exists
create_migrations_table() {
    log "Creating migrations table if not exists..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << EOF >> "$LOG_FILE" 2>&1
CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
    
    if [ $? -eq 0 ]; then
        success "Migrations table ready"
    else
        error "Failed to create migrations table"
    fi
    
    unset PGPASSWORD
}

# Get executed migrations
get_executed_migrations() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version FROM migrations ORDER BY version" 2>/dev/null | xargs
    
    unset PGPASSWORD
}

# Run migrations
run_migrations() {
    log "Running pending migrations..."
    
    local executed=$(get_executed_migrations)
    local executed_count=0
    local pending_count=0
    
    # Get migration files sorted
    local migration_files=$(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort)
    
    if [ -z "$migration_files" ]; then
        warning "No migration files found in $MIGRATION_DIR"
        return
    fi
    
    for file in $migration_files; do
        local version=$(basename "$file" | cut -d'_' -f1)
        local name=$(basename "$file")
        
        if echo "$executed" | grep -q "$version"; then
            log "✓ Migration $version already executed, skipping"
            ((executed_count++))
        else
            log "Running migration $version: $name"
            
            if [ -n "$DB_PASSWORD" ]; then
                export PGPASSWORD="$DB_PASSWORD"
            fi
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" >> "$LOG_FILE" 2>&1
            
            if [ $? -eq 0 ]; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO migrations (version, name) VALUES ('$version', '$name')" >> "$LOG_FILE" 2>&1
                success "✓ Migration $version completed"
                ((pending_count++))
            else
                error "Migration $version failed. Check log: $LOG_FILE"
            fi
            
            unset PGPASSWORD
        fi
    done
    
    echo ""
    log "Migration summary:"
    log "  Executed: $executed_count"
    log "  Pending: $pending_count"
    log "  Total: $(echo "$migration_files" | wc -l)"
}

# Rollback migrations
rollback_migrations() {
    local steps=${1:-1}
    log "Rolling back $steps migration(s)..."
    
    local executed=$(get_executed_migrations)
    local executed_list=($executed)
    local total_executed=${#executed_list[@]}
    
    if [ $total_executed -eq 0 ]; then
        warning "No migrations to rollback"
        return
    fi
    
    local rollback_count=$((total_executed < steps ? total_executed : steps))
    local rolled_back=0
    
    for ((i = total_executed - 1; i >= total_executed - rollback_count; i--)); do
        local version=${executed_list[$i]}
        local rollback_file="$MIGRATION_DIR/rollback_${version}.sql"
        
        if [ -f "$rollback_file" ]; then
            log "Rolling back migration $version"
            
            if [ -n "$DB_PASSWORD" ]; then
                export PGPASSWORD="$DB_PASSWORD"
            fi
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$rollback_file" >> "$LOG_FILE" 2>&1
            
            if [ $? -eq 0 ]; then
                psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM migrations WHERE version='$version'" >> "$LOG_FILE" 2>&1
                success "✓ Rollback $version completed"
                ((rolled_back++))
            else
                error "Rollback $version failed. Check log: $LOG_FILE"
            fi
            
            unset PGPASSWORD
        else
            warning "No rollback file found for migration $version"
        fi
    done
    
    log "Rolled back $rolled_back migration(s)"
}

# Show migration status
show_status() {
    log "Migration Status:"
    echo ""
    echo "=========================================="
    echo "  Version | Status | Name"
    echo "=========================================="
    
    local executed=$(get_executed_migrations)
    
    for file in $(ls -1 "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
        local version=$(basename "$file" | cut -d'_' -f1)
        local name=$(basename "$file")
        
        if echo "$executed" | grep -q "$version"; then
            echo "  $version    | ${GREEN}✓ Executed${NC} | $name"
        else
            echo "  $version    | ${YELLOW}○ Pending${NC} | $name"
        fi
    done
    
    echo "=========================================="
    echo ""
}

# Create new migration
create_migration() {
    local name=$1
    if [ -z "$name" ]; then
        error "Please provide migration name: ./migrate.sh create <migration_name>"
    fi
    
    local version=$(date +"%Y%m%d_%H%M%S")
    local filename="${MIGRATION_DIR}/${version}_${name}.sql"
    local rollback_filename="${MIGRATION_DIR}/rollback_${version}.sql"
    
    mkdir -p "$MIGRATION_DIR"
    
    cat > "$filename" << EOF
-- Migration: ${name}
-- Version: ${version}
-- Description: 

BEGIN;

-- Your migration SQL here

COMMIT;
EOF
    
    cat > "$rollback_filename" << EOF
-- Rollback: ${name}
-- Version: ${version}
-- Description: 

BEGIN;

-- Your rollback SQL here

COMMIT;
EOF
    
    success "Migration created: $filename"
    success "Rollback created: $rollback_filename"
}

# Main execution
main() {
    local command=${1:-"up"}
    local param=${2:-""}
    
    echo ""
    echo "=========================================="
    echo "    Database Migration Script"
    echo "=========================================="
    echo ""
    
    check_dependencies
    test_connection
    create_migrations_table
    
    case "$command" in
        up)
            run_migrations
            ;;
        down)
            rollback_migrations "$param"
            ;;
        status)
            show_status
            ;;
        create)
            create_migration "$param"
            ;;
        *)
            echo "Usage: ./migrate.sh [up|down|status|create] [options]"
            echo ""
            echo "Commands:"
            echo "  up                 - Run all pending migrations"
            echo "  down [steps]       - Rollback migrations (default: 1)"
            echo "  status             - Show migration status"
            echo "  create <name>      - Create new migration"
            echo ""
            echo "Examples:"
            echo "  ./migrate.sh up"
            echo "  ./migrate.sh down 3"
            echo "  ./migrate.sh status"
            echo "  ./migrate.sh create add_users_table"
            exit 1
            ;;
    esac
    
    echo ""
    success "Migration operation completed!"
    echo "Log file: $LOG_FILE"
    echo ""
}

# Run main function
main "$@"