# Payment Setup Guide

## M-Pesa Integration (Kenya)

### Prerequisites
- Safaricom Developer Account
- Business PayBill/Till Number
- API Credentials

### Setup Steps

1. **Register as Developer**
   - Go to https://developer.safaricom.co.ke
   - Create account
   - Verify email

2. **Create App**
   - Navigate to "My Apps"
   - Click "Create App"
   - Select "M-Pesa" API
   - Get Consumer Key and Secret

3. **Configure Environment**
```env
MPESA_ENVIRONMENT=production
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=174379