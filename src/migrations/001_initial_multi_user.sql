-- Migration: 001_initial_multi_user
-- Description: Add auth table, register all entities, add foreign key indexes
-- Date: 2026-03-30

-- ============================================================
-- 1. Auth table for login credentials & role management
-- ============================================================
CREATE TABLE IF NOT EXISTS tbl_auth (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_user_uuid ON tbl_auth(user_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_email ON tbl_auth(email);

-- ============================================================
-- 2. Ensure previously-unregistered tables exist
--    (TypeORM synchronize will create these, but for manual migration safety)
-- ============================================================

-- User Skills
CREATE TABLE IF NOT EXISTS tbl_user_skills (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    tittle VARCHAR(255),
    skills JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_skills_uuid ON tbl_user_skills(user_uuid);

-- User Awards
CREATE TABLE IF NOT EXISTS tbl_users_awards (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    title VARCHAR(225),
    description VARCHAR(225),
    company_id INTEGER,
    event_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_awards_uuid ON tbl_users_awards(user_uuid);

-- User Education
CREATE TABLE IF NOT EXISTS tbl_user_education (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    institution VARCHAR(255),
    institution_location VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_education_uuid ON tbl_user_education(user_uuid);

-- Contact Us
CREATE TABLE IF NOT EXISTS tbl_contact_us (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    sender_name VARCHAR(255),
    sender_email VARCHAR(255),
    message TEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contact_us_uuid ON tbl_contact_us(user_uuid);

-- ============================================================
-- 3. Add indexes to existing tables (if missing)
-- ============================================================

-- Ensure user_uuid indexes on all existing tables
CREATE INDEX IF NOT EXISTS idx_about_user_uuid ON tbl_about(user_uuid);
CREATE INDEX IF NOT EXISTS idx_user_experience_uuid ON tbl_user_experience(user_uuid);
CREATE INDEX IF NOT EXISTS idx_user_projects_uuid ON tbl_user_projects(user_uuid);
CREATE INDEX IF NOT EXISTS idx_user_images_uuid ON tbl_user_images(user_uuid);

-- ============================================================
-- 4. Seed: Create default admin user (optional)
--    Password: admin123 (bcrypt hash, 12 rounds)
--    IMPORTANT: Change this password immediately after first login!
-- ============================================================

-- To create an admin, run these manually after the app starts:
-- INSERT INTO tbl_users (full_name, designation, user_uuid, contact_us_description, email, mobile_no, address, social_media, created_at, updated_at)
-- VALUES ('Admin', 'System Administrator', gen_random_uuid(), 'Platform admin', 'admin@portfolio.com', '0000000000', 'System', '[]', NOW(), NOW());
--
-- Then get the user_uuid and create the auth record:
-- INSERT INTO tbl_auth (user_uuid, email, password, role, is_active, created_at, updated_at)
-- VALUES ('<user_uuid_from_above>', 'admin@portfolio.com', '<bcrypt_hash_of_password>', 'admin', true, NOW(), NOW());
