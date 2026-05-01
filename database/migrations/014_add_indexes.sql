-- Migration: Add additional performance indexes
-- Version: 014

-- Users table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc ON users(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users(last_login DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_email_verified ON users(is_email_verified);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_status ON users(subscription_plan, is_deleted);

-- Files table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_starred ON files(user_id, is_starred) WHERE is_starred = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_deleted ON files(user_id, is_deleted, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_mime_type_category ON files(mime_type, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_size ON files(size);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_download_count ON files(download_count DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_expires_at_active ON files(expires_at) WHERE expires_at IS NOT NULL AND is_deleted = false;

-- Folders table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_starred ON folders(user_id, is_starred) WHERE is_starred = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_deleted ON folders(user_id, is_deleted);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_parent_name ON folders(parent_id, name);

-- Subscriptions table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_plan_status ON subscriptions(plan_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_end_date_status ON subscriptions(end_date, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_auto_renew ON subscriptions(auto_renew, status) WHERE auto_renew = true;

-- Payments table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_method_status ON payments(method, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_plan_status ON payments(plan_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_completed_at_desc ON payments(completed_at DESC);

-- Merge jobs table additional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merge_jobs_status_priority ON merge_jobs(status, priority DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_merge_jobs_user_format ON merge_jobs(user_id, output_format);

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_user_folder_deleted ON files(user_id, folder_id, is_deleted);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_status_created ON payments(user_id, status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_action_created ON activity_logs(user_id, action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- Partial indexes for active records
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_active ON files(user_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invitations_pending ON invitations(email) WHERE status = 'pending';

-- GIN indexes for JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_preferences ON users USING GIN (preferences);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_metadata ON files USING GIN (metadata);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_details ON activity_logs USING GIN (details);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_changes ON audit_logs USING GIN (changes);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_metadata ON audit_logs USING GIN (metadata);

-- Text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_files_name_search ON files USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_name_search ON folders USING GIN (name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search ON users USING GIN (name gin_trgm_ops);

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE files;
ANALYZE folders;
ANALYZE subscriptions;
ANALYZE payments;
ANALYZE merge_jobs;
ANALYZE activity_logs;
ANALYZE audit_logs;
ANALYZE notifications;
ANALYZE sessions;
ANALYZE invitations;
ANALYZE api_keys;
ANALYZE transactions;