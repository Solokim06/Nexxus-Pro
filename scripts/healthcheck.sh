#!/bin/bash

# ============================================
# Nexxus-Pro Health Check Script
# ============================================
# Usage: ./healthcheck.sh
# Returns: 0 if healthy, 1 if unhealthy
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Configuration
API_URL="http://localhost:5000"
FRONTEND_URL="http://localhost"
TIMEOUT=10

# Check API
check_api() {
    if curl -s -f -m $TIMEOUT "$API_URL/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ API is unhealthy${NC}"
        return 1
    fi
}

# Check frontend
check_frontend() {
    if curl -s -f -m $TIMEOUT "$FRONTEND_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Frontend is unhealthy${NC}"
        return 1
    fi
}

# Check database
check_database() {
    if PGPASSWORD=nexxus123 psql -U nexxus -h localhost -d nexxus_pro -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Database is unhealthy${NC}"
        return 1
    fi
}

# Check Redis
check_redis() {
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ Redis is unhealthy${NC}"
        return 1
    fi
}

# Check storage
check_storage() {
    if [ -d "/var/www/nexxus-pro/current/storage" ]; then
        echo -e "${GREEN}✓ Storage is accessible${NC}"
        return 0
    else
        echo -e "${RED}✗ Storage is not accessible${NC}"
        return 1
    fi
}

# Check disk space
check_disk() {
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$DISK_USAGE" -lt 90 ]; then
        echo -e "${GREEN}✓ Disk space: ${DISK_USAGE}% used${NC}"
        return 0
    else
        echo -e "${RED}✗ Disk space critical: ${DISK_USAGE}% used${NC}"
        return 1
    fi
}

# Check memory
check_memory() {
    MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100}')
    MEMORY_USAGE=${MEMORY_USAGE%.*}
    
    if [ "$MEMORY_USAGE" -lt 90 ]; then
        echo -e "${GREEN}✓ Memory: ${MEMORY_USAGE}% used${NC}"
        return 0
    else
        echo -e "${RED}✗ Memory critical: ${MEMORY_USAGE}% used${NC}"
        return 1
    fi
}

# Check CPU
check_cpu() {
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    CPU_USAGE=${CPU_USAGE%.*}
    
    if [ "$CPU_USAGE" -lt 90 ]; then
        echo -e "${GREEN}✓ CPU: ${CPU_USAGE}% used${NC}"
        return 0
    else
        echo -e "${RED}✗ CPU critical: ${CPU_USAGE}% used${NC}"
        return 1
    fi
}

# Check PM2
check_pm2() {
    if pm2 list | grep -q "online"; then
        echo -e "${GREEN}✓ PM2 processes are running${NC}"
        return 0
    else
        echo -e "${RED}✗ PM2 processes are not running${NC}"
        return 1
    fi
}

# Check Nginx
check_nginx() {
    if systemctl is-active --quiet nginx; then
        echo -e "${GREEN}✓ Nginx is running${NC}"
        return 0
    else
        echo -e "${RED}✗ Nginx is not running${NC}"
        return 1
    fi
}

# Main function
main() {
    FAILED=0
    
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Health Check"
    echo "=========================================="
    echo ""
    
    check_api || FAILED=1
    check_frontend || FAILED=1
    check_database || FAILED=1
    check_redis || FAILED=1
    check_storage || FAILED=1
    check_disk || FAILED=1
    check_memory || FAILED=1
    check_cpu || FAILED=1
    check_pm2 || FAILED=1
    check_nginx || FAILED=1
    
    echo ""
    echo "=========================================="
    
    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ Overall Status: HEALTHY${NC}"
        exit 0
    else
        echo -e "${RED}✗ Overall Status: UNHEALTHY${NC}"
        exit 1
    fi
}

# Run main function
main