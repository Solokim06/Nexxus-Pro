
## **docs/DEPLOYMENT.md**
```markdown
# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Nginx (for reverse proxy)

## Environment Variables

```env
# Database
DB_NAME=nexxus_pro
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret

# API
API_URL=https://api.nexxus-pro.com
CLIENT_URL=https://nexxus-pro.com
PORT=5000
NODE_ENV=production

# Storage
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=nexxus-pro-storage

# M-Pesa
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379

# PayPal
PAYPAL_ENVIRONMENT=production
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@nexxus-pro.com
SMTP_PASS=your_password
SMTP_FROM=noreply@nexxus-pro.com