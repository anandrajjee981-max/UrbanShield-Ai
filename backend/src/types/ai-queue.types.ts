/**
 * AI retry bucket (internal message queue).
 *
 * Holds the issue material that the pipeline could NOT decide on - the Watcher
 * neither accepted nor rejected it because the AI service was unavailable,
 * timed out or was rate limited. The Admin resends the bucket, and each entry
 * is pushed back through the same Watcher -> Boss -> Assignment workflow.
 *
 * Rules:
 *  - `payload` is a snapshot of PUBLIC issue fields only (type, description,
 *    image, location). No user ids, no tokens, no raw provider responses.
 *  - `failureCode` is a normalised AI_FAILURE_CODES value, never provider text.
 *  - This is a queue, not a board: status moves PENDING -> PROCESSING ->
 *    COMPLETED while draining, and a still-failing entry returns to PENDING
 *    with attempts + 1. The Admin board is `admin_work_items`.
 */

export const RETRY_QUEUE_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED'] as const;

export type RetryQueueStatus = (typeof RETRY_QUEUE_STATUSES)[number];

export const INITIAL_RETRY_QUEUE_STATUS = 'PENDING' satisfies RetryQueueStatus;

/** Stages that can block the pipeline and therefore be queued for a resend. */
export const RETRY_QUEUE_STAGES = ['WATCHER', 'BOSS', 'ELIGIBILITY', 'ASSIGNMENT'] as const;

export type RetryQueueStage = (typeof RETRY_QUEUE_STAGES)[number];

/**
 * The stuck material: exactly what the pipeline needs to re-run, and what the
 * Admin sees in the bucket. Mirrors the public issue shape - deliberately no
 * `userId` and no verification metadata.
 */
export interface RetryQueuePayload {
  issueId: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  locationType: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  /** Issue status at the time of the failure (REPORTED after a Watcher fail). */
  issueStatus: string;
}

export interface EnqueueRetryParams {
  issueId: string;
  stage: RetryQueueStage;
  failureCode: string | null;
}

export interface RetryQueueEntry {
  id: string;
  issueId: string;
  stage: RetryQueueStage;
  failureCode: string | null;
  payload: RetryQueuePayload;
  status: RetryQueueStatus;
  attempts: number;
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Outcome of one resend pass over the bucket. */
export interface RetryQueueDrainResult {
  claimed: number;
  /** Entries whose pipeline run finished for good (assigned / rejected / stopped). */
  completed: number;
  /** Entries that failed again and went back to PENDING for the next resend. */
  requeued: number;
}
