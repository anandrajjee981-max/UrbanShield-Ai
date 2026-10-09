-- Climate Smart City :: 008_create_ai_retry_queue
-- The AI retry bucket (internal message queue).
--
-- When Watcher/Boss cannot decide (AI unavailable, timeout, quota), the issue
-- content is neither accepted nor rejected - it is stuck. This table holds that
-- material (a snapshot in `payload`) together with the stage that failed, so an
-- Admin can resend the whole bucket through the same pipeline later instead of
-- asking the citizen to re-report.
--
-- Unlike `admin_work_items` (the Admin's "what needs a human" board), this is a
-- WORK QUEUE: rows move PENDING -> PROCESSING -> COMPLETED as the resend
-- drains them, and a still-failing row returns to PENDING with attempts+1.
--
-- Idempotency: the partial unique index allows one ACTIVE entry per issue +
-- stage, so repeated failures of the same issue never duplicate the queue.
-- A COMPLETED entry no longer occupies the slot, so a later new failure queues
-- again.
--
-- Raw provider text/secret is never stored: `failure_code` is the normalised
-- application code (AI_SERVICE_*), and `payload` holds only the public issue
-- fields the pipeline needs to re-run.

CREATE TABLE IF NOT EXISTS ai_retry_queue (
    id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id        UUID           NOT NULL REFERENCES issues (id) ON DELETE CASCADE,
    -- Which pipeline stage could not decide. Same vocabulary as work items.
    stage           VARCHAR(20)    NOT NULL,
    -- Normalised code (AI_SERVICE_UNAVAILABLE / AI_SERVICE_RATE_LIMITED / ...).
    failure_code    VARCHAR(60),
    -- The stuck material: a snapshot of the public issue fields needed to re-run
    -- the pipeline. Never contains user ids, tokens or provider responses.
    payload         JSONB          NOT NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    attempts        INTEGER        NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT ai_retry_queue_stage_valid     CHECK (stage IN ('WATCHER', 'BOSS', 'ELIGIBILITY', 'ASSIGNMENT')),
    CONSTRAINT ai_retry_queue_status_valid    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED')),
    CONSTRAINT ai_retry_queue_attempts_valid  CHECK (attempts >= 0),
    CONSTRAINT ai_retry_queue_payload_is_obj  CHECK (jsonb_typeof(payload) = 'object')
);

-- One ACTIVE queue entry per issue + stage: a retry storm can never duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS ai_retry_queue_active_issue_stage_uidx
    ON ai_retry_queue (issue_id, stage)
    WHERE status IN ('PENDING', 'PROCESSING');

-- Bucket listing ("what is waiting to be resent"), oldest first so a resend
-- preserves submission order.
CREATE INDEX IF NOT EXISTS ai_retry_queue_status_created_idx
    ON ai_retry_queue (status, created_at ASC);

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS ai_retry_queue_set_updated_at ON ai_retry_queue;

CREATE TRIGGER ai_retry_queue_set_updated_at
    BEFORE UPDATE ON ai_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
