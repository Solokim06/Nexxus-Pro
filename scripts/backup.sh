#!/bin/bash

# ============================================
# Nexxus-Pro Backup Script
# ============================================
# Usage: ./backup.sh [backup_type]
# backup_type: full, database, files, config
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_TYPE=${1:-full}
BACKUP_DIR="/var/backups/nexxus-pro"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/var/log/nexxus-pro/backup.log"
RETENTION_DAYS=30
DB_NAME="nexxus_pro"
DB_USER="nexxus"
APP_DIR="/var/www/nexxus-pro/current"

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

# Create backup directory
create_backup_dir() {
    mkdir -p "$BACKUP_DIR"/{database,files,config,full}
    mkdir -p "$BACKUP_DIR/daily/$DATE"
    mkdir -p "$BACKUP_DIR/weekly/$DATE"
    mkdir -p "$BACKUP_DIR/monthly/$DATE"
    success "Backup directories created"
}

# Backup database
backup_database() {
    log "Backing up database..."
    
    BACKUP_FILE="$BACKUP_DIR/database/backup_${DB_NAME}_${DATE}.sql.gz"
    
    PGPASSWORD=nexxus123 pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        success "Database backup created: $BACKUP_FILE ($SIZE)"
    else
        error "Database backup failed"
    fi
}

# Backup files
backup_files() {
    log "Backing up application files..."
    
    BACKUP_FILE="$BACKUP_DIR/files/files_backup_${DATE}.tar.gz"
    
    if [ -d "$APP_DIR" ]; then
        tar -czf "$BACKUP_FILE" \
            --exclude="$APP_DIR/node_modules" \
            --exclude="$APP_DIR/.git" \
            --exclude="$APP_DIR/storage/temp" \
            --exclude="$APP_DIR/storage/chunks" \
            --exclude="$APP_DIR/logs/*.log" \
            "$APP_DIR" 2>/dev/null || true
        
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        success "Files backup created: $BACKUP_FILE ($SIZE)"
    else
        warning "Application directory not found, skipping files backup"
    fi
}

# Backup configuration
backup_config() {
    log "Backing up configuration files..."
    
    BACKUP_FILE="$BACKUP_DIR/config/config_backup_${DATE}.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        /etc/nginx/sites-available/nexxus-pro \
        /etc/systemd/system/nexxus-*.service \
        $APP_DIR/.env 2>/dev/null || true
    
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Configuration backup created: $BACKUP_FILE ($SIZE)"
}

# Full backup
backup_full() {
    log "Creating full backup..."
    
    BACKUP_FILE="$BACKUP_DIR/full/full_backup_${DATE}.tar.gz"
    
    # Create temp directory
    TEMP_DIR="/tmp/nexxus_backup_$DATE"
    mkdir -p "$TEMP_DIR"
    
    # Backup database
    PGPASSWORD=nexxus123 pg_dump -U $DB_USER -h localhost $DB_NAME > "$TEMP_DIR/database.sql"
    
    # Backup files
    if [ -d "$APP_DIR" ]; then
        cp -r "$APP_DIR" "$TEMP_DIR/app" 2>/dev/null || true
        rm -rf "$TEMP_DIR/app/node_modules"
        rm -rf "$TEMP_DIR/app/.git"
        rm -rf "$TEMP_DIR/app/storage/temp"
    fi
    
    # Backup configs
    cp -r /etc/nginx/sites-available "$TEMP_DIR/nginx" 2>/dev/null || true
    cp $APP_DIR/.env "$TEMP_DIR/" 2>/dev/null || true
    
    # Create archive
    tar -czf "$BACKUP_FILE" -C "$TEMP_DIR" .
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    success "Full backup created: $BACKUP_FILE ($SIZE)"
}

# Rotate old backups
rotate_backups() {
    log "Rotating old backups..."
    
    # Delete backups older than RETENTION_DAYS
    find "$BACKUP_DIR" -type f -name "*.gz" -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -type d -empty -delete
    
    success "Old backups rotated"
}

# Create weekly backup
create_weekly() {
    local WEEK_NUM=$(date +%W)
    local WEEKLY_DIR="$BACKUP_DIR/weekly/week_$WEEK_NUM"
    
    if [ ! -d "$WEEKLY_DIR" ]; then
        mkdir -p "$WEEKLY_DIR"
        cp "$BACKUP_DIR/database/"*.sql.gz "$WEEKLY_DIR/" 2>/dev/null || true
        cp "$BACKUP_DIR/files/"*.tar.gz "$WEEKLY_DIR/" 2>/dev/null || true
        success "Weekly backup created"
    fi
}

# Create monthly backup
create_monthly() {
    local MONTH=$(date +%Y%m)
    local MONTHLY_DIR="$BACKUP_DIR/monthly/$MONTH"
    
    if [ ! -d "$MONTHLY_DIR" ]; then
        mkdir -p "$MONTHLY_DIR"
        cp "$BACKUP_DIR/database/"*.sql.gz "$MONTHLY_DIR/" 2>/dev/null || true
        cp "$BACKUP_DIR/files/"*.tar.gz "$MONTHLY_DIR/" 2>/dev/null || true
        success "Monthly backup created"
    fi
}

# Upload to S3 (optional)
upload_to_s3() {
    if command -v aws &> /dev/null && [ -n "$AWS_BACKUP_BUCKET" ]; then
        log "Uploading backups to S3..."
        aws s3 sync "$BACKUP_DIR" "s3://$AWS_BACKUP_BUCKET/backups/" --delete
        success "Backups uploaded to S3"
    fi
}

# Send notification
send_notification() {
    local status=$1
    local message=$2
    
    # Send to Slack webhook if configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Send email if configured
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "Backup $status - Nexxus-Pro" "$ALERT_EMAIL" 2>/dev/null || true
    fi
}

# Main function
main() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Backup Script"
    echo "=========================================="
    echo ""
    echo "Backup type: $BACKUP_TYPE"
    echo "Date: $DATE"
    echo ""
    
    create_backup_dir
    
    case "$BACKUP_TYPE" in
        database)
            backup_database
            ;;
        files)
            backup_files
            ;;
        config)
            backup_config
            ;;
        full)
            backup_database
            backup_files
            backup_config
            backup_full
            ;;
        *)
            backup_database
            backup_files
            backup_config
            ;;
    esac
    
    rotate_backups
    
    # Weekly backup on Sunday
    if [ $(date +%u) -eq 7 ]; then
        create_weekly
    fi
    
    # Monthly backup on 1st day
    if [ $(date +%d) -eq 1 ]; then
        create_monthly
    fi
    
    upload_to_s3
    send_notification "completed" "Backup completed successfully at $DATE"
    
    echo ""
    success "Backup completed!"
    echo ""
}

# Run main function
main