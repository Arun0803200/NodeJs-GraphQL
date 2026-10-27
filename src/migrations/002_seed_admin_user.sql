-- Migration: 002_seed_admin_user
-- Description: Seed default admin user
-- Date: 2026-03-30
--
-- Default admin credentials:
--   Email:    admin@portfolio.com
--   Password: admin123
--   IMPORTANT: Change this password immediately after first login!

-- Step 1: Insert admin user profile
INSERT INTO tbl_users (
    full_name,
    designation,
    user_uuid,
    contact_us_description,
    email,
    mobile_no,
    address,
    social_media,
    created_at,
    updated_at
) VALUES (
    'Platform Admin',
    'System Administrator',
    gen_random_uuid(),
    'Platform administration',
    'admin@portfolio.com',
    '0000000000',
    'System',
    '[]'::jsonb,
    NOW(),
    NOW()
);

-- Step 2: Insert auth record with admin role
-- Password: admin123 (bcrypt, 12 rounds)
INSERT INTO tbl_auth (
    user_uuid,
    email,
    password,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    (SELECT user_uuid FROM tbl_users WHERE email = 'admin@portfolio.com'),
    'admin@portfolio.com',
    '$2b$12$6JTJdXXNxTD2DKz5r95XDO7DtNkvNbcN0f8ygDfzibSpTnrHw95Hu',
    'admin',
    true,
    NOW(),
    NOW()
);
