#!/bin/bash

# ============================================
# Nexxus-Pro Setup Script
# ============================================
# Usage: ./setup.sh
# Description: Initial server setup for Nexxus-Pro
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "Please run as root (sudo ./setup.sh)"
    fi
    success "Root privileges confirmed"
}

# Update system
update_system() {
    log "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    success "System updated"
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    success "Node.js installed: $(node --version)"
}

# Install PostgreSQL
install_postgresql() {
    log "Installing PostgreSQL 15..."
    apt-get install -y postgresql-15 postgresql-contrib-15
    systemctl enable postgresql
    systemctl start postgresql
    success "PostgreSQL installed"
    
    # Create database and user
    log "Creating database and user..."
    sudo -u postgres psql -c "CREATE USER nexxus WITH PASSWORD 'nexxus123';"
    sudo -u postgres psql -c "CREATE DATABASE nexxus_pro OWNER nexxus;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nexxus_pro TO nexxus;"
    success "Database created"
}

# Install Redis
install_redis() {
    log "Installing Redis..."
    apt-get install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
    success "Redis installed"
}

# Install Nginx
install_nginx() {
    log "Installing Nginx..."
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
    success "Nginx installed"
}

# Install PM2
install_pm2() {
    log "Installing PM2..."
    npm install -g pm2
    pm2 startup systemd
    success "PM2 installed"
}

# Install Git
install_git() {
    log "Installing Git..."
    apt-get install -y git
    success "Git installed"
}

# Install build tools
install_build_tools() {
    log "Installing build tools..."
    apt-get install -y build-essential
    success "Build tools installed"
}

# Install monitoring tools
install_monitoring_tools() {
    log "Installing monitoring tools..."
    apt-get install -y htop nethogs iotop
    success "Monitoring tools installed"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    apt-get install -y ufw
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 5000/tcp
    ufw --force enable
    success "Firewall configured"
}

# Create application directories
create_directories() {
    log "Creating application directories..."
    mkdir -p /var/www/nexxus-pro/{current,releases,source,storage,logs,backups}
    mkdir -p /var/log/nexxus-pro
    mkdir -p /var/backups/nexxus-pro
    chown -R $SUDO_USER:$SUDO_USER /var/www/nexxus-pro
    chown -R $SUDO_USER:$SUDO_USER /var/log/nexxus-pro
    success "Directories created"
}

# Setup swap file
setup_swap() {
    log "Setting up swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    success "Swap file created"
}

# Optimize system
optimize_system() {
    log "Optimizing system..."
    
    # Increase file limits
    cat >> /etc/security/limits.conf << EOF
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
EOF
    
    # Optimize kernel parameters
    cat >> /etc/sysctl.conf << EOF
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
EOF
    
    sysctl -p
    success "System optimized"
}

# Setup backup cron
setup_backup_cron() {
    log "Setting up backup cron job..."
    (crontab -l 2>/dev/null; echo "0 2 * * * /var/www/nexxus-pro/scripts/backup.sh >> /var/log/nexxus-pro/backup.log 2>&1") | crontab -
    success "Backup cron configured"
}

# Print summary
print_summary() {
    echo ""
    echo "=========================================="
    echo "    Setup Complete!"
    echo "=========================================="
    echo ""
    echo "Installed services:"
    echo "  - Node.js: $(node --version)"
    echo "  - npm: $(npm --version)"
    echo "  - PostgreSQL: 15"
    echo "  - Redis: $(redis-server --version | head -1)"
    echo "  - Nginx: $(nginx -v 2>&1)"
    echo "  - PM2: $(pm2 --version)"
    echo ""
    echo "Directories:"
    echo "  - Application: /var/www/nexxus-pro"
    echo "  - Logs: /var/log/nexxus-pro"
    echo "  - Backups: /var/backups/nexxus-pro"
    echo ""
    echo "Database credentials:"
    echo "  - Database: nexxus_pro"
    echo "  - User: nexxus"
    echo "  - Password: nexxus123"
    echo ""
    echo "Next steps:"
    echo "  1. Run ./deploy.sh to deploy the application"
    echo "  2. Configure SSL certificates"
    echo "  3. Set up environment variables"
    echo "  4. Configure payment gateways"
    echo "  5. Set up monitoring"
    echo ""
}

# Main function
main() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Server Setup"
    echo "=========================================="
    echo ""
    
    check_root
    update_system
    install_nodejs
    install_postgresql
    install_redis
    install_nginx
    install_pm2
    install_git
    install_build_tools
    install_monitoring_tools
    configure_firewall
    create_directories
    setup_swap
    optimize_system
    setup_backup_cron
    print_summary
}

# Run main function
main