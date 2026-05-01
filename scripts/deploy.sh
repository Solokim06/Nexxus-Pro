#!/bin/bash

# ============================================
# Nexxus-Pro Deployment Script
# ============================================
# Usage: ./deploy.sh [environment] [version]
# Example: ./deploy.sh production v2.0.0
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENVIRONMENT=${1:-production}
VERSION=${2:-$(date +%Y%m%d_%H%M%S)}
DEPLOY_DIR="/var/www/nexxus-pro"
BACKUP_DIR="/var/backups/nexxus-pro"
LOG_FILE="/var/log/nexxus-pro/deploy.log"

# Logging function
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

# Create necessary directories
create_directories() {
    log "Creating deployment directories..."
    mkdir -p "$DEPLOY_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    success "Directories created"
}

# Backup current deployment
backup_current() {
    if [ -d "$DEPLOY_DIR/current" ]; then
        log "Backing up current deployment..."
        BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
        tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$DEPLOY_DIR" current 2>/dev/null || true
        success "Backup created: $BACKUP_NAME"
    fi
}

# Pull latest code
pull_code() {
    log "Pulling latest code from repository..."
    if [ ! -d "$DEPLOY_DIR/source" ]; then
        git clone https://github.com/yourusername/nexxus-pro.git "$DEPLOY_DIR/source"
    else
        cd "$DEPLOY_DIR/source"
        git fetch --all
        git reset --hard origin/main
    fi
    success "Code pulled successfully"
}

# Install backend dependencies
install_backend() {
    log "Installing backend dependencies..."
    cd "$DEPLOY_DIR/source/server"
    npm ci --only=production
    success "Backend dependencies installed"
}

# Install frontend dependencies and build
build_frontend() {
    log "Building frontend..."
    cd "$DEPLOY_DIR/source/client"
    npm ci
    npm run build
    success "Frontend built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    cd "$DEPLOY_DIR/source/server"
    NODE_ENV="$ENVIRONMENT" npm run migrate
    success "Migrations completed"
}

# Seed database if needed
seed_database() {
    if [ "$ENVIRONMENT" = "development" ]; then
        log "Seeding database..."
        cd "$DEPLOY_DIR/source/server"
        NODE_ENV="$ENVIRONMENT" npm run seed
        success "Database seeded"
    fi
}

# Configure environment
configure_environment() {
    log "Configuring $ENVIRONMENT environment..."
    
    if [ ! -f "$DEPLOY_DIR/source/server/.env" ]; then
        cp "$DEPLOY_DIR/source/server/.env.example" "$DEPLOY_DIR/source/server/.env"
        warning "Please update $DEPLOY_DIR/source/server/.env with your values"
    fi
    
    if [ ! -f "$DEPLOY_DIR/source/client/.env" ]; then
        cp "$DEPLOY_DIR/source/client/.env.example" "$DEPLOY_DIR/source/client/.env"
        warning "Please update $DEPLOY_DIR/source/client/.env with your values"
    fi
    
    # Set environment specific values
    sed -i "s/NODE_ENV=.*/NODE_ENV=$ENVIRONMENT/" "$DEPLOY_DIR/source/server/.env"
    success "Environment configured"
}

# Create symlink to current release
create_symlink() {
    log "Creating symlink for release $VERSION..."
    RELEASE_DIR="$DEPLOY_DIR/releases/$VERSION"
    
    # Copy source to release directory
    cp -r "$DEPLOY_DIR/source" "$RELEASE_DIR"
    
    # Update current symlink
    ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR/current"
    success "Symlink created for release $VERSION"
}

# Setup PM2
setup_pm2() {
    log "Setting up PM2..."
    cd "$DEPLOY_DIR/current/server"
    
    # Create ecosystem file if not exists
    if [ ! -f "ecosystem.config.js" ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nexxus-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: '$ENVIRONMENT',
      PORT: 5000
    },
    error_file: '/var/log/nexxus-pro/error.log',
    out_file: '/var/log/nexxus-pro/out.log',
    log_file: '/var/log/nexxus-pro/combined.log',
    time: true
  }]
};
EOF
    fi
    
    pm2 reload ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save
    success "PM2 configured"
}

# Setup Nginx
setup_nginx() {
    log "Setting up Nginx configuration..."
    
    cat > /etc/nginx/sites-available/nexxus-pro << EOF
server {
    listen 80;
    server_name nexxus-pro.com www.nexxus-pro.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nexxus-pro.com www.nexxus-pro.com;

    ssl_certificate /etc/letsencrypt/live/nexxus-pro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexxus-pro.com/privkey.pem;

    root $DEPLOY_DIR/current/client/build;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 500M;
    }

    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location /storage {
        alias $DEPLOY_DIR/current/storage;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/nexxus-pro /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    success "Nginx configured"
}

# Setup SSL certificates
setup_ssl() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "Setting up SSL certificates..."
        if ! command -v certbot &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
        certbot --nginx -d nexxus-pro.com -d www.nexxus-pro.com --non-interactive --agree-tos --email admin@nexxus-pro.com || warning "SSL setup failed"
        success "SSL configured"
    fi
}

# Setup log rotation
setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/nexxus-pro << EOF
/var/log/nexxus-pro/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    success "Log rotation configured"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Copy monitoring scripts
    cp scripts/monitor.sh /usr/local/bin/nexxus-monitor
    cp scripts/healthcheck.sh /usr/local/bin/nexxus-healthcheck
    chmod +x /usr/local/bin/nexxus-monitor
    chmod +x /usr/local/bin/nexxus-healthcheck
    
    # Add cron job for monitoring
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/nexxus-monitor >> /var/log/nexxus-pro/monitor.log 2>&1") | crontab -
    
    success "Monitoring configured"
}

# Cleanup old releases
cleanup_releases() {
    log "Cleaning up old releases..."
    cd "$DEPLOY_DIR/releases"
    ls -t | tail -n +6 | xargs rm -rf 2>/dev/null || true
    success "Old releases cleaned up"
}

# Health check
health_check() {
    log "Running health check..."
    sleep 10
    
    if curl -s http://localhost:5000/health | grep -q "ok"; then
        success "Health check passed"
    else
        error "Health check failed"
    fi
    
    if curl -s https://nexxus-pro.com | grep -q "Nexxus-Pro"; then
        success "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
}

# Main deployment function
main() {
    echo ""
    echo "=========================================="
    echo "    Nexxus-Pro Deployment Script"
    echo "=========================================="
    echo ""
    echo "Environment: $ENVIRONMENT"
    echo "Version: $VERSION"
    echo ""
    
    create_directories
    backup_current
    pull_code
    configure_environment
    install_backend
    build_frontend
    run_migrations
    seed_database
    create_symlink
    setup_pm2
    setup_nginx
    setup_ssl
    setup_logrotate
    setup_monitoring
    cleanup_releases
    health_check
    
    echo ""
    success "Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Update DNS records if needed"
    echo "2. Configure payment gateways"
    echo "3. Set up email service"
    echo "4. Configure backup schedule"
    echo ""
}

# Run main function
main