-- ============================================
-- Cleanup Queries
-- Description: Maintenance and cleanup operations
-- ============================================

-- ============================================
-- SOFT DELETE CLEANUP
-- ============================================

-- 1. Permanently delete files older than 30 days in trash
DELETE FROM files
WHERE is_deleted = true 
    AND deleted_at < CURRENT_DATE - INTERVAL '30 days'
RETURNING id, name, user_id;

-- 2. Permanently delete folders older than 30 days in trash
DELETE FROM folders
WHERE is_deleted = true 
    AND deleted_at < CURRENT_DATE - INTERVAL '30 days'
RETURNING id, name, user_id;

-- 3. Delete unverified users older than 7 days
DELETE FROM users
WHERE is_email_verified = false 
    AND created_at < CURRENT_DATE - INTERVAL '7 days'
RETURNING id, email, created_at;

-- ============================================
-- EXPIRED DATA CLEANUP
-- ============================================

-- 4. Delete expired sessions
DELETE FROM sessions
WHERE expires_at < CURRENT_TIMESTAMP
RETURNING id, user_id;

-- 5. Delete expired invitations
DELETE FROM invitations
WHERE expires_at < CURRENT_TIMESTAMP 
    AND status = 'pending'
RETURNING id, email, invited_by;

-- 6. Delete expired notifications
DELETE FROM notifications
WHERE expires_at < CURRENT_TIMESTAMP
RETURNING id, user_id, title;

-- 7. Remove expired file shares
UPDATE files
SET is_public = false,
    share_token = NULL,
    share_expires = NULL
WHERE share_expires < CURRENT_TIMESTAMP 
    AND is_public = true
RETURNING id, name;

-- 8. Delete expired subscriptions (set to expired status)
UPDATE subscriptions
SET status = 'expired'
WHERE end_date < CURRENT_TIMESTAMP 
    AND status = 'active'
RETURNING id, user_id, plan_id;

-- ============================================
-- LOG CLEANUP
-- ============================================

-- 9. Delete old activity logs (older than 90 days)
DELETE FROM activity_logs
WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
RETURNING id, user_id, action;

-- 10. Delete old audit logs (older than 1 year)
DELETE FROM audit_logs
WHERE created_at < CURRENT_DATE - INTERVAL '365 days'
RETURNING id, user_id, action;

-- 11. Archive old activity logs (move to archive table)
-- First create archive table if not exists
CREATE TABLE IF NOT EXISTS activity_logs_archive (LIKE activity_logs INCLUDING ALL);

-- Then move old logs
WITH moved AS (
    DELETE FROM activity_logs
    WHERE created_at < CURRENT_DATE - INTERVAL '90 days'
    RETURNING *
)
INSERT INTO activity_logs_archive SELECT * FROM moved;

-- 12. Delete old merge jobs (older than 30 days)
DELETE FROM merge_jobs
WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < CURRENT_DATE - INTERVAL '30 days'
RETURNING id, user_id, status;

-- ============================================
-- ORPHANED DATA CLEANUP
-- ============================================

-- 13. Delete orphaned files (files with no user)
DELETE FROM files
WHERE user_id NOT IN (SELECT id FROM users)
RETURNING id, name;

-- 14. Delete orphaned folders (folders with no user)
DELETE FROM folders
WHERE user_id NOT IN (SELECT id FROM users)
RETURNING id, name;

-- 15. Delete orphaned payments (payments with no user)
DELETE FROM payments
WHERE user_id NOT IN (SELECT id FROM users)
RETURNING id;

-- 16. Delete orphaned subscriptions (subscriptions with no user)
DELETE FROM subscriptions
WHERE user_id NOT IN (SELECT id FROM users)
RETURNING id, user_id;

-- 17. Delete orphaned merge jobs (merge jobs with no user)
DELETE FROM merge_jobs
WHERE user_id NOT IN (SELECT id FROM users)
RETURNING id, user_id;

-- ============================================
-- DUPLICATE DATA CLEANUP
-- ============================================

-- 18. Remove duplicate API keys (keep the most recent)
DELETE FROM api_keys a
USING api_keys b
WHERE a.id > b.id 
    AND a.user_id = b.user_id 
    AND a.key = b.key;

-- 19. Remove duplicate sessions (keep the most recent)
DELETE FROM sessions a
USING sessions b
WHERE a.id > b.id 
    AND a.user_id = b.user_id 
    AND a.token = b.token;

-- ============================================
-- DATABASE MAINTENANCE
-- ============================================

-- 20. Vacuum analyze for performance
VACUUM ANALYZE users;
VACUUM ANALYZE files;
VACUUM ANALYZE folders;
VACUUM ANALYZE payments;
VACUUM ANALYZE subscriptions;
VACUUM ANALYZE merge_jobs;
VACUUM ANALYZE activity_logs;
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE notifications;
VACUUM ANALYZE sessions;
VACUUM ANALYZE invitations;
VACUUM ANALYZE api_keys;
VACUUM ANALYZE transactions;

-- 21. Reindex tables for better performance
REINDEX TABLE users;
REINDEX TABLE files;
REINDEX TABLE folders;
REINDEX TABLE payments;
REINDEX TABLE subscriptions;
REINDEX TABLE merge_jobs;
REINDEX TABLE activity_logs;
REINDEX TABLE audit_logs;
REINDEX TABLE notifications;
REINDEX TABLE sessions;
REINDEX TABLE invitations;
REINDEX TABLE api_keys;
REINDEX TABLE transactions;

-- 22. Update table statistics
ANALYZE users;
ANALYZE files;
ANALYZE folders;
ANALYZE payments;
ANALYZE subscriptions;
ANALYZE merge_jobs;
ANALYZE activity_logs;
ANALYZE audit_logs;

