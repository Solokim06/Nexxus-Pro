-- Migration: Create audit_logs table
-- Version: 013

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('auth', 'file', 'folder', 'user', 'admin', 'payment', 'subscription', 'security', 'system')),
    target_type VARCHAR(30) CHECK (target_type IN ('user', 'file', 'folder', 'payment', 'subscription', 'api_key', 'system')),
    target_id UUID,
    target_name VARCHAR(255),
    changes JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    method VARCHAR(10),
    path TEXT,
    query JSONB,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    status_code INTEGER,
    error TEXT,
    error_stack TEXT,
    duration INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_ip ON audit_logs(ip);

-- Partition by month for audit logs (recommended for large datasets)
-- CREATE TABLE audit_logs_2024_01 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');