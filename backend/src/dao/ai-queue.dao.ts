import { query } from '../config/db.js';
import type {
  EnqueueRetryParams,
  RetryQueueEntry,
  RetryQueuePayload,
  RetryQueueStage,
} from '../types/ai-queue.types.js';
import { INITIAL_RETRY_QUEUE_STATUS } from '../types/ai-queue.types.js';

/**
 * Database access for `ai_retry_queue`. SQL and row mapping only - the enqueue
 * decision lives in the workflow, and the resend loop lives in the service.
 */

const QUEUE_COLUMNS =
  'id, issue_id, stage, failure_code, payload, status, attempts, last_attempt_at, created_at, updated_at';

interface RetryQueueRow {
  id: string;
  issue_id: string;
  stage: RetryQueueStage;
  failure_code: string | null;
  payload: RetryQueuePayload;
  status: RetryQueueEntry['status'];
  attempts: number;
  last_attempt_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

const toEntry = (row: RetryQueueRow): RetryQueueEntry => ({
  id: row.id,
  issueId: row.issue_id,
  stage: row.stage,
  failureCode: row.failure_code,
  payload: row.payload,
  status: row.status,
  attempts: row.attempts,
  lastAttemptAt: row.last_attempt_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Queues the stuck material for a resend.
 *
 * Idempotent through the partial unique index `ai_retry_queue_active_issue_stage_uidx`:
 * a repeated failure of the same issue at the same stage is a no-op (returns
 * null) instead of duplicating the bucket. A COMPLETED row does not occupy the
 * slot, so a genuinely new failure queues again.
 *
 * The payload is the public issue snapshot - if the issue row is gone (deleted
 * citizen account cascaded), there is no material left to resend and the
 * insert is skipped.
 */
export const enqueueRetryEntry = async (
  params: EnqueueRetryParams,
  payload: RetryQueuePayload,
): Promise<string | null> => {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO ai_retry_queue (issue_id, stage, failure_code, payload, status)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (issue_id, stage)
       WHERE status IN ('PENDING', 'PROCESSING')
       DO NOTHING
     RETURNING id`,
    [params.issueId, params.stage, params.failureCode, JSON.stringify(payload), INITIAL_RETRY_QUEUE_STATUS],
  );

  return rows[0]?.id ?? null;
};

/** Bucket listing for the Admin: oldest first (resend honours submission order). */
export const findRetryEntries = async (status: string | null): Promise<RetryQueueEntry[]> => {
  const { rows } = await query<RetryQueueRow>(
    `SELECT ${QUEUE_COLUMNS}
     FROM ai_retry_queue
     WHERE ($1::text IS NULL OR status = $1)
     ORDER BY created_at ASC
     LIMIT 500`,
    [status],
  );

  return rows.map(toEntry);
};

/**
 * Atomically claims the whole PENDING bucket for one resend pass: every row is
 * flipped to PROCESSING and returned, so two concurrent resends can never run
 * the same issue twice - the second caller simply claims nothing.
 */
export const claimPendingEntries = async (): Promise<RetryQueueEntry[]> => {
  const { rows } = await query<RetryQueueRow>(
    `UPDATE ai_retry_queue
        SET status = 'PROCESSING', last_attempt_at = NOW(), attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM ai_retry_queue
         WHERE status = 'PENDING'
         ORDER BY created_at ASC
         LIMIT 200
         FOR UPDATE SKIP LOCKED
      )
      RETURNING ${QUEUE_COLUMNS}`,
  );

  return rows.map(toEntry);
};

/** The pipeline finished with this entry: assigned, rejected or stopped. */
export const markRetryEntryCompleted = async (id: string): Promise<void> => {
  await query(`UPDATE ai_retry_queue SET status = 'COMPLETED' WHERE id = $1`, [id]);
};

/** The pipeline failed again: back to PENDING so the next resend picks it up. */
export const markRetryEntryFailed = async (id: string): Promise<void> => {
  await query(`UPDATE ai_retry_queue SET status = 'PENDING' WHERE id = $1`, [id]);
};

/**
 * Recovers entries abandoned by a crashed/restarted resend pass: rows stuck in
 * PROCESSING with no attempt for over 10 minutes go back to PENDING. Run at
 * the start of every drain so a half-finished pass can never wedge the bucket.
 */
export const requeueStaleProcessingEntries = async (): Promise<number> => {
  const { rows } = await query<{ id: string }>(
    `UPDATE ai_retry_queue
        SET status = 'PENDING'
      WHERE status = 'PROCESSING'
        AND last_attempt_at < NOW() - INTERVAL '10 minutes'
      RETURNING id`,
  );

  return rows.length;
};
