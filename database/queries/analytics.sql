-- ============================================
-- Analytics Queries
-- Description: Analytical queries for dashboard and reporting
-- ============================================

-- ============================================
-- USER ANALYTICS
-- ============================================

-- 1. User Growth Over Time
-- Returns daily new user registrations
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS new_users,
    COUNT(CASE WHEN is_email_verified THEN 1 END) AS verified_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admin_users,
    COUNT(CASE WHEN subscription_plan != 'free' THEN 1 END) AS paid_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 2. Active Users (Last 30 days)
SELECT 
    DATE(last_login) AS date,
    COUNT(DISTINCT user_id) AS active_users
FROM users
WHERE last_login >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(last_login)
ORDER BY date DESC;

-- 3. User Retention Rate
WITH user_cohorts AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS cohort_month,
        user_id,
        created_at
    FROM users
),
cohort_size AS (
    SELECT 
        cohort_month,
        COUNT(*) AS total_users
    FROM user_cohorts
    GROUP BY cohort_month
),
user_activity AS (
    SELECT 
        DATE_TRUNC('month', uc.cohort_month) AS cohort_month,
        DATE_TRUNC('month', ul.last_login) AS activity_month,
        COUNT(DISTINCT uc.user_id) AS active_users
    FROM user_cohorts uc
    JOIN users ul ON uc.user_id = ul.id
    WHERE ul.last_login IS NOT NULL
    GROUP BY cohort_month, activity_month
)
SELECT 
    cs.cohort_month,
    cs.total_users,
    ua.activity_month,
    ua.active_users,
    ROUND(100.0 * ua.active_users / cs.total_users, 2) AS retention_rate
FROM cohort_size cs
LEFT JOIN user_activity ua ON cs.cohort_month = ua.cohort_month
ORDER BY cs.cohort_month DESC, ua.activity_month;

-- 4. User Distribution by Plan
SELECT 
    subscription_plan,
    COUNT(*) AS user_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM users
GROUP BY subscription_plan
ORDER BY user_count DESC;

-- 5. User Churn Rate (Monthly)
WITH monthly_users AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(DISTINCT id) AS new_users
    FROM users
    GROUP BY DATE_TRUNC('month', created_at)
),
churned_users AS (
    SELECT 
        DATE_TRUNC('month', u.created_at) AS month,
        COUNT(DISTINCT u.id) AS churned
    FROM users u
    LEFT JOIN users u2 ON u.id = u2.id AND u2.last_login > u.created_at + INTERVAL '30 days'
    WHERE u2.id IS NULL AND u.created_at >= CURRENT_DATE - INTERVAL '6 months'
    GROUP BY DATE_TRUNC('month', u.created_at)
)
SELECT 
    m.month,
    m.new_users,
    COALESCE(c.churned, 0) AS churned_users,
    ROUND(100.0 * COALESCE(c.churned, 0) / NULLIF(m.new_users, 0), 2) AS churn_rate
FROM monthly_users m
LEFT JOIN churned_users c ON m.month = c.month
ORDER BY m.month DESC;

-- ============================================
-- FILE ANALYTICS
-- ============================================

-- 6. File Uploads Over Time
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_uploads,
    SUM(size) AS total_size_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0 / 1024.0, 2) AS total_size_gb,
    COUNT(DISTINCT user_id) AS unique_users
FROM files
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 7. File Types Distribution
SELECT 
    CASE 
        WHEN mime_type LIKE 'image/%' THEN 'Image'
        WHEN mime_type LIKE 'video/%' THEN 'Video'
        WHEN mime_type LIKE 'audio/%' THEN 'Audio'
        WHEN mime_type = 'application/pdf' THEN 'PDF'
        WHEN mime_type LIKE '%word%' OR mime_type LIKE '%document%' THEN 'Document'
        WHEN mime_type LIKE '%sheet%' OR mime_type LIKE '%excel%' THEN 'Spreadsheet'
        WHEN mime_type LIKE '%presentation%' OR mime_type LIKE '%powerpoint%' THEN 'Presentation'
        WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%rar%' THEN 'Archive'
        ELSE 'Other'
    END AS file_category,
    COUNT(*) AS file_count,
    SUM(size) AS total_size_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0 / 1024.0, 2) AS total_size_gb,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM files
WHERE is_deleted = false
GROUP BY file_category
ORDER BY file_count DESC;

-- 8. Top Users by Storage Usage
SELECT 
    u.id,
    u.name,
    u.email,
    u.subscription_plan,
    COUNT(f.id) AS file_count,
    SUM(f.size) AS total_storage_bytes,
    ROUND(SUM(f.size) / 1024.0 / 1024.0 / 1024.0, 2) AS total_storage_gb,
    ROUND(100.0 * SUM(f.size) / SUM(SUM(f.size)) OVER(), 2) AS percentage
FROM users u
LEFT JOIN files f ON u.id = f.user_id AND f.is_deleted = false
GROUP BY u.id, u.name, u.email, u.subscription_plan
ORDER BY total_storage_bytes DESC
LIMIT 20;

-- 9. Storage Growth Trend
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS new_files,
    SUM(size) AS new_storage_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0 / 1024.0, 2) AS new_storage_gb,
    SUM(SUM(size)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS cumulative_storage_bytes,
    ROUND(SUM(SUM(size)) OVER (ORDER BY DATE_TRUNC('month', created_at)) / 1024.0 / 1024.0 / 1024.0, 2) AS cumulative_storage_gb
FROM files
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 10. File Sharing Statistics
SELECT 
    COUNT(*) AS total_shares,
    COUNT(DISTINCT file_id) AS unique_files_shared,
    COUNT(DISTINCT user_id) AS users_sharing,
    AVG(JSONB_ARRAY_LENGTH(shared_with)) AS avg_recipients,
    COUNT(CASE WHEN share_expires < CURRENT_TIMESTAMP THEN 1 END) AS expired_shares
FROM files
WHERE is_public = true OR shared_with != '[]'::jsonb;

-- ============================================
-- PAYMENT ANALYTICS
-- ============================================

-- 11. Revenue Over Time
SELECT 
    DATE_TRUNC('month', completed_at) AS month,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_revenue,
    AVG(amount) AS avg_transaction_value,
    COUNT(DISTINCT user_id) AS unique_customers
FROM payments
WHERE status = 'completed'
    AND completed_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', completed_at)
ORDER BY month DESC;

-- 12. Revenue by Payment Method
SELECT 
    method,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_revenue,
    ROUND(100.0 * SUM(amount) / SUM(SUM(amount)) OVER(), 2) AS percentage
FROM payments
WHERE status = 'completed'
GROUP BY method
ORDER BY total_revenue DESC;

-- 13. Subscription Upgrade/Downgrade Analysis
SELECT 
    plan_id,
    COUNT(*) AS subscription_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
    AVG(EXTRACT(DAY FROM (end_date - start_date))) AS avg_duration_days,
    COUNT(CASE WHEN cancelled_at IS NOT NULL THEN 1 END) AS cancelled_count
FROM subscriptions
GROUP BY plan_id
ORDER BY subscription_count DESC;

-- 14. MRR (Monthly Recurring Revenue)
WITH monthly_subscriptions AS (
    SELECT 
        DATE_TRUNC('month', start_date) AS month,
        SUM(amount) AS mrr
    FROM subscriptions
    WHERE status = 'active'
        AND start_date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', start_date)
)
SELECT 
    month,
    mrr,
    LAG(mrr) OVER (ORDER BY month) AS previous_month_mrr,
    mrr - LAG(mrr) OVER (ORDER BY month) AS mrr_change,
    ROUND(100.0 * (mrr - LAG(mrr) OVER (ORDER BY month)) / NULLIF(LAG(mrr) OVER (ORDER BY month), 0), 2) AS mrr_growth_rate
FROM monthly_subscriptions
ORDER BY month DESC;

-- 15. Payment Failure Rate
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS total_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_payments,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful_payments,
    ROUND(100.0 * COUNT(CASE WHEN status = 'failed' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS failure_rate
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================
-- MERGE ANALYTICS
-- ============================================

-- 16. Merge Operations Statistics
SELECT 
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS total_merges,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) AS successful_merges,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed_merges,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds,
    output_format,
    COUNT(*) AS format_count
FROM merge_jobs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), output_format
ORDER BY date DESC;

-- 17. Merge Performance (Average duration by file count)
SELECT 
    JSONB_ARRAY_LENGTH(input_files) AS file_count,
    COUNT(*) AS merge_count,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) AS avg_duration_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) AS median_duration_seconds,
    AVG(output_size) AS avg_output_size_bytes
FROM merge_jobs
WHERE status = 'completed'
    AND started_at IS NOT NULL 
    AND completed_at IS NOT NULL
GROUP BY JSONB_ARRAY_LENGTH(input_files)
ORDER BY file_count;

-- ============================================
-- ACTIVITY ANALYTICS
-- ============================================

-- 18. User Activity by Hour
SELECT 
    EXTRACT(HOUR FROM created_at) AS hour,
    COUNT(*) AS activity_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM created_at)
ORDER BY hour;

-- 19. Most Common Actions
SELECT 
    action,
    COUNT(*) AS action_count,
    COUNT(DISTINCT user_id) AS unique_users,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS percentage
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY action
ORDER BY action_count DESC
LIMIT 20;

-- 20. User Session Duration
WITH user_sessions AS (
    SELECT 
        user_id,
        created_at AS session_start,
        LEAD(created_at) OVER (PARTITION BY user_id ORDER BY created_at) AS session_end,
        EXTRACT(EPOCH FROM (LEAD(created_at) OVER (PARTITION BY user_id ORDER BY created_at) - created_at)) AS session_duration
    FROM activity_logs
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
)
SELECT 
    user_id,
    COUNT(*) AS session_count,
    AVG(session_duration) AS avg_session_duration_seconds,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY session_duration) AS median_session_duration_seconds
FROM user_sessions
WHERE session_duration IS NOT NULL AND session_duration < 3600 -- Less than 1 hour
GROUP BY user_id
ORDER BY avg_session_duration_seconds DESC
LIMIT 20;