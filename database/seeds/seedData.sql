-- Seed: Demo Data for Development
-- Description: Insert sample data for testing and development

DO $$
DECLARE
    demo_user_id UUID;
    demo_user2_id UUID;
    demo_folder_id UUID;
    demo_subscription_id UUID;
BEGIN
    -- Check if demo users already exist
    SELECT id INTO demo_user_id FROM users WHERE email = 'demo@nexxus-pro.com';
    SELECT id INTO demo_user2_id FROM users WHERE email = 'johndoe@example.com';
    
    -- Create demo user 1 if not exists
    IF demo_user_id IS NULL THEN
        INSERT INTO users (
            id,
            name,
            email,
            password,
            phone,
            role,
            is_email_verified,
            subscription_plan,
            company,
            timezone,
            language,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'Demo User',
            'demo@nexxus-pro.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VtYvLqY8K5kZxK', -- Demo123!
            '+254712345678',
            'user',
            true,
            'basic',
            'Demo Company',
            'Africa/Nairobi',
            'en',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO demo_user_id;
        
        RAISE NOTICE '✓ Demo user 1 created: %', demo_user_id;
    END IF;
    
    -- Create demo user 2 if not exists
    IF demo_user2_id IS NULL THEN
        INSERT INTO users (
            id,
            name,
            email,
            password,
            phone,
            role,
            is_email_verified,
            subscription_plan,
            company,
            timezone,
            language,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'John Doe',
            'johndoe@example.com',
            '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VtYvLqY8K5kZxK', -- John123!
            '+254798765432',
            'user',
            true,
            'free',
            'John\'s Business',
            'Africa/Nairobi',
            'en',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO demo_user2_id;
        
        RAISE NOTICE '✓ Demo user 2 created: %', demo_user2_id;
    END IF;
    
    -- Create subscription for demo user 1
    IF demo_user_id IS NOT NULL THEN
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
        ) VALUES (
            demo_user_id,
            'basic',
            'Basic',
            'active',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + INTERVAL '30 days',
            'month',
            9.99,
            'USD',
            true,
            '["10 GB Storage", "50 Merges per month", "Priority Support", "100 MB File Size Limit"]'::jsonb,
            '{"storage": 10737418240, "fileSize": 104857600, "mergesPerMonth": 50}'::jsonb,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        ) ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE '✓ Subscription created for demo user 1';
    END IF;
    
    -- Create folders for demo user 1
    IF demo_user_id IS NOT NULL THEN
        -- Documents folder
        INSERT INTO folders (id, name, user_id, color, icon, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Documents', demo_user_id, '#3B82F6', '📄', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id INTO demo_folder_id;
        
        -- Images folder
        INSERT INTO folders (id, name, user_id, color, icon, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Images', demo_user_id, '#10B981', '🖼️', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        -- Videos folder
        INSERT INTO folders (id, name, user_id, color, icon, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Videos', demo_user_id, '#EF4444', '🎥', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        -- Music folder
        INSERT INTO folders (id, name, user_id, color, icon, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Music', demo_user_id, '#F59E0B', '🎵', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        -- Archives folder
        INSERT INTO folders (id, name, user_id, color, icon, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Archives', demo_user_id, '#8B5CF6', '📦', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        RAISE NOTICE '✓ Folders created for demo user 1';
    END IF;
    
    -- Create sample files for demo user 1
    IF demo_user_id IS NOT NULL AND demo_folder_id IS NOT NULL THEN
        INSERT INTO files (
            id,
            name,
            original_name,
            size,
            mime_type,
            path,
            url,
            user_id,
            folder_id,
            created_at,
            updated_at
        ) VALUES 
        (
            gen_random_uuid(),
            'welcome.pdf',
            'welcome.pdf',
            102400,
            'application/pdf',
            '/storage/demo/welcome.pdf',
            'https://storage.nexxus-pro.com/demo/welcome.pdf',
            demo_user_id,
            demo_folder_id,
            CURRENT_TIMESTAMP - INTERVAL '5 days',
            CURRENT_TIMESTAMP - INTERVAL '5 days'
        ),
        (
            gen_random_uuid(),
            'presentation.pptx',
            'presentation.pptx',
            2048000,
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '/storage/demo/presentation.pptx',
            'https://storage.nexxus-pro.com/demo/presentation.pptx',
            demo_user_id,
            demo_folder_id,
            CURRENT_TIMESTAMP - INTERVAL '3 days',
            CURRENT_TIMESTAMP - INTERVAL '3 days'
        ),
        (
            gen_random_uuid(),
            'data.xlsx',
            'data.xlsx',
            512000,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '/storage/demo/data.xlsx',
            'https://storage.nexxus-pro.com/demo/data.xlsx',
            demo_user_id,
            demo_folder_id,
            CURRENT_TIMESTAMP - INTERVAL '1 day',
            CURRENT_TIMESTAMP - INTERVAL '1 day'
        );
        
        RAISE NOTICE '✓ Sample files created for demo user 1';
    END IF;
    
    -- Create sample payment records
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO payments (
            id,
            user_id,
            method,
            amount,
            currency,
            plan_id,
            status,
            transaction_id,
            completed_at,
            created_at,
            updated_at
        ) VALUES 
        (
            gen_random_uuid(),
            demo_user_id,
            'mpesa',
            9.99,
            'KES',
            'basic',
            'completed',
            'MPESA' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '001',
            CURRENT_TIMESTAMP - INTERVAL '30 days',
            CURRENT_TIMESTAMP - INTERVAL '30 days',
            CURRENT_TIMESTAMP - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'paypal',
            9.99,
            'USD',
            'basic',
            'completed',
            'PAYPAL' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '002',
            CURRENT_TIMESTAMP - INTERVAL '1 day',
            CURRENT_TIMESTAMP - INTERVAL '1 day',
            CURRENT_TIMESTAMP - INTERVAL '1 day'
        );
        
        RAISE NOTICE '✓ Sample payment records created';
    END IF;
    
    -- Create sample activity logs
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO activity_logs (
            id,
            user_id,
            action,
            resource_type,
            resource_name,
            ip,
            user_agent,
            created_at
        ) VALUES 
        (
            gen_random_uuid(),
            demo_user_id,
            'LOGIN',
            'user',
            'demo@nexxus-pro.com',
            '192.168.1.100',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            CURRENT_TIMESTAMP - INTERVAL '2 hours'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'UPLOAD_FILE',
            'file',
            'welcome.pdf',
            '192.168.1.100',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            CURRENT_TIMESTAMP - INTERVAL '5 days'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'MERGE_FILES',
            'merge',
            'merged_document.pdf',
            '192.168.1.100',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            CURRENT_TIMESTAMP - INTERVAL '2 days'
        );
        
        RAISE NOTICE '✓ Sample activity logs created';
    END IF;
    
    -- Create sample notifications
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO notifications (
            id,
            user_id,
            title,
            message,
            type,
            read,
            created_at
        ) VALUES 
        (
            gen_random_uuid(),
            demo_user_id,
            'Welcome to Nexxus-Pro!',
            'Thank you for joining Nexxus-Pro. Get started by uploading your first file.',
            'info',
            false,
            CURRENT_TIMESTAMP - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'Payment Successful',
            'Your payment of $9.99 for the Basic plan was successful.',
            'payment',
            true,
            CURRENT_TIMESTAMP - INTERVAL '30 days'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'Storage Limit Warning',
            'You have used 75% of your storage limit. Consider upgrading.',
            'warning',
            false,
            CURRENT_TIMESTAMP - INTERVAL '1 day'
        );
        
        RAISE NOTICE '✓ Sample notifications created';
    END IF;
    
    -- Create sample merge jobs
    IF demo_user_id IS NOT NULL THEN
        INSERT INTO merge_jobs (
            id,
            user_id,
            status,
            output_format,
            output_name,
            output_size,
            input_files,
            created_at,
            completed_at
        ) VALUES 
        (
            gen_random_uuid(),
            demo_user_id,
            'completed',
            'pdf',
            'merged_report.pdf',
            5120000,
            '[{"name": "report1.pdf", "size": 1024000}, {"name": "report2.pdf", "size": 2048000}]'::jsonb,
            CURRENT_TIMESTAMP - INTERVAL '10 days',
            CURRENT_TIMESTAMP - INTERVAL '10 days' + INTERVAL '5 minutes'
        ),
        (
            gen_random_uuid(),
            demo_user_id,
            'completed',
            'zip',
            'documents_archive.zip',
            10240000,
            '[{"name": "doc1.pdf", "size": 2048000}, {"name": "doc2.pdf", "size": 3072000}, {"name": "image1.jpg", "size": 5120000}]'::jsonb,
            CURRENT_TIMESTAMP - INTERVAL '3 days',
            CURRENT_TIMESTAMP - INTERVAL '3 days' + INTERVAL '2 minutes'
        );
        
        RAISE NOTICE '✓ Sample merge jobs created';
    END IF;
    
    RAISE NOTICE '✅ Demo data seeding completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Demo Accounts:';
    RAISE NOTICE '   Admin: admin@nexxus-pro.com / Admin123!';
    RAISE NOTICE '   Demo User: demo@nexxus-pro.com / Demo123!';
    RAISE NOTICE '   John Doe: johndoe@example.com / John123!';
    
END $$;