# Nexxus-Pro - Enterprise File Management Platform

## Overview

Nexxus-Pro is a comprehensive file management and merging platform with M-Pesa, PayPal, and bank transfer integration.

## Features

- 📁 File Management (Upload, Download, Share, Delete)
- 🔄 File Merging (PDF, Images, Documents)
- 💳 Payment Integration (M-Pesa, PayPal, Bank Transfer)
- 📊 Subscription Plans (Free, Basic, Pro, Enterprise)
- 🔒 Secure Authentication (JWT, 2FA)
- 📱 Responsive Design
- 🌙 Dark/Light Theme
- 🔔 Real-time Notifications
- 📈 Analytics Dashboard

## Tech Stack

- **Frontend**: React 18, Tailwind CSS, Socket.io
- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Payments**: M-Pesa, PayPal, Bank Transfer
- **Storage**: Local / AWS S3
- **Deployment**: Docker, Nginx, PM2

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Setup

```bash
# Clone repository
git clone https://github.com/yourusername/nexxus-pro.git
cd nexxus-pro

# Install dependencies
npm run setup

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run database migrations
cd server && npm run migrate

# Seed database
npm run seed

# Start development servers
npm run dev