-- ============================================
-- TEMPORARY DATA CLEANUP
-- ============================================

-- 23. Clean up incomplete payments (pending for > 7 days)
UPDATE payments
SET status = 'cancelled',
    error = 'Auto-cancelled due to timeout'
WHERE status = 'pending' 
    AND created_at < CURRENT_DATE - INTERVAL '7 days'
RETURNING id, user_id, amount;

-- 24. Clean up stuck merge jobs (processing for > 1 hour)
UPDATE merge_jobs
SET status = 'failed',
    error = 'Auto-failed due to timeout'
WHERE status = 'processing' 
    AND started_at < CURRENT_TIMESTAMP - INTERVAL '1 hour'
RETURNING id, user_id;

-- ============================================
-- STORAGE CLEANUP
-- ============================================

-- 25. Get storage cleanup candidates (largest files by user)
SELECT 
    user_id,
    COUNT(*) AS file_count,
    SUM(size) AS total_size_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0 / 1024.0, 2) AS total_size_gb,
    MAX(created_at) AS last_upload
FROM files
WHERE is_deleted = false
GROUP BY user_id
HAVING SUM(size) > 10737418240 -- Over 10GB
ORDER BY total_size_bytes DESC;

-- 26. Find inactive users with storage (no login in 90 days)
SELECT 
    u.id,
    u.name,
    u.email,
    u.last_login,
    COUNT(f.id) AS file_count,
    COALESCE(SUM(f.size), 0) AS storage_bytes,
    ROUND(COALESCE(SUM(f.size), 0) / 1024.0 / 1024.0 / 1024.0, 2) AS storage_gb
FROM users u
LEFT JOIN files f ON u.id = f.user_id AND f.is_deleted = false
WHERE u.last_login < CURRENT_DATE - INTERVAL '90 days'
    AND u.subscription_plan = 'free'
GROUP BY u.id, u.name, u.email, u.last_login
HAVING SUM(f.size) > 0
ORDER BY storage_bytes DESC;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- 27. Function to perform complete cleanup
CREATE OR REPLACE FUNCTION perform_full_cleanup()
RETURNS TEXT AS $$
DECLARE
    deleted_files INT;
    deleted_folders INT;
    deleted_users INT;
    deleted_sessions INT;
    deleted_invitations INT;
    deleted_notifications INT;
    expired_shares INT;
BEGIN
    -- Delete old trash files
    WITH deleted AS (
        DELETE FROM files
        WHERE is_deleted = true AND deleted_at < CURRENT_DATE - INTERVAL '30 days'
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_files FROM deleted;
    
    -- Delete old trash folders
    WITH deleted AS (
        DELETE FROM folders
        WHERE is_deleted = true AND deleted_at < CURRENT_DATE - INTERVAL '30 days'
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_folders FROM deleted;
    
    -- Delete unverified users
    WITH deleted AS (
        DELETE FROM users
        WHERE is_email_verified = false AND created_at < CURRENT_DATE - INTERVAL '7 days'
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_users FROM deleted;
    
    -- Delete expired sessions
    WITH deleted AS (
        DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_sessions FROM deleted;
    
    -- Delete expired invitations
    WITH deleted AS (
        DELETE FROM invitations WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending'
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_invitations FROM deleted;
    
    -- Delete expired notifications
    WITH deleted AS (
        DELETE FROM notifications WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING id
    ) SELECT COUNT(*) INTO deleted_notifications FROM deleted;
    
    -- Remove expired shares
    WITH updated AS (
        UPDATE files
        SET is_public = false, share_token = NULL, share_expires = NULL
        WHERE share_expires < CURRENT_TIMESTAMP AND is_public = true
        RETURNING id
    ) SELECT COUNT(*) INTO expired_shares FROM updated;
    
    RETURN format('Cleanup completed: files=%s, folders=%s, users=%s, sessions=%s, invitations=%s, notifications=%s, shares=%s',
        deleted_files, deleted_folders, deleted_users, deleted_sessions, 
        deleted_invitations, deleted_notifications, expired_shares);
END;
$$ LANGUAGE plpgsql;

-- 28. Function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_cleanup_stats()
RETURNS TABLE (
    item_type TEXT,
    count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Files in trash older than 30 days
    RETURN QUERY
    SELECT 'files_in_trash'::TEXT, COUNT(*)::BIGINT, 
           'Files in trash older than 30 days: ' || COUNT(*)::TEXT
    FROM files WHERE is_deleted = true AND deleted_at < CURRENT_DATE - INTERVAL '30 days';
    
    -- Unverified users older than 7 days
    RETURN QUERY
    SELECT 'unverified_users'::TEXT, COUNT(*)::BIGINT,
           'Unverified users older than 7 days: ' || COUNT(*)::TEXT
    FROM users WHERE is_email_verified = false AND created_at < CURRENT_DATE - INTERVAL '7 days';
    
    -- Expired sessions
    RETURN QUERY
    SELECT 'expired_sessions'::TEXT, COUNT(*)::BIGINT,
           'Expired sessions: ' || COUNT(*)::TEXT
    FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Pending invitations expired
    RETURN QUERY
    SELECT 'expired_invitations'::TEXT, COUNT(*)::BIGINT,
           'Expired invitations: ' || COUNT(*)::TEXT
    FROM invitations WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending';
    
    -- Old activity logs (90+ days)
    RETURN QUERY
    SELECT 'old_activity_logs'::TEXT, COUNT(*)::BIGINT,
           'Activity logs older than 90 days: ' || COUNT(*)::TEXT
    FROM activity_logs WHERE created_at < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

