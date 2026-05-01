-- Seed: User Roles and Permissions
-- Description: Define user roles and their permissions

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert roles
INSERT INTO roles (name, description, permissions) VALUES
(
    'user',
    'Standard user with basic permissions',
    '[
        "file:upload",
        "file:download",
        "file:delete_own",
        "file:rename_own",
        "file:move_own",
        "folder:create",
        "folder:delete_own",
        "folder:rename_own",
        "merge:create",
        "payment:view_own",
        "subscription:view_own",
        "profile:edit",
        "notification:view",
        "notification:mark_read"
    ]'::jsonb
),
(
    'moderator',
    'Moderator with additional management permissions',
    '[
        "file:upload",
        "file:download",
        "file:delete_any",
        "file:rename_any",
        "file:move_any",
        "folder:create",
        "folder:delete_any",
        "folder:rename_any",
        "merge:create",
        "merge:cancel_any",
        "payment:view_all",
        "subscription:view_all",
        "user:view",
        "user:block",
        "report:view",
        "notification:send"
    ]'::jsonb
),
(
    'admin',
    'Full system administrator access',
    '[
        "*:*"
    ]'::jsonb
)
ON CONFLICT (name) DO UPDATE SET
    permissions = EXCLUDED.permissions,
    updated_at = CURRENT_TIMESTAMP;

-- Verify roles were inserted
DO $$
DECLARE
    role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO role_count FROM roles;
    RAISE NOTICE '✓ Inserted % roles', role_count;
END $$;

-- Update existing users with roles if not set
UPDATE users SET role = 'admin' WHERE email = 'admin@nexxus-pro.com' AND role IS NULL;
UPDATE users SET role = 'user' WHERE role IS NULL AND email != 'admin@nexxus-pro.com';

RAISE NOTICE '✓ User roles synchronized';