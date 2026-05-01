-- ============================================
-- Reports Queries
-- Description: Pre-defined reports for business intelligence
-- ============================================

-- ============================================
-- DAILY SUMMARY REPORT
-- ============================================

-- 1. Daily System Summary
CREATE OR REPLACE VIEW daily_system_summary AS
SELECT 
    CURRENT_DATE AS report_date,
    (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE) AS new_users,
    (SELECT COUNT(*) FROM users WHERE DATE(last_login) = CURRENT_DATE) AS active_users,
    (SELECT COUNT(*) FROM files WHERE DATE(created_at) = CURRENT_DATE) AS new_files,
    (SELECT COALESCE(SUM(size), 0) FROM files WHERE DATE(created_at) = CURRENT_DATE) AS new_storage_bytes,
    (SELECT COUNT(*) FROM payments WHERE DATE(completed_at) = CURRENT_DATE AND status = 'completed') AS payments_count,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE DATE(completed_at) = CURRENT_DATE AND status = 'completed') AS revenue,
    (SELECT COUNT(*) FROM merge_jobs WHERE DATE(created_at) = CURRENT_DATE) AS merge_requests,
    (SELECT COUNT(*) FROM merge_jobs WHERE DATE(completed_at) = CURRENT_DATE AND status = 'completed') AS merges_completed;

-- 2. Daily User Report
CREATE OR REPLACE VIEW daily_user_report AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS total_registrations,
    COUNT(CASE WHEN is_email_verified THEN 1 END) AS verified_registrations,
    COUNT(CASE WHEN subscription_plan != 'free' THEN 1 END) AS paid_signups,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admin_creations
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 3. Daily Storage Report
CREATE OR REPLACE VIEW daily_storage_report AS
SELECT 
    DATE(created_at) AS date,
    COUNT(*) AS files_uploaded,
    SUM(size) AS storage_added_bytes,
    ROUND(SUM(size) / 1024.0 / 1024.0 / 1024.0, 2) AS storage_added_gb,
    COUNT(DISTINCT user_id) AS active_uploaders,
    SUM(SUM(size)) OVER (ORDER BY DATE(created_at)) AS cumulative_storage_bytes,
    ROUND(SUM(SUM(size)) OVER (ORDER BY DATE(created_at)) / 1024.0 / 1024.0 / 1024.0, 2) AS cumulative_storage_gb
FROM files
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- WEEKLY SUMMARY REPORT
-- ============================================

-- 4. Weekly Performance Report
CREATE OR REPLACE VIEW weekly_performance_report AS
SELECT 
    DATE_TRUNC('week', created_at) AS week,
    COUNT(DISTINCT u.id) AS new_users,
    COUNT(DISTINCT CASE WHEN u.last_login >= DATE_TRUNC('week', CURRENT_DATE) THEN u.id END) AS weekly_active_users,
    COUNT(DISTINCT f.id) AS files_uploaded,
    COALESCE(SUM(f.size), 0) AS storage_added,
    COUNT(DISTINCT p.id) AS payments_received,
    COALESCE(SUM(p.amount), 0) AS revenue,
    COUNT(DISTINCT m.id) AS merges_performed
FROM users u
LEFT JOIN files f ON DATE_TRUNC('week', f.created_at) = DATE_TRUNC('week', u.created_at)
LEFT JOIN payments p ON DATE_TRUNC('week', p.completed_at) = DATE_TRUNC('week', u.created_at) AND p.status = 'completed'
LEFT JOIN merge_jobs m ON DATE_TRUNC('week', m.created_at) = DATE_TRUNC('week', u.created_at)
WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', u.created_at)
ORDER BY week DESC;

-- ============================================
-- MONTHLY SUMMARY REPORT
-- ============================================

