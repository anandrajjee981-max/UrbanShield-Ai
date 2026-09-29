-- Climate Smart City :: 001_create_users
-- Users table backing JWT authentication. Passwords are always stored as
-- bcrypt hashes (60 char strings), never as plain text.

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(320) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'CITIZEN',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_unique     UNIQUE (email),
    CONSTRAINT users_email_lowercase  CHECK (email = LOWER(email)),
    CONSTRAINT users_role_valid       CHECK (role IN ('CITIZEN', 'AUTHORITY', 'ADMIN'))
);

-- Email lookups happen on every login, so index the normalised column too.
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_role_idx     ON users (role);

-- Keep updated_at accurate without relying on application code.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;

CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
