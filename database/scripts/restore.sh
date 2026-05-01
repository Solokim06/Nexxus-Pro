#!/bin/bash

# ============================================
# Database Restore Script
# Description: Restores PostgreSQL database from backup
# Usage: ./restore.sh [backup_file] [database_name]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_FILE=${1:-""}
DB_NAME=${2:-"nexxus_pro"}
BACKUP_DIR="./backups"
LOG_FILE="${BACKUP_DIR}/restore_$(date +"%Y%m%d_%H%M%S").log"

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

# Check if backup file is provided
check_backup_file() {
    if [ -z "$BACKUP_FILE" ]; then
        echo ""
        echo "Available backups:"
        echo "=================="
        ls -lh "$BACKUP_DIR"/*.sql* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
        echo ""
        echo "Usage: ./restore.sh <backup_file> [database_name]"
        echo "Example: ./restore.sh backups/backup_nexxus_pro_20240101_120000.sql.gz"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        error "Backup file not found: $BACKUP_FILE"
    fi
    
    log "Using backup file: $BACKUP_FILE"
}

# Check if restore tools are available
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v pg_restore &> /dev/null; then
        error "pg_restore not found. Please install PostgreSQL client tools."
    fi
    
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
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1" &> /dev/null; then
        success "Database connection successful"
    else
        error "Failed to connect to database"
    fi
    
    unset PGPASSWORD
}

# Check if database exists
database_exists() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    local exists=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -t -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null | xargs)
    
    unset PGPASSWORD
    
    if [ "$exists" = "1" ]; then
        return 0
    else
        return 1
    fi
}

# Create database if it doesn't exist
create_database() {
    if database_exists; then
        warning "Database '$DB_NAME' already exists"
        echo -n "Do you want to drop and recreate it? (yes/no): "
        read -r response
        if [ "$response" != "yes" ]; then
            error "Restore cancelled by user"
        fi
        
        log "Dropping existing database..."
        if [ -n "$DB_PASSWORD" ]; then
            export PGPASSWORD="$DB_PASSWORD"
        fi
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "DROP DATABASE IF EXISTS $DB_NAME" >> "$LOG_FILE" 2>&1
        
        unset PGPASSWORD
    fi
    
    log "Creating database: $DB_NAME"
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE $DB_NAME" >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        success "Database created successfully"
    else
        error "Failed to create database"
    fi
    
    unset PGPASSWORD
}

# Restore from backup
restore_backup() {
    log "Starting restore process..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # Check if backup is compressed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        log "Restoring from compressed backup..."
        
        if command -v gunzip &> /dev/null; then
            gunzip -c "$BACKUP_FILE" | pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose 2>> "$LOG_FILE"
        else
            error "gunzip not found. Cannot restore compressed backup."
        fi
    elif [[ "$BACKUP_FILE" == *.sql ]]; then
        log "Restoring from SQL backup..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE" >> "$LOG_FILE" 2>&1
    else
        log "Restoring from custom format backup..."
        pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --verbose --clean --if-exists "$BACKUP_FILE" 2>> "$LOG_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        success "Restore completed successfully"
    else
        error "Restore failed. Check log file: $LOG_FILE"
    fi
    
    unset PGPASSWORD
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    # Check table count
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | xargs)
    
    if [ -n "$table_count" ]; then
        success "Tables restored: $table_count"
    else
        warning "Could not verify table count"
    fi
    
    unset PGPASSWORD
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "    Database Restore Script"
    echo "=========================================="
    echo ""
    
    check_backup_file
    check_dependencies
    test_connection
    create_database
    restore_backup
    verify_restore
    
    echo ""
    success "Restore process completed!"
    echo "Log file: $LOG_FILE"
    echo ""
}

# Run main function
main