-- 5. Monthly Business Report
CREATE OR REPLACE VIEW monthly_business_report AS
SELECT 
    DATE_TRUNC('month', created_at) AS month,
    -- User metrics
    COUNT(DISTINCT u.id) AS total_users,
    COUNT(DISTINCT CASE WHEN u.created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN u.id END) AS new_users,
    COUNT(DISTINCT CASE WHEN u.last_login >= DATE_TRUNC('month', CURRENT_DATE) THEN u.id END) AS monthly_active_users,
    
    -- Subscription metrics
    COUNT(DISTINCT CASE WHEN u.subscription_plan != 'free' THEN u.id END) AS paid_users,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN u.subscription_plan != 'free' THEN u.id END) / NULLIF(COUNT(DISTINCT u.id), 0), 2) AS paid_user_percentage,
    
    -- Storage metrics
    COUNT(DISTINCT f.id) AS files_uploaded,
    COALESCE(SUM(f.size), 0) AS storage_added_bytes,
    ROUND(COALESCE(SUM(f.size), 0) / 1024.0 / 1024.0 / 1024.0, 2) AS storage_added_gb,
    
    -- Revenue metrics
    COUNT(DISTINCT p.id) AS transactions,
    COALESCE(SUM(p.amount), 0) AS revenue,
    AVG(p.amount) AS avg_transaction_value,
    COUNT(DISTINCT p.user_id) AS paying_customers,
    
    -- MRR (Monthly Recurring Revenue)
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN s.amount ELSE 0 END), 0) AS mrr,
    
    -- Merge metrics
    COUNT(DISTINCT m.id) AS merges_performed,
    AVG(CASE WHEN m.status = 'completed' THEN EXTRACT(EPOCH FROM (m.completed_at - m.started_at)) END) AS avg_merge_duration_seconds,
    
    -- Churn
    COUNT(DISTINCT CASE WHEN u.subscription_plan = 'free' AND u.subscription_plan != COALESCE(LAG(u.subscription_plan) OVER (PARTITION BY u.id ORDER BY u.created_at), 'free') THEN u.id END) AS churned_users,
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN u.subscription_plan = 'free' AND u.subscription_plan != COALESCE(LAG(u.subscription_plan) OVER (PARTITION BY u.id ORDER BY u.created_at), 'free') THEN u.id END) / NULLIF(COUNT(DISTINCT u.id), 0), 2) AS churn_rate
FROM users u
LEFT JOIN files f ON DATE_TRUNC('month', f.created_at) = DATE_TRUNC('month', u.created_at)
LEFT JOIN payments p ON DATE_TRUNC('month', p.completed_at) = DATE_TRUNC('month', u.created_at) AND p.status = 'completed'
LEFT JOIN subscriptions s ON s.user_id = u.id AND s.status = 'active'
LEFT JOIN merge_jobs m ON DATE_TRUNC('month', m.created_at) = DATE_TRUNC('month', u.created_at)
WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', u.created_at)
ORDER BY month DESC;

-- ============================================
-- FINANCIAL REPORTS
-- ============================================

-- 6. Revenue by Subscription Plan
CREATE OR REPLACE VIEW revenue_by_plan AS
SELECT 
    s.plan_id,
    COUNT(DISTINCT s.user_id) AS subscriber_count,
    COUNT(p.id) AS payment_count,
    SUM(p.amount) AS total_revenue,
    AVG(p.amount) AS avg_payment,
    SUM(p.amount) / NULLIF(COUNT(DISTINCT s.user_id), 0) AS revenue_per_user,
    ROUND(100.0 * SUM(p.amount) / SUM(SUM(p.amount)) OVER(), 2) AS revenue_percentage
FROM subscriptions s
JOIN payments p ON s.user_id = p.user_id
WHERE p.status = 'completed'
    AND p.completed_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY s.plan_id
ORDER BY total_revenue DESC;

-- 7. Customer Lifetime Value (LTV)
CREATE OR REPLACE VIEW customer_ltv AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    COUNT(p.id) AS total_payments,
    SUM(p.amount) AS total_spent,
    AVG(p.amount) AS avg_payment,
    MAX(p.completed_at) AS last_payment_date,
    EXTRACT(DAY FROM (COALESCE(MAX(p.completed_at), CURRENT_DATE) - MIN(u.created_at))) AS customer_lifetime_days,
    SUM(p.amount) / NULLIF(EXTRACT(DAY FROM (COALESCE(MAX(p.completed_at), CURRENT_DATE) - MIN(u.created_at))), 0) * 30 AS estimated_monthly_ltv
FROM users u
LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'completed'
GROUP BY u.id, u.name, u.email, u.created_at
HAVING COUNT(p.id) > 0
ORDER BY total_spent DESC
LIMIT 100;

-- 8. Refund Analysis
CREATE OR REPLACE VIEW refund_analysis AS
SELECT 
    DATE_TRUNC('month', refunded_at) AS month,
    COUNT(*) AS refund_count,
    SUM(refund_amount) AS total_refunded,
    AVG(refund_amount) AS avg_refund,
    COUNT(DISTINCT user_id) AS affected_customers,
    COUNT(DISTINCT CASE WHEN refund_reason IS NOT NULL THEN 1 END) AS refunds_with_reason
FROM payments
WHERE status = 'refunded'
    AND refunded_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', refunded_at)
ORDER BY month DESC;

-- ============================================
-- PERFORMANCE REPORTS
-- ============================================

