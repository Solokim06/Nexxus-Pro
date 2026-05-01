-- Migration: Create files table
-- Version: 002

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail TEXT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID,
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(255) UNIQUE,
    share_expires TIMESTAMP,
    shared_with JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    previous_versions JSONB DEFAULT '[]'::jsonb,
    
    -- Encryption
    is_encrypted BOOLEAN DEFAULT FALSE,
    encryption_key VARCHAR(255),
    
    -- Expiration
    expires_at TIMESTAMP,
    
    -- Checksum
    checksum VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_folder_id ON files(folder_id);
CREATE INDEX idx_files_user_folder ON files(user_id, folder_id);
CREATE INDEX idx_files_name_trgm ON files USING GIN (name gin_trgm_ops);
CREATE INDEX idx_files_mime_type ON files(mime_type);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
CREATE INDEX idx_files_share_token ON files(share_token);
CREATE INDEX idx_files_is_deleted ON files(is_deleted);
CREATE INDEX idx_files_expires_at ON files(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_files_user_starred ON files(user_id, is_starred) WHERE is_starred = true;

-- Create trigger
CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();