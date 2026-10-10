-- UrbanShield AI :: 009_extend_authority_tasks
-- "My Tasks" for Authority: title / priority / due date / assigner /
-- completion + comments. Purely additive - existing rows keep working.
--
-- What the Admin "assign" flow and the Authority panel need that 006 lacks:
--   title, priority, due_date, assigned_by, completed_at, rejection/work notes.
-- Comments live in their own table so the task row stays small.

ALTER TABLE authority_tasks
  ADD COLUMN IF NOT EXISTS title            VARCHAR(300),
  ADD COLUMN IF NOT EXISTS priority         VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS due_date        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by     UUID REFERENCES users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS work_notes      TEXT,
  ADD COLUMN IF NOT EXISTS proof_image_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'authority_tasks_priority_valid'
  ) THEN
    ALTER TABLE authority_tasks
      ADD CONSTRAINT authority_tasks_priority_valid
      CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'));
  END IF;
END $$;

-- Backfill human-readable titles for auto-assigned rows (issue description head).
UPDATE authority_tasks
SET title = LEFT(
  COALESCE(
    (SELECT description FROM issues WHERE issues.id = authority_tasks.issue_id),
    'Field task'
  ),
  120
)
WHERE title IS NULL;

CREATE INDEX IF NOT EXISTS authority_tasks_due_idx
  ON authority_tasks (authority_application_id, status, due_date ASC NULLS LAST);

CREATE TABLE IF NOT EXISTS authority_task_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES authority_tasks (id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  author_role VARCHAR(20) NOT NULL DEFAULT 'AUTHORITY',
  body        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT authority_task_comments_body_not_blank CHECK (BTRIM(body) <> ''),
  CONSTRAINT authority_task_comments_body_len CHECK (CHAR_LENGTH(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS authority_task_comments_task_idx
  ON authority_task_comments (task_id, created_at ASC);

-- set_updated_at() is created (idempotently) by 001_create_users.sql.
DROP TRIGGER IF EXISTS authority_tasks_set_updated_at ON authority_tasks;

CREATE TRIGGER authority_tasks_set_updated_at
  BEFORE UPDATE ON authority_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
