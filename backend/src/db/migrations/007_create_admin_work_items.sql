-- Climate Smart City :: 007_create_admin_work_items
-- Admin "My Tasks" work items. The first consumer is AI failure recovery: when
-- Watcher/Boss/assignment automation fails, the issue is NEVER rejected - an
-- OPEN work item is created so an admin can handle it manually.
--
-- Distinct from `authority_tasks` (006): those are repair jobs for authorities;
-- these are admin work items and never appear in Authority My Tasks.
--
-- Idempotency: a partial unique index enforces ONE active work item per
-- issue_id + failure_stage, so a retried workflow cannot spam duplicates.
-- A RESOLVED item frees the (issue_id, failure_stage) slot for a future failure.
--
-- NOT part of this migration (deliberately): notifications (email/Slack/push),
-- issue status changes, frontend UI.

CREATE TABLE IF NOT EXISTS admin_work_items (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id      UUID           NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    -- WATCHER / BOSS / ELIGIBILITY / ASSIGNMENT - which pipeline stage failed.
    failure_stage VARCHAR(20)    NOT NULL,
    -- Normalised, provider-agnostic code (AI_SERVICE_TIMEOUT, ...). Never a raw
    -- Gemini error, never a secret.
    failure_code  VARCHAR(60),
    type          VARCHAR(40)    NOT NULL,
    title         VARCHAR(200)   NOT NULL,
    description   VARCHAR(1000)  NOT NULL,
    status        VARCHAR(20)    NOT NULL DEFAULT 'OPEN',
    priority      VARCHAR(10)    NOT NULL DEFAULT 'HIGH',
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT admin_work_items_stage_valid    CHECK (failure_stage IN ('WATCHER', 'BOSS', 'ELIGIBILITY', 'ASSIGNMENT')),
    CONSTRAINT admin_work_items_type_valid     CHECK (type IN ('AI_SERVICE_FAILURE', 'NO_ELIGIBLE_AUTHORITY', 'ASSIGNMENT_FAILURE')),
    CONSTRAINT admin_work_items_status_valid   CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    CONSTRAINT admin_work_items_priority_valid CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    CONSTRAINT admin_work_items_title_not_blank    CHECK (BTRIM(title) <> ''),
    CONSTRAINT admin_work_items_description_not_blank CHECK (BTRIM(description) <> '')
);

-- One ACTIVE work item per issue + workflow stage (idempotent retries).
CREATE UNIQUE INDEX IF NOT EXISTS admin_work_items_active_stage_uidx
    ON admin_work_items (issue_id, failure_stage)
    WHERE status IN ('OPEN', 'IN_PROGRESS');

-- Admin My Tasks listing: newest first, optionally filtered by status.
CREATE INDEX IF NOT EXISTS admin_work_items_status_created_idx
    ON admin_work_items (status, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_work_items_issue_idx
    ON admin_work_items (issue_id);
CREATE INDEX IF NOT EXISTS admin_work_items_type_idx
    ON admin_work_items (type);

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS admin_work_items_set_updated_at ON admin_work_items;

CREATE TRIGGER admin_work_items_set_updated_at
    BEFORE UPDATE ON admin_work_items
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
