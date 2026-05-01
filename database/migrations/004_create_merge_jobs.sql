-- Migration: Create merge_jobs table
-- Version: 004

CREATE TABLE IF NOT EXISTS merge_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    type VARCHAR(10) DEFAULT 'files' CHECK (type IN ('files', 'folders')),
    
    -- Input
    input_files JSONB DEFAULT '[]'::jsonb,
    input_folders JSONB DEFAULT '[]'::jsonb,
    
    -- Output
    output_format VARCHAR(10) NOT NULL CHECK (output_format IN ('pdf', 'zip', 'image', 'txt')),
    output_url TEXT,
    output_path TEXT,
    output_size BIGINT,
    output_name VARCHAR(255),
    
    -- Options
    options JSONB DEFAULT '{}'::jsonb,
    
    -- Progress
    progress INTEGER DEFAULT 0,
    current_operation TEXT,
    
    -- Timing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Error handling
    error TEXT,
    error_details JSONB,
    
    -- Priority
    priority INTEGER DEFAULT 0,
    queue_position INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_merge_jobs_user_id ON merge_jobs(user_id);
CREATE INDEX idx_merge_jobs_status ON merge_jobs(status);
CREATE INDEX idx_merge_jobs_user_status ON merge_jobs(user_id, status);
CREATE INDEX idx_merge_jobs_created_at ON merge_jobs(created_at DESC);
CREATE INDEX idx_merge_jobs_status_priority ON merge_jobs(status, priority DESC, created_at);

-- Create trigger
CREATE TRIGGER update_merge_jobs_updated_at
    BEFORE UPDATE ON merge_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();