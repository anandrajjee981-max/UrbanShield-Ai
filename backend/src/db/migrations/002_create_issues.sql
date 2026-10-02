-- Climate Smart City :: 002_create_issues
-- Issues reported by citizens (water leakage, water shortage, extreme heat,
-- flooding, drainage, other). `user_id` is always the authenticated citizen and
-- comes from the JWT, never from the request body.
--
-- Image binaries are NOT stored here: only the ImageKit URL and file id are
-- kept, so a file can be located or deleted from ImageKit later.
--
-- Every new row starts at 'REPORTED'. The remaining statuses (VERIFIED,
-- ASSIGNED, IN_PROGRESS, RESOLVED) belong to the authority workflow, which is a
-- separate task - they are only allowed by the CHECK constraint so the column
-- can hold them later, never by the citizen facing API.

CREATE TABLE IF NOT EXISTS issues (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    issue_type    VARCHAR(40)   NOT NULL,
    description   VARCHAR(2000) NOT NULL,
    image_url     VARCHAR(1000),
    image_file_id VARCHAR(255),
    location_type VARCHAR(10)   NOT NULL,
    latitude      NUMERIC(9, 6),
    longitude     NUMERIC(9, 6),
    address       VARCHAR(500),
    status        VARCHAR(20)   NOT NULL DEFAULT 'REPORTED',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Adding an issue type later means adding it to this list and to
    -- ISSUE_TYPES in src/types/issue.types.ts.
    CONSTRAINT issues_issue_type_valid  CHECK (issue_type IN ('WATER_LEAKAGE', 'WATER_SHORTAGE', 'EXTREME_HEAT', 'FLOODING', 'DRAINAGE', 'OTHER')),
    CONSTRAINT issues_status_valid       CHECK (status IN ('REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT issues_location_type_valid CHECK (location_type IN ('GPS', 'MANUAL')),

    -- Location must be internally consistent: a GPS report carries coordinates
    -- and no typed address, a manual report carries an address and no
    -- coordinates. The API rejects the same combinations before they get here.
    CONSTRAINT issues_location_complete CHECK (
        (location_type = 'GPS'    AND latitude IS NOT NULL AND longitude IS NOT NULL AND address IS NULL)
        OR
        (location_type = 'MANUAL' AND latitude IS NULL     AND longitude IS NULL     AND address IS NOT NULL)
    ),
    CONSTRAINT issues_latitude_range  CHECK (latitude  IS NULL OR (latitude  >= -90  AND latitude  <= 90)),
    CONSTRAINT issues_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),

    CONSTRAINT issues_address_not_blank    CHECK (address     IS NULL OR BTRIM(address)     <> ''),
    CONSTRAINT issues_description_not_blank CHECK (BTRIM(description) <> '')
);

-- "My Reports" lists one citizen's issues newest first, so the index leads with
-- user_id and sorts on created_at.
CREATE INDEX IF NOT EXISTS issues_user_created_idx ON issues (user_id, created_at DESC);

-- Preparing the authority triage queries: filter by status, then by type.
CREATE INDEX IF NOT EXISTS issues_status_idx     ON issues (status);
CREATE INDEX IF NOT EXISTS issues_issue_type_idx ON issues (issue_type);

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS issues_set_updated_at ON issues;

CREATE TRIGGER issues_set_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
