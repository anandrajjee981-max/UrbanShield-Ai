-- Climate Smart City :: 004_issue_ai_assignment
-- Full issue lifecycle after admin verification:
--
--     REPORTED --(admin verify)--> VERIFIED --(AI analysis)--> analysed
--        |                              |
--        |                       (workforce scoring + recommendation)
--        |                              |
--        |                       (admin assign)--> ASSIGNED --(authority start)--> IN_PROGRESS
--        |                                                                          |
--        --(admin reject)--> REJECTED (terminal)                         (authority resolve)--> RESOLVED
--
-- This migration is additive: no column is dropped, no existing row is
-- rewritten. Every REPORTED / VERIFIED / REJECTED row created before this
-- migration stays valid and untouched.
--
-- AI analysis is rule based (see src/service/ai-analysis.service.ts): the
-- columns only store its outcome (required skill, complexity, effort hours and
-- when the analysis ran). No ML model, no external call, so the workflow works
-- offline against any database that has run the migrations.
--
-- Assignment references the AUTHORITY user who owns the task. Only the user id
-- is stored - never name or email - because the `users` join already provides
-- those. Role checks (assignee must be an AUTHORITY) live in the service
-- layer, where the users table is readable; a CHECK constraint cannot see
-- other tables.

-- ---------------------------------------------------------------------------
-- AI analysis outcome (written once the issue is VERIFIED, carried forward)
-- ---------------------------------------------------------------------------

ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS skill_required VARCHAR(40),
    ADD COLUMN IF NOT EXISTS complexity     VARCHAR(10),
    ADD COLUMN IF NOT EXISTS effort_hours   NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Assignment + authority progress
-- ---------------------------------------------------------------------------

-- ON DELETE SET NULL: deleting an authority account must not delete the
-- issues they were working on. The status and timestamps stay, only the
-- reference to the person is lost (same policy as verified_by / rejected_by).
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS assigned_to     UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_by     UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS started_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_note VARCHAR(1000);

-- ---------------------------------------------------------------------------
-- Value constraints for the new columns
-- ---------------------------------------------------------------------------

-- Keep in sync with SKILL_REQUIRED_VALUES in src/types/issue.types.ts.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_skill_required_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_skill_required_valid CHECK (
        skill_required IS NULL OR skill_required IN (
            'PLUMBING', 'ELECTRICAL', 'FLOOD_RESPONSE', 'HEAT_RESPONSE',
            'DRAINAGE_CREW', 'SANITATION', 'GENERAL'
        )
    );

-- Keep in sync with ISSUE_COMPLEXITIES in src/types/issue.types.ts.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_complexity_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_complexity_valid CHECK (
        complexity IS NULL OR complexity IN ('LOW', 'MEDIUM', 'HIGH')
    );

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_effort_hours_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_effort_hours_valid CHECK (
        effort_hours IS NULL OR (effort_hours > 0 AND effort_hours <= 500)
    );

ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_resolution_note_not_blank;

ALTER TABLE issues
    ADD CONSTRAINT issues_resolution_note_not_blank CHECK (
        resolution_note IS NULL OR BTRIM(resolution_note) <> ''
    );

-- ---------------------------------------------------------------------------
-- Lifecycle state machine (replaces the 003 verification-only constraint)
-- ---------------------------------------------------------------------------

-- 003_add_issue_verification.sql forced verified_by / rejected_by to NULL for
-- every status except VERIFIED / REJECTED. That was correct while the admin
-- review was the last stage, but ASSIGNED / IN_PROGRESS / RESOLVED grow out
-- of a VERIFIED issue and must keep its verification metadata. This
-- constraint restates the whole lifecycle so each stage carries exactly the
-- metadata it needs and nothing else:
--
--   REPORTED    - nothing recorded yet
--   VERIFIED    - verified_at set, no rejection, no assignment, no progress
--   REJECTED    - rejected_at set, no verification, no assignment, no progress
--   ASSIGNED    - verified + assignee (assigned_to / assigned_at), not started
--   IN_PROGRESS - verified + assigned + started_at, not resolved
--   RESOLVED    - verified + assigned + started + resolved_at
--
-- AI columns (skill_required, complexity, effort_hours, ai_analyzed_at) are
-- intentionally unconstrained here: an analysis may run at VERIFIED and is
-- then carried through ASSIGNED / IN_PROGRESS / RESOLVED, or it may not have
-- run yet. All-or-nothing grouping of the AI columns is enforced in
-- application code instead, so a partially written analysis is still
-- readable while it is being backfilled.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_verification_state_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_lifecycle_state_valid CHECK (
        CASE status
            WHEN 'REPORTED' THEN (
                   verified_by IS NULL AND verified_at IS NULL
               AND rejected_by IS NULL AND rejected_at IS NULL AND rejection_reason IS NULL
               AND assigned_to IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
               AND started_at IS NULL
               AND resolved_at IS NULL AND resolution_note IS NULL
            )
            WHEN 'VERIFIED' THEN (
                   verified_at IS NOT NULL
               AND rejected_at IS NULL AND rejection_reason IS NULL
               AND assigned_to IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
               AND started_at IS NULL
               AND resolved_at IS NULL AND resolution_note IS NULL
            )
            WHEN 'REJECTED' THEN (
                   rejected_at IS NOT NULL
               AND verified_by IS NULL AND verified_at IS NULL
               AND assigned_to IS NULL AND assigned_by IS NULL AND assigned_at IS NULL
               AND started_at IS NULL
               AND resolved_at IS NULL AND resolution_note IS NULL
            )
            WHEN 'ASSIGNED' THEN (
                   verified_at IS NOT NULL
               AND rejected_at IS NULL AND rejection_reason IS NULL
               AND assigned_to IS NOT NULL AND assigned_at IS NOT NULL
               AND started_at IS NULL
               AND resolved_at IS NULL AND resolution_note IS NULL
            )
            WHEN 'IN_PROGRESS' THEN (
                   verified_at IS NOT NULL
               AND rejected_at IS NULL AND rejection_reason IS NULL
               AND assigned_to IS NOT NULL AND assigned_at IS NOT NULL
               AND started_at IS NOT NULL
               AND resolved_at IS NULL AND resolution_note IS NULL
            )
            WHEN 'RESOLVED' THEN (
                   verified_at IS NOT NULL
               AND rejected_at IS NULL AND rejection_reason IS NULL
               AND assigned_to IS NOT NULL AND assigned_at IS NOT NULL
               AND started_at IS NOT NULL
               AND resolved_at IS NOT NULL
            )
            ELSE FALSE
        END
    );

-- ---------------------------------------------------------------------------
-- Indexes for the new queues
-- ---------------------------------------------------------------------------

-- Authority "my tasks" lists one assignee's active work newest first.
CREATE INDEX IF NOT EXISTS issues_assigned_to_status_idx ON issues (assigned_to, status, created_at DESC);

-- Admin assignment queue: all verified-but-unassigned issues newest first.
CREATE INDEX IF NOT EXISTS issues_verified_unassigned_idx ON issues (status, created_at DESC)
    WHERE status = 'VERIFIED';
