#!/bin/bash

# ============================================
# Database Rollback Script
# Description: Rolls back database migrations
# Usage: ./rollback.sh [steps] [--force]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STEPS=${1:-1}
FORCE=${2:-"--force"}
DB_NAME=${DB_NAME:-"nexxus_pro"}
LOG_FILE="./rollback_$(date +"%Y%m%d_%H%M%S").log"

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

# Get executed migrations
get_executed_migrations() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version, name FROM migrations ORDER BY version" 2>/dev/null
    
    unset PGPASSWORD
}

# Get last migration
get_last_migration() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT version, name FROM migrations ORDER BY version DESC LIMIT 1" 2>/dev/null | xargs
    
    unset PGPASSWORD
}

# Show confirmation prompt
confirm_rollback() {
    local steps=$1
    local last_migration=$(get_last_migration)
    
    echo ""
    warning "⚠️  WARNING: You are about to rollback $steps migration(s)"
    
    if [ -n "$last_migration" ]; then
        echo "Last migration: $last_migration"
    fi
    
    echo ""
    echo "This action may result in data loss!"
    echo ""
    
    if [ "$FORCE" != "--force" ]; then
        echo -n "Are you sure you want to continue? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            error "Rollback cancelled by user"
        fi
    fi
}

# Create backup before rollback
create_pre_rollback_backup() {
    log "Creating backup before rollback..."
    
    local backup_file="./backups/pre_rollback_${DB_NAME}_$(date +"%Y%m%d_%H%M%S").sql"
    mkdir -p "./backups"
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=custom \
        --compress=9 \
        --file="$backup_file" \
        --verbose 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        success "Pre-rollback backup created: $backup_file"
    else
        warning "Failed to create pre-rollback backup"
    fi
    
    unset PGPASSWORD
}

# Perform rollback
perform_rollback() {
    local steps=$1
    log "Starting rollback of $steps migration(s)..."
    
    local executed=$(get_executed_migrations)
    local executed_list=()
    
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            executed_list+=("$line")
        fi
    done <<< "$executed"
    
    local total_executed=${#executed_list[@]}
    
    if [ $total_executed -eq 0 ]; then
        warning "No migrations to rollback"
        return
    fi
    
    local rollback_count=$((total_executed < steps ? total_executed : steps))
    local rolled_back=0
    
    for ((i = total_executed - 1; i >= total_executed - rollback_count; i--)); do
        local migration_info=(${executed_list[$i]})
        local version=${migration_info[0]}
        local name=${migration_info[1]}
        
        log "Rolling back migration $version: $name"
        
        # Look for rollback file
        local rollback_file="../migrations/rollback_${version}.sql"
        
        if [ ! -f "$rollback_file" ]; then
            # Try alternative naming
            rollback_file=$(ls -1 ../migrations/*_rollback_*.sql 2>/dev/null | grep "$version" | head -1)
        fi
        
        if [ -f "$rollback_file" ]; then
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
            warning "No rollback file found for migration $version, attempting manual rollback..."
            
            # Try to reverse the migration (if it's a simple CREATE/DROP)
            if [ -n "$DB_PASSWORD" ]; then
                export PGPASSWORD="$DB_PASSWORD"
            fi
            
            # Attempt to drop tables that might have been created
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%${version}%'" 2>/dev/null | while read -r table; do
                if [ -n "$table" ] && [ "$table" != "tablename" ] && [ "$table" != "--------" ]; then
                    log "Dropping table: $table"
                    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DROP TABLE IF EXISTS $table CASCADE" >> "$LOG_FILE" 2>&1
                fi
            done
            
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM migrations WHERE version='$version'" >> "$LOG_FILE" 2>&1
            success "✓ Manual rollback $version completed"
            ((rolled_back++))
            
            unset PGPASSWORD
        fi
    done
    
    log "Rolled back $rolled_back migration(s)"
}

# Verify rollback
verify_rollback() {
    log "Verifying rollback..."
    
    local remaining=$(get_executed_migrations)
    local remaining_count=$(echo "$remaining" | grep -c '[^[:space:]]' || echo "0")
    
    success "Remaining migrations: $remaining_count"
}

# Show rollback summary
show_summary() {
    echo ""
    echo "=========================================="
    echo "    Rollback Summary"
    echo "=========================================="
    echo "Steps requested: $STEPS"
    echo "Log file: $LOG_FILE"
    echo "=========================================="
    echo ""
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "    Database Rollback Script"
    echo "=========================================="
    echo ""
    
    check_dependencies
    test_connection
    
    # Validate steps is a number
    if ! [[ "$STEPS" =~ ^[0-9]+$ ]]; then
        error "Steps must be a number: $STEPS"
    fi
    
    confirm_rollback "$STEPS"
    create_pre_rollback_backup
    perform_rollback "$STEPS"
    verify_rollback
    show_summary
    
    success "Rollback completed!"
}

# Run main function
main