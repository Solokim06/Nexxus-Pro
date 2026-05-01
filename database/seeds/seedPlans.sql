-- Seed: Subscription Plans
-- Description: Insert default subscription plans into the database

-- Insert subscription plans
INSERT INTO subscription_plans (id, name, description, price, annual_price, currency, period, features, limits, color, popular, "order") VALUES
(
    'free',
    'Free',
    'Perfect for getting started',
    0,
    0,
    'USD',
    'month',
    '["1 GB Storage", "5 Merges per month", "Basic Support", "50 MB File Size Limit", "Standard Security"]'::jsonb,
    '{"storage": 1073741824, "fileSize": 52428800, "mergesPerMonth": 5, "teamMembers": 0, "apiCallsPerMonth": 1000}'::jsonb,
    '#6B7280',
    false,
    1
),
(
    'basic',
    'Basic',
    'For individuals and small teams',
    9.99,
    99.99,
    'USD',
    'month',
    '["10 GB Storage", "50 Merges per month", "Priority Support", "100 MB File Size Limit", "File Sharing", "Version History (30 days)"]'::jsonb,
    '{"storage": 10737418240, "fileSize": 104857600, "mergesPerMonth": 50, "teamMembers": 3, "apiCallsPerMonth": 10000}'::jsonb,
    '#3B82F6',
    true,
    2
),
(
    'pro',
    'Professional',
    'For professionals and growing businesses',
    29.99,
    299.99,
    'USD',
    'month',
    '["100 GB Storage", "Unlimited Merges", "24/7 Premium Support", "500 MB File Size Limit", "Advanced File Sharing", "API Access", "Team Collaboration", "Version History (90 days)", "Advanced Analytics"]'::jsonb,
    '{"storage": 107374182400, "fileSize": 524288000, "mergesPerMonth": -1, "teamMembers": 10, "apiCallsPerMonth": 50000}'::jsonb,
    '#8B5CF6',
    true,
    3
),
(
    'enterprise',
    'Enterprise',
    'For large organizations',
    99.99,
    999.99,
    'USD',
    'month',
    '["1 TB Storage", "Unlimited Merges", "Dedicated Support", "2 GB File Size Limit", "Custom Security Policies", "Advanced Analytics", "SSO Integration", "SLA Guarantee (99.9%)", "Custom Integrations", "Audit Logs", "Version History (1 year)", "Data Export"]'::jsonb,
    '{"storage": 1099511627776, "fileSize": 2147483648, "mergesPerMonth": -1, "teamMembers": -1, "apiCallsPerMonth": -1}'::jsonb,
    '#10B981',
    false,
    4
);

-- Verify plans were inserted
DO $$
DECLARE
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM subscription_plans;
    RAISE NOTICE '✓ Inserted % subscription plans', plan_count;
END $$;