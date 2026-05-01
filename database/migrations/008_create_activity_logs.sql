-- Migration: Create activity_logs table
-- Version: 008

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) CHECK (resource_type IN ('file', 'folder', 'user', 'subscription', 'payment', 'merge', 'api')),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),
    details JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'failure', 'pending')),
    error TEXT,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_ip ON activity_logs(ip);

-- Partition by month (optional, for large datasets)
-- CREATE TABLE activity_logs_2024_01 PARTITION OF activity_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');