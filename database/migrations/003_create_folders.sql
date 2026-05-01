-- Migration: Create folders table
-- Version: 003

CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(10) DEFAULT '📁',
    is_starred BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(255) UNIQUE,
    share_expires TIMESTAMP,
    shared_with JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    description TEXT,
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    path TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_user_parent ON folders(user_id, parent_id);
CREATE INDEX idx_folders_name ON folders(user_id, name);
CREATE INDEX idx_folders_share_token ON folders(share_token);
CREATE INDEX idx_folders_is_deleted ON folders(is_deleted);
CREATE INDEX idx_folders_path ON folders(path);

-- Create trigger
CREATE TRIGGER update_folders_updated_at
    BEFORE UPDATE ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to update folder path
CREATE OR REPLACE FUNCTION update_folder_path()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path = '/' || NEW.id;
    ELSE
        SELECT path INTO NEW.path FROM folders WHERE id = NEW.parent_id;
        NEW.path = NEW.path || '/' || NEW.id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_folder_path_trigger
    BEFORE INSERT OR UPDATE OF parent_id ON folders
    FOR EACH ROW
    EXECUTE FUNCTION update_folder_path();