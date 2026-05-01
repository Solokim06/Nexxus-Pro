#!/bin/bash

# ============================================
# Database Backup Script
# Description: Creates backup of PostgreSQL database
# Usage: ./backup.sh [database_name] [backup_location]
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME=${1:-"nexxus_pro"}
BACKUP_DIR=${2:-"./backups"}
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup_${DATE}.log"

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
DB_NAME=${DB_NAME:-"nexxus_pro"}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

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

# Check if pg_dump is available
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump not found. Please install PostgreSQL client tools."
    fi
    
    if ! command -v gzip &> /dev/null; then
        warning "gzip not found. Backup will not be compressed."
        BACKUP_FILE="${BACKUP_DIR}/backup_${DB_NAME}_${DATE}.sql"
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

# Create backup
create_backup() {
    log "Starting backup of database: $DB_NAME"
    
    # Calculate estimated size before backup
    local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_database_size('$DB_NAME')" 2>/dev/null | xargs)
    
    if [ -n "$db_size" ]; then
        local size_mb=$(echo "scale=2; $db_size / 1024 / 1024" | bc)
        log "Database size: ${size_mb} MB"
    fi
    
    # Create backup
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    if command -v gzip &> /dev/null; then
        log "Creating compressed backup..."
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --format=custom \
            --compress=9 \
            --file="$BACKUP_FILE" \
            --verbose 2>> "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
            success "Backup created: $BACKUP_FILE (Size: $backup_size)"
        else
            error "Backup failed"
        fi
    else
        log "Creating uncompressed backup..."
        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            --format=plain \
            --file="${BACKUP_FILE}" \
            --verbose 2>> "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            local backup_size=$(du -h "$BACKUP_FILE" | cut -f1)
            success "Backup created: $BACKUP_FILE (Size: $backup_size)"
        else
            error "Backup failed"
        fi
    fi
    
    unset PGPASSWORD
}

# Create schema-only backup
create_schema_backup() {
    local schema_backup="${BACKUP_DIR}/schema_${DB_NAME}_${DATE}.sql"
    log "Creating schema-only backup..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --schema-only \
        --format=plain \
        --file="$schema_backup" \
        --verbose 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        success "Schema backup created: $schema_backup"
    else
        warning "Schema backup failed"
    fi
    
    unset PGPASSWORD
}

# Create data-only backup
create_data_backup() {
    local data_backup="${BACKUP_DIR}/data_${DB_NAME}_${DATE}.sql"
    log "Creating data-only backup..."
    
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --data-only \
        --format=plain \
        --file="$data_backup" \
        --verbose 2>> "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        success "Data backup created: $data_backup"
    else
        warning "Data backup failed"
    fi
    
    unset PGPASSWORD
}

# List existing backups
list_backups() {
    log "Existing backups in $BACKUP_DIR:"
    echo ""
    ls -lh "$BACKUP_DIR"/*.sql* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
    echo ""
}

# Cleanup old backups (keep last 10)
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    local backup_count=$(ls -1 "$BACKUP_DIR"/backup_*.sql* 2>/dev/null | wc -l)
    local keep_count=10
    
    if [ "$backup_count" -gt "$keep_count" ]; then
        local to_delete=$(($backup_count - $keep_count))
        ls -t "$BACKUP_DIR"/backup_*.sql* | tail -n "$to_delete" | while read file; do
            rm -f "$file"
            log "Deleted old backup: $(basename "$file")"
        done
        success "Cleaned up $to_delete old backup(s)"
    else
        log "No cleanup needed (${backup_count}/${keep_count} backups)"
    fi
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "    Database Backup Script"
    echo "=========================================="
    echo ""
    
    check_dependencies
    test_connection
    create_backup
    create_schema_backup
    create_data_backup
    cleanup_old_backups
    list_backups
    
    echo ""
    success "Backup process completed!"
    echo "Log file: $LOG_FILE"
    echo ""
}

# Run main function
main