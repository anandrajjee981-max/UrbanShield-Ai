import { z } from 'zod';
import type { ReviewedIssueStatus } from '../../types/issue.types.js';

/**
 * Contract of the Watcher, the first (and currently only) AI node of
 * UrbanShield AI.
 *
 * The Watcher has exactly one responsibility: read a citizen submission and
 * say whether it looks like a genuine civic issue. It never assigns an
 * authority, never calculates workload, never touches a role and never writes
 * to PostgreSQL itself - the backend validates whatever comes out of here and
 * executes the transition through the issue DAO.
 *
 * `decision` is deliberately a closed two value union: the model cannot invent
 * a status, it can only choose ACCEPT or REJECT, and the status each one
 * produces is mapped by `WATCHER_DECISION_STATUS` below.
 */

export const WATCHER_DECISIONS = ['ACCEPT', 'REJECT'] as const;

export type WatcherDecision = (typeof WATCHER_DECISIONS)[number];

/**
 * The only status transitions the Watcher may cause:
 *
 *   ACCEPT -> VERIFIED
 *   REJECT -> REJECTED
 *
 * Both start from REPORTED, which is what `applyWatcherDecision` guards in SQL
 * (`AND status = 'REPORTED'`), so a Watcher run can never overwrite a decision
 * an authority has already taken.
 */
export const WATCHER_DECISION_STATUS: Readonly<Record<WatcherDecision, ReviewedIssueStatus>> = {
  ACCEPT: 'VERIFIED',
  REJECT: 'REJECTED',
};

/**
 * Matches `issues.rejection_reason VARCHAR(500)` (003_add_issue_verification.sql),
 * where the reason of a REJECT decision is stored. The same cap is applied to
 * ACCEPT reasons so one schema governs both.
 */
export const WATCHER_REASON_MAX_LENGTH = 500;

/**
 * Strict schema for the model's structured output.
 *
 * No `.trim()` on purpose: the model is asked for JSON matching this shape and
 * the value is trimmed once, in the node, before it is used. Anything that does
 * not satisfy this schema fails the run - there is no fallback that guesses a
 * decision from free-form text.
 */
export const watcherDecisionSchema = z.object({
  decision: z.enum(WATCHER_DECISIONS, {
    error: `decision must be one of: ${WATCHER_DECISIONS.join(', ')}`,
  }),
  confidence: z
    .number({ error: 'confidence must be a number between 0 and 1' })
    .min(0, 'confidence must be between 0 and 1')
    .max(1, 'confidence must be between 0 and 1'),
  reason: z
    .string({ error: 'reason is required' })
    .min(1, 'reason must not be empty')
    .max(WATCHER_REASON_MAX_LENGTH, `reason must be at most ${WATCHER_REASON_MAX_LENGTH} characters`),
});

export type WatcherDecisionOutput = z.infer<typeof watcherDecisionSchema>;

/**
 * Why a Watcher run produced no decision. Returned to the caller (and logged),
 * never to the citizen: the API response of the issue creation endpoint does
 * not change when the Watcher is unavailable.
 *
 * The cases are kept apart on purpose so a log line tells an operator what
 * actually happened without reading a stack trace. Every one of them leaves the
 * issue exactly as it was - REPORTED.
 *
 * - `WATCHER_UNAVAILABLE`    provider missing, unreachable or errored
 * - `WATCHER_TIMEOUT`        the node exceeded WATCHER_TIMEOUT_MS
 * - `WATCHER_INVALID_OUTPUT` model output did not satisfy the schema
 * - `ISSUE_NOT_FOUND`        the issue id does not exist (nothing was written)
 * - `ISSUE_NOT_PENDING`      the issue is no longer REPORTED - already decided
 *                            by an authority or by an earlier Watcher run, and
 *                            therefore never overwritten
 */
export const WATCHER_ERROR_CODES = [
  'WATCHER_UNAVAILABLE',
  'WATCHER_RATE_LIMITED',
  'WATCHER_TIMEOUT',
  'WATCHER_INVALID_OUTPUT',
  'ISSUE_NOT_FOUND',
  'ISSUE_NOT_PENDING',
] as const;

export type WatcherErrorCode = (typeof WATCHER_ERROR_CODES)[number];

/**
 * Outcome of one Watcher execution.
 *
 * A failure is always a controlled value, never a thrown error: the caller is
 * a background trigger, so there is nobody to hand an exception to. On failure
 * the issue stays exactly where it was (REPORTED) - the Watcher never
 * auto-rejects and never auto-verifies.
 */
export type WatcherRunResult =
  | {
      success: true;
      issueId: string;
      decision: WatcherDecision;
      confidence: number;
      reason: string;
      status: ReviewedIssueStatus;
    }
  | {
      success: false;
      issueId: string;
      error: WatcherErrorCode;
    };

/**
 * Thrown by the Watcher node when the model's answer does not satisfy
 * `watcherDecisionSchema`, so the service can report `WATCHER_INVALID_OUTPUT`
 * instead of the generic provider failure.
 */
export class WatcherInvalidOutputError extends Error {
  constructor(message = 'Watcher model output failed validation') {
    super(message);
    this.name = 'WatcherInvalidOutputError';
  }
}
