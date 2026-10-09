-- Climate Smart City :: 006_create_authority_tasks
-- Persistent task/assignment record linking a VERIFIED issue to the authority
-- selected by Round Robin.
--
-- Issue status intentionally stays VERIFIED: `issues_verification_state_valid`
-- (003) requires all verification metadata to be NULL for any status other than
-- VERIFIED/REJECTED, so moving an issue to ASSIGNED would violate it. Assignment
-- is represented by this table instead; the authority workflow can move the
-- task/issue later.
--
-- One ACTIVE (ASSIGNED/IN_PROGRESS) task per issue is enforced by a partial
-- unique index - the database, not application code, is the final authority on
-- duplicate assignments.
--
-- NOT part of this migration (deliberately): admin manual assignment,
-- notifications, issue status transitions, workload tables.

CREATE TABLE IF NOT EXISTS authority_tasks (
    id                         UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id                   UUID                  NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    -- The application row, same id Round Robin persists and Eligibility returns.
    authority_application_id   UUID                  NOT NULL REFERENCES authority_applications (id) ON DELETE CASCADE,
    assignment_group           VARCHAR(200)          NOT NULL,
    required_skill             authority_skill       NOT NULL,
    required_jurisdiction      VARCHAR(200),
    estimated_duration_minutes INTEGER               NOT NULL,
    complexity                 VARCHAR(10)           NOT NULL,
    status                     VARCHAR(20)           NOT NULL DEFAULT 'ASSIGNED',
    created_at                 TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

    CONSTRAINT authority_tasks_group_not_blank    CHECK (BTRIM(assignment_group) <> ''),
    CONSTRAINT authority_tasks_duration_positive  CHECK (estimated_duration_minutes > 0),
    CONSTRAINT authority_tasks_complexity_valid   CHECK (complexity IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT authority_tasks_status_valid       CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT authority_tasks_jurisdiction_valid CHECK (required_jurisdiction IS NULL OR BTRIM(required_jurisdiction) <> '')
);

-- One active assignment per issue, enforced by the database.
CREATE UNIQUE INDEX IF NOT EXISTS authority_tasks_active_issue_uidx
    ON authority_tasks (issue_id)
    WHERE status IN ('ASSIGNED', 'IN_PROGRESS');

-- Authority dashboard: "My Tasks" filters by authority and status.
CREATE INDEX IF NOT EXISTS authority_tasks_authority_status_idx
    ON authority_tasks (authority_application_id, status, created_at DESC);

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS authority_tasks_set_updated_at ON authority_tasks;

CREATE TRIGGER authority_tasks_set_updated_at
    BEFORE UPDATE ON authority_tasks
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
