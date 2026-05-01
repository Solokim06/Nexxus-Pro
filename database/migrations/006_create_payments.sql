-- Migration: Create payments table
-- Version: 006

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL CHECK (method IN ('mpesa', 'paypal', 'bank_transfer', 'card', 'upgrade')),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    plan_id VARCHAR(20) CHECK (plan_id IN ('basic', 'pro', 'enterprise')),
    billing_cycle VARCHAR(10) CHECK (billing_cycle IN ('month', 'year')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    
    -- Transaction IDs
    transaction_id VARCHAR(255) UNIQUE,
    provider_transaction_id VARCHAR(255),
    order_id VARCHAR(255),
    checkout_request_id VARCHAR(255),
    
    -- Receipt
    receipt_url TEXT,
    receipt_number VARCHAR(100),
    
    -- Timestamps
    completed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    -- Refund information
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    refund_requested BOOLEAN DEFAULT FALSE,
    refund_requested_at TIMESTAMP,
    refund_approved_by UUID REFERENCES users(id),
    
    -- Provider data
    provider_data JSONB,
    
    -- Customer information
    customer_details JSONB,
    
    -- Metadata
    metadata JSONB,
    webhook_data JSONB,
    
    -- Error information
    error TEXT,
    error_code VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_user_created ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_checkout_request_id ON payments(checkout_request_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_method ON payments(method);
CREATE INDEX idx_payments_completed_at ON payments(completed_at DESC);

-- Create trigger
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();