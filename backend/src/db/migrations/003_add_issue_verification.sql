-- Climate Smart City :: 003_add_issue_verification
-- Admin review stage of the issue workflow:
--
--     REPORTED --(admin verify)--> VERIFIED
--     REPORTED --(admin reject)--> REJECTED
--
-- This migration only extends the `issues` table created by 002_create_issues.sql.
-- It is additive: no column is dropped, no existing row is rewritten, so every
-- REPORTED issue created before this migration stays valid and untouched.
--
-- The verification metadata records *who* acted and *when*, so an audit trail
-- exists before any automated processing touches an issue. Only the admin's
-- user id is stored - never their name or email - because the `users` join
-- already provides those and a copied value would go stale.
--
-- NOT part of this migration (deliberately, see the workflow diagram):
--   AI analysis, severity, estimated effort, required skills, employee
--   assignment, workforce tables and task queues.

-- ---------------------------------------------------------------------------
-- Verification metadata
-- ---------------------------------------------------------------------------

-- ON DELETE SET NULL: deleting an admin account must not delete the issues that
-- were reviewed (which would destroy citizen reports). The status and the
-- timestamp stay, only the reference to the person is lost.
ALTER TABLE issues
    ADD COLUMN IF NOT EXISTS verified_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verified_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_by      UUID        REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- ---------------------------------------------------------------------------
-- Statuses
-- ---------------------------------------------------------------------------

-- REJECTED is the terminal branch an admin can take from REPORTED. The CHECK is
-- recreated rather than altered so the constraint keeps a single, readable
-- definition; it is dropped and re-added inside this transaction, and existing
-- REPORTED rows satisfy the new list unchanged.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_status_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_status_valid CHECK (status IN ('REPORTED', 'VERIFIED', 'REJECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'));

-- ---------------------------------------------------------------------------
-- Metadata consistency
-- ---------------------------------------------------------------------------

-- The status and its metadata must agree, so a row can never claim to be
-- VERIFIED without a timestamp, or carry a rejection reason while still REPORTED.
-- The admin id itself is not required here: ON DELETE SET NULL above can clear it
-- while the review history stays intact. Requiring it in application code (see
-- src/service/admin-issue.service.ts) keeps the normal path honest without
-- blocking a future account deletion.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_verification_state_valid;

ALTER TABLE issues
    ADD CONSTRAINT issues_verification_state_valid CHECK (
        CASE status
            WHEN 'VERIFIED' THEN (verified_at IS NOT NULL
                                  AND rejected_at IS NULL
                                  AND rejection_reason IS NULL)
            WHEN 'REJECTED' THEN (rejected_at IS NOT NULL
                                  AND verified_at IS NULL
                                  AND (rejection_reason IS NULL OR BTRIM(rejection_reason) <> ''))
            ELSE (verified_by IS NULL
                  AND verified_at IS NULL
                  AND rejected_by IS NULL
                  AND rejected_at IS NULL
                  AND rejection_reason IS NULL)
        END
    );

-- A whitespace only rejection reason carries no information and would be shown
-- to the citizen as a blank message, so it is refused at the database too.
ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_rejection_reason_not_blank;

ALTER TABLE issues
    ADD CONSTRAINT issues_rejection_reason_not_blank CHECK (rejection_reason IS NULL OR BTRIM(rejection_reason) <> '');

-- ---------------------------------------------------------------------------
-- Indexes for the admin dashboard
-- ---------------------------------------------------------------------------

-- The admin queue lists by status and then newest first, which this index serves
-- directly. The existing issues_status_idx still serves a bare status count.
CREATE INDEX IF NOT EXISTS issues_status_created_idx ON issues (status, created_at DESC);
