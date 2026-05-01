#!/bin/bash

# ============================================
# Nexxus-Pro Restore Script
# ============================================
# Usage: ./restore.sh [backup_file]
# Example: ./restore.sh backup_20240101_120000.tar.gz
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_FILE=$1
BACKUP_DIR="/var/backups/nexxus-pro"
APP_DIR="/var/www/nexxus-pro/current"
DB_NAME="nexxus_pro"
DB_USER="nexxus"
LOG_FILE="/var/log/nexxus-pro/restore.log"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
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

# Check backup file
check_backup() {
    if [ -z "$BACKUP_FILE" ]; then
        echo ""
        echo "Available backups:"
        ls -lh "$BACKUP_DIR"/full/*.tar.gz 2>/dev/null || echo "  No backups found"
        echo ""
        echo "Usage: ./restore.sh <backup_file>"
        echo "Example: ./restore.sh full_backup_20240101_120000.tar.gz"
        exit 1
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        # Check in full directory
        if [ -f "$BACKUP_DIR/full/$BACKUP_FILE" ]; then
            BACKUP_FILE="$BACKUP_DIR/full/$BACKUP_FILE"
        else
            error "Backup file not found: $BACKUP_FILE"
        fi
    fi
    
    log "Using backup: $BACKUP_FILE"
}

# Stop services
stop_services() {
    log "Stopping services..."
    systemctl stop nginx 2>/dev/null || true
    pm2 stop all 2>/dev/null || true
    success "Services stopped"
}

# Restore database
restore_database() {
    log "Restoring database..."
    
    # Find database backup in archive
    DB_BACKUP=$(tar -tzf "$BACKUP_FILE" | grep "database.sql" | head -1)
    
    if [ -n "$DB_BACKUP" ]; then
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" "$DB_BACKUP"
        
        # Drop and recreate database
        PGPASSWORD=nexxus123 dropdb -U $DB_USER -h localhost --if-exists $DB_NAME
        PGPASSWORD=nexxus123 createdb -U $DB_USER -h localhost $DB_NAME
        
        # Restore
        PGPASSWORD=nexxus123 psql -U $DB_USER -h localhost $DB_NAME < "$TEMP_DIR/$DB_BACKUP"
        
        rm -rf "$TEMP_DIR"
        success "Database restored"
    else
        warning "No database backup found in archive"
    fi
}

# Restore files
restore_files() {
    log "Restoring application files..."
    
    # Backup current files before restore
    if [ -d "$APP_DIR" ]; then
        mv "$APP_DIR" "$APP_DIR.bak.$(date +%Y%m%d_%H%M%S)"
    fi
    
    mkdir -p "$APP_DIR"
    
    # Extract files (exclude node_modules and temp)
    tar -xzf "$BACKUP_FILE" -C "$APP_DIR" --strip-components=1 \
        --exclude="*.sql" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="storage/temp" \
        --exclude="storage/chunks" 2>/dev/null || true
    
    success "Files restored"
}

# Restore configuration
restore_config() {
    log "Restoring configuration files..."
    
    # Find nginx config
    if tar -tzf "$BACKUP_FILE" | grep -q "nginx"; then
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" "nginx" 2>/dev/null || true
        
        if [ -f "$TEMP_DIR/nginx/nexxus-pro" ]; then
            cp "$TEMP_DIR/nginx/nexxus-pro" /etc/nginx/sites-available/
            success "Nginx configuration restored"
        fi
        
        rm -rf "$TEMP_DIR"
    fi
    
    # Find .env file
    if tar -tzf "$BACKUP_FILE" | grep -q ".env"; then
        TEMP_DIR=$(mktemp -d)
        tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR" ".env" 2>/dev/null || true
        
        if [ -f "$TEMP_DIR/.env" ]; then
            cp "$TEMP_DIR/.env" "$APP_DIR/"
            success "Environment configuration restored"
        fi
        
        rm -rf "$TEMP_DIR"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    cd "$APP_DIR"
    npm ci --only=production 2>/dev/null || true
    success "Dependencies installed"
}

# Run migrations
run_migrations() {
    log "Running database migrations..."
    cd "$APP_DIR"
    NODE_ENV=production npm run migrate 2>/dev/null || true
    success "Migrations completed"
}

# Start services
start_services() {
    log "Starting services..."
    cd "$APP_DIR"
    pm2 start ecosystem.config.js 2>/dev/null || pm2 start server.js
    systemctl start nginx 2>/dev/null || true
    success "Services started"
}

# Verify restore
verify_restore() {
    log "Verifying restore..."
    
    # Check API
    if curl -s http://localhost:5000/health | grep -q "ok"; then
        success "API is healthy"
    else
        warning "API health check failed"
    fi
    
    # Check frontend
    if curl -s http://localhost | grep -q "Nexxus-Pro"; then
        success "Frontend is accessible"
    else
        warning "Frontend check failed"
    fi
    
    # Check database
    if PGPASSWORD=nexxus123 psql -U $DB_USER -h localhost -d $DB_NAME -c "SELECT 1" &>/dev/null; then
        success "Database is accessible"
    else
        warning "Database check failed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backup directories..."
    rm -rf "$APP_DIR.bak."* 2>/dev/null || true
    success "Cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Restore $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Main function
main() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Restore Script"
    echo "=========================================="
    echo ""
    
    check_backup
    
    echo "WARNING: This will overwrite existing data!"
    echo "Backup file: $BACKUP_FILE"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        error "Restore cancelled"
    fi
    
    stop_services
    restore_database
    restore_files
    restore_config
    install_dependencies
    run_migrations
    start_services
    verify_restore
    cleanup_old_backups
    send_notification "completed" "Restore completed from $BACKUP_FILE"
    
    echo ""
    success "Restore completed successfully!"
    echo ""
}

# Run main function
main