-- Migration: Create users table
-- Version: 001
-- Description: Create users table with all necessary columns

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE,
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_reason TEXT,
    last_login TIMESTAMP,
    login_attempts INTEGER DEFAULT 0,
    lock_until TIMESTAMP,
    
    -- Subscription fields
    subscription_id UUID,
    subscription_plan VARCHAR(20) DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    
    -- Profile fields
    company VARCHAR(100),
    website VARCHAR(255),
    bio TEXT,
    timezone VARCHAR(50) DEFAULT 'Africa/Nairobi',
    language VARCHAR(10) DEFAULT 'en',
    
    -- Preferences (JSON)
    preferences JSONB DEFAULT '{
        "theme": "system",
        "notifications": {
            "email": {"uploads": true, "merges": true, "shares": true, "payments": true, "subscription": true, "marketing": false},
            "push": {"uploads": true, "merges": true, "shares": true, "payments": true, "subscription": true},
            "desktop": {"uploads": false, "merges": true, "shares": true, "payments": true, "subscription": true}
        },
        "privacy": {"profileVisibility": "public", "showEmail": false, "showPhone": false}
    }'::jsonb,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    email_verification_token VARCHAR(255),
    email_verification_expires TIMESTAMP,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    
    -- Saved payment methods (JSON)
    saved_payment_methods JSONB DEFAULT '[]'::jsonb,
    
    -- API Keys (JSON)
    api_keys JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_subscription_plan ON users(subscription_plan);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_is_deleted ON users(is_deleted);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_reset_password_token ON users(reset_password_token);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();