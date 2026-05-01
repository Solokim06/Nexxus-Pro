#!/bin/bash

# ============================================
# Nexxus-Pro Monitoring Script
# ============================================
# Usage: ./monitor.sh
# Description: Monitors system health and sends alerts
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ALERT_EMAIL="admin@nexxus-pro.com"
SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-""}
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=80
LOG_FILE="/var/log/nexxus-pro/monitor.log"

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check CPU usage
check_cpu() {
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    CPU_USAGE=${CPU_USAGE%.*}
    
    if [ "$CPU_USAGE" -gt "$CPU_THRESHOLD" ]; then
        warning "High CPU usage: ${CPU_USAGE}% (Threshold: ${CPU_THRESHOLD}%)"
        return 1
    else
        success "CPU usage: ${CPU_USAGE}%"
        return 0
    fi
}

# Check memory usage
check_memory() {
    MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100}')
    MEMORY_USAGE=${MEMORY_USAGE%.*}
    
    if [ "$MEMORY_USAGE" -gt "$MEMORY_THRESHOLD" ]; then
        warning "High memory usage: ${MEMORY_USAGE}% (Threshold: ${MEMORY_THRESHOLD}%)"
        return 1
    else
        success "Memory usage: ${MEMORY_USAGE}%"
        return 0
    fi
}

# Check disk usage
check_disk() {
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
        warning "High disk usage: ${DISK_USAGE}% (Threshold: ${DISK_THRESHOLD}%)"
        return 1
    else
        success "Disk usage: ${DISK_USAGE}%"
        return 0
    fi
}

# Check API health
check_api() {
    if curl -s -f http://localhost:5000/health > /dev/null 2>&1; then
        success "API is healthy"
        return 0
    else
        error "API is down!"
        return 1
    fi
}

# Check frontend
check_frontend() {
    if curl -s -f http://localhost > /dev/null 2>&1; then
        success "Frontend is healthy"
        return 0
    else
        error "Frontend is down!"
        return 1
    fi
}

# Check database
check_database() {
    if PGPASSWORD=nexxus123 psql -U nexxus -h localhost -d nexxus_pro -c "SELECT 1" > /dev/null 2>&1; then
        success "Database is healthy"
        return 0
    else
        error "Database is down!"
        return 1
    fi
}

# Check Redis
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        success "Redis is healthy"
        return 0
    else
        error "Redis is down!"
        return 1
    fi
}

# Check PM2 processes
check_pm2() {
    if pm2 list | grep -q "online"; then
        success "PM2 processes are running"
        return 0
    else
        error "PM2 processes are not running!"
        return 1
    fi
}

# Check Nginx
check_nginx() {
    if systemctl is-active --quiet nginx; then
        success "Nginx is running"
        return 0
    else
        error "Nginx is not running!"
        return 1
    fi
}

# Check SSL certificate expiry
check_ssl() {
    if [ -f "/etc/letsencrypt/live/nexxus-pro.com/fullchain.pem" ]; then
        EXPIRY_DATE=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/nexxus-pro.com/fullchain.pem | cut -d= -f2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
        CURRENT_EPOCH=$(date +%s)
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
        
        if [ "$DAYS_LEFT" -lt 30 ]; then
            warning "SSL certificate expires in $DAYS_LEFT days"
        else
            success "SSL certificate expires in $DAYS_LEFT days"
        fi
    fi
}

# Check storage usage
check_storage() {
    STORAGE_SIZE=$(du -sh /var/www/nexxus-pro/current/storage 2>/dev/null | cut -f1)
    success "Storage usage: $STORAGE_SIZE"
}

# Check recent errors in logs
check_logs() {
    ERROR_COUNT=$(grep -c "ERROR" /var/log/nexxus-pro/error.log 2>/dev/null || echo "0")
    
    if [ "$ERROR_COUNT" -gt 100 ]; then
        warning "High error count in logs: $ERROR_COUNT errors"
    else
        success "Log errors: $ERROR_COUNT"
    fi
}

# Send alert
send_alert() {
    local message="$1"
    
    # Send email
    echo "$message" | mail -s "Nexxus-Pro Alert" "$ALERT_EMAIL" 2>/dev/null || true
    
    # Send Slack
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
}

# Generate report
generate_report() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Health Report"
    echo "=========================================="
    echo "Timestamp: $(date)"
    echo ""
    
    check_cpu
    check_memory
    check_disk
    check_storage
    echo ""
    
    check_api
    check_frontend
    check_database
    check_redis
    echo ""
    
    check_pm2
    check_nginx
    check_ssl
    check_logs
    echo ""
    echo "=========================================="
}

# Main function
main() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Monitoring"
    echo "=========================================="
    echo ""
    
    # Run all checks
    FAILED=0
    
    check_cpu || FAILED=1
    check_memory || FAILED=1
    check_disk || FAILED=1
    check_api || FAILED=1
    check_frontend || FAILED=1
    check_database || FAILED=1
    check_redis || FAILED=1
    check_pm2 || FAILED=1
    check_nginx || FAILED=1
    
    # Send alert if any check failed
    if [ $FAILED -eq 1 ]; then
        send_alert "One or more health checks failed on $(hostname) at $(date)"
    fi
    
    generate_report
}

# Run main function
main