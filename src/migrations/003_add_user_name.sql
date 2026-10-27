-- Migration: 003_add_user_name
-- Description: Add unique user_name to tbl_users (used for public portfolio URLs: /<user_name>)
--              and backfill existing users from their full_name. Safe to re-run: users that
--              already have a user_name are left untouched.
-- Date: 2026-09-28

ALTER TABLE tbl_users ADD COLUMN IF NOT EXISTS user_name VARCHAR(50);

DO $$
DECLARE
    rec RECORD;
    base TEXT;
    candidate TEXT;
    suffix INT;
BEGIN
    -- Users with a login account get first pick of a name, then oldest first
    FOR rec IN
        SELECT u.id, u.full_name
        FROM tbl_users u
        LEFT JOIN tbl_auth a ON a.user_uuid = u.user_uuid
        WHERE u.user_name IS NULL
        ORDER BY (a.id IS NULL), u.id
    LOOP
        base := left(trim(both '-' from regexp_replace(lower(rec.full_name), '[^a-z0-9]+', '-', 'g')), 40);
        IF length(base) < 3 OR base IN ('admin', 'user', 'auth', 'api', 'graphql', 'login', 'register') THEN
            base := coalesce(nullif(base, ''), 'user') || '-portfolio';
        END IF;

        candidate := base;
        suffix := 2;
        WHILE EXISTS (SELECT 1 FROM tbl_users WHERE user_name = candidate) LOOP
            candidate := base || '-' || suffix;
            suffix := suffix + 1;
        END LOOP;

        UPDATE tbl_users SET user_name = candidate WHERE id = rec.id;
    END LOOP;
END $$;

ALTER TABLE tbl_users ALTER COLUMN user_name SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_name ON tbl_users (user_name);
