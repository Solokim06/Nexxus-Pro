-- Seed: Admin User
-- Description: Create default admin user (password: Admin123!)

-- First, check if admin already exists
DO $$
DECLARE
    admin_exists BOOLEAN;
    admin_id UUID;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'admin@nexxus-pro.com') INTO admin_exists;
    
    IF NOT admin_exists THEN
        -- Insert admin user
        INSERT INTO users (
            id,
            name,
            email,
            password,
            role,
            is_email_verified,
            subscription_plan,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'System Administrator',
            'admin@nexxus-pro.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VtYvLqY8K5kZxK', -- Admin123!
            'admin',
            true,
            'enterprise',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO admin_id;
        
        RAISE NOTICE '✓ Admin user created with ID: %', admin_id;
    ELSE
        RAISE NOTICE '✓ Admin user already exists, skipping';
    END IF;
END $$;

-- Create default admin subscription if not exists
INSERT INTO subscriptions (
    user_id,
    plan_id,
    plan_name,
    status,
    start_date,
    end_date,
    billing_cycle,
    amount,
    currency,
    auto_renew,
    features,
    limits,
    created_at,
    updated_at
)
SELECT 
    u.id,
    'enterprise',
    'Enterprise',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP + INTERVAL '365 days',
    'year',
    999.99,
    'USD',
    true,
    '["Unlimited Storage", "Unlimited Merges", "Dedicated Support", "All Features"]'::jsonb,
    '{"storage": -1, "fileSize": -1, "mergesPerMonth": -1, "teamMembers": -1, "apiCallsPerMonth": -1}'::jsonb,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.email = 'admin@nexxus-pro.com'
AND NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
);

RAISE NOTICE '✓ Admin subscription configured';