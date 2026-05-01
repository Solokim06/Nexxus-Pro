-- Migration: Create subscriptions table
-- Version: 005

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(20) NOT NULL CHECK (plan_id IN ('free', 'basic', 'pro', 'enterprise')),
    plan_name VARCHAR(50),
    status VARCHAR(20) DEFAULT 'trialing' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete')),
    
    -- Dates
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    trial_ends_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    expired_at TIMESTAMP,
    
    -- Billing
    billing_cycle VARCHAR(10) DEFAULT 'month' CHECK (billing_cycle IN ('month', 'year')),
    amount DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    auto_renew BOOLEAN DEFAULT TRUE,
    
    -- Features and limits (JSON)
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    
    -- Usage tracking
    usage JSONB DEFAULT '{
        "storage_used": 0,
        "merges_used": 0,
        "api_calls_used": 0,
        "last_reset_at": null
    }'::jsonb,
    
    -- Payment provider
    provider VARCHAR(20) CHECK (provider IN ('mpesa', 'paypal', 'bank_transfer', 'none')),
    provider_subscription_id VARCHAR(255),
    provider_customer_id VARCHAR(255),
    
    -- Cancellation
    cancel_reason TEXT,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Invoices
    invoices JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
CREATE INDEX idx_subscriptions_status_end_date ON subscriptions(status, end_date);
CREATE INDEX idx_subscriptions_provider_id ON subscriptions(provider_subscription_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);

-- Create trigger
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();