-- 9. System Performance Metrics
CREATE OR REPLACE VIEW system_performance AS
SELECT 
    DATE_TRUNC('hour', created_at) AS hour,
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful_requests,
    COUNT(CASE WHEN status = 'failure' THEN 1 END) AS failed_requests,
    ROUND(100.0 * COUNT(CASE WHEN status = 'success' THEN 1 END) / NULLIF(COUNT(*), 0), 2) AS success_rate,
    AVG(duration) AS avg_response_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration) AS median_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) AS p95_response_time_ms
FROM audit_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- 10. Slow Query Analysis (from activity logs)
CREATE OR REPLACE VIEW slow_operations AS
SELECT 
    action,
    resource_type,
    COUNT(*) AS operation_count,
    AVG(duration) AS avg_duration_ms,
    MAX(duration) AS max_duration_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration) AS p95_duration_ms
FROM activity_logs
WHERE duration > 1000 -- Operations taking more than 1 second
    AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY action, resource_type
ORDER BY avg_duration_ms DESC;

-- ============================================
-- EXPORTABLE REPORTS
-- ============================================

-- 11. User Export Report (for CSV export)
CREATE OR REPLACE VIEW user_export_report AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.phone,
    u.role,
    u.subscription_plan,
    u.is_email_verified,
    u.created_at,
    u.last_login,
    COUNT(DISTINCT f.id) AS total_files,
    COALESCE(SUM(f.size), 0) AS total_storage_bytes,
    COUNT(DISTINCT p.id) AS total_payments,
    COALESCE(SUM(p.amount), 0) AS total_spent,
    MAX(p.completed_at) AS last_payment_date,
    CASE WHEN s.status = 'active' THEN 'Yes' ELSE 'No' END AS has_active_subscription,
    s.end_date AS subscription_end_date
FROM users u
LEFT JOIN files f ON u.id = f.user_id AND f.is_deleted = false
LEFT JOIN payments p ON u.id = p.user_id AND p.status = 'completed'
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
GROUP BY u.id, u.name, u.email, u.phone, u.role, u.subscription_plan, 
         u.is_email_verified, u.created_at, u.last_login, s.status, s.end_date
ORDER BY u.created_at DESC;

-- 12. Storage Usage Report by User
CREATE OR REPLACE VIEW storage_usage_report AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.subscription_plan,
    s.limits->>'storage' AS storage_limit_bytes,
    COUNT(f.id) AS file_count,
    COALESCE(SUM(f.size), 0) AS used_storage_bytes,
    ROUND(COALESCE(SUM(f.size), 0) / 1024.0 / 1024.0 / 1024.0, 2) AS used_storage_gb,
    CASE 
        WHEN (s.limits->>'storage')::BIGINT > 0 
        THEN ROUND(100.0 * COALESCE(SUM(f.size), 0) / (s.limits->>'storage')::BIGINT, 2)
        ELSE 0
    END AS usage_percentage,
    CASE 
        WHEN ROUND(100.0 * COALESCE(SUM(f.size), 0) / NULLIF((s.limits->>'storage')::BIGINT, 0), 2) >= 90 THEN 'Critical'
        WHEN ROUND(100.0 * COALESCE(SUM(f.size), 0) / NULLIF((s.limits->>'storage')::BIGINT, 0), 2) >= 75 THEN 'Warning'
        ELSE 'OK'
    END AS status
FROM users u
LEFT JOIN files f ON u.id = f.user_id AND f.is_deleted = false
LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
GROUP BY u.id, u.name, u.email, u.subscription_plan, s.limits
ORDER BY used_storage_bytes DESC;

-- 13. Payment Reconciliation Report
CREATE OR REPLACE VIEW payment_reconciliation AS
SELECT 
    p.id,
    p.user_id,
    u.name AS user_name,
    u.email AS user_email,
    p.method,
    p.amount,
    p.currency,
    p.status,
    p.transaction_id,
    p.created_at,
    p.completed_at,
    CASE 
        WHEN p.status = 'completed' AND p.completed_at IS NOT NULL THEN 'Matched'
        WHEN p.status = 'pending' AND p.created_at < CURRENT_DATE - INTERVAL '7 days' THEN 'Stale'
        ELSE 'Pending'
    END AS reconciliation_status,
    EXTRACT(DAY FROM (CURRENT_DATE - p.created_at)) AS days_pending
FROM payments p
JOIN users u ON p.user_id = u.id
WHERE p.created_at >= CURRENT_DATE - INTERVAL '90 days'
ORDER BY p.created_at DESC;