import { runWatcher } from './watcher.service.js';
import { runBoss } from './boss.service.js';
import type { BossDecision } from '../types/boss.types.js';
import { assignIssueWithDecision } from '../../service/assignment.service.js';
import * as issueDao from '../../dao/issue.dao.js';
import * as aiQueueDao from '../../dao/ai-queue.dao.js';
import * as adminTaskDao from '../../dao/admin-task.dao.js';
import { recordWorkflowFailure } from '../../service/admin-task.service.js';
import type { AssignmentErrorCode } from '../../types/assignment.types.js';
import type { RetryQueueDrainResult } from '../../types/ai-queue.types.js';
import { logger } from '../../utils/logger.js';

/**
 * Background issue workflow: Watcher -> Boss -> Assignment, with failure
 * recovery.
 *
 * Product rules encoded here:
 *   - An AI failure NEVER rejects or verifies an issue blindly. The issue keeps
 *     its status and an OPEN admin work item is created so a human can handle
 *     it. AI failure means "the system could not process this issue", never
 *     "the citizen submitted an invalid issue".
 *   - "No eligible authority" is NOT an AI failure: it gets its own work-item
 *     type (NO_ELIGIBLE_AUTHORITY).
 *   - Boss runs exactly ONCE per workflow: its decision is passed straight into
 *     `assignIssueWithDecision`, so Gemini is never called twice.
 *   - The whole pipeline is fire-and-forget: it never throws to the caller and
 *     never affects the citizen's POST /api/issues response.
 *
 * No public endpoint: this module is triggered from issue creation only.
 */

export type WorkflowStage = 'WATCHER' | 'BOSS' | 'ASSIGNMENT';

export interface WorkflowResult {
  issueId: string;
  stage: WorkflowStage;
  outcome:
    | 'WATCHER_REJECTED'
    | 'ASSIGNED'
    | 'ALREADY_ASSIGNED'
    | 'WORK_ITEM_CREATED'
    | 'STOPPED';
  detail?: string;
}

/** Assignment failures that are automation/DB problems worth an admin item. */
const ASSIGNMENT_FAILURE_CODES: readonly AssignmentErrorCode[] = [
  'ROUND_ROBIN_ERROR',
  'TASK_CREATION_FAILED',
  'ASSIGNMENT_DB_ERROR',
  'BOSS_UNAVAILABLE',
  'BOSS_RATE_LIMITED',
  'BOSS_TIMEOUT',
  'BOSS_INVALID_OUTPUT',
];

export const runWorkflow = async (issueId: string): Promise<WorkflowResult> => {
  // ---- Stage 1: Watcher -------------------------------------------------
  const watcher = await runWatcher(issueId);

  if (!watcher.success) {
    if (watcher.error === 'ISSUE_NOT_FOUND') {
      // Not an AI failure: nothing to recover, stop quietly.
      return { issueId, stage: 'WATCHER', outcome: 'STOPPED', detail: watcher.error };
    }

    if (watcher.error === 'ISSUE_NOT_PENDING') {
      // The issue left REPORTED before this run. Resume from the right stage
      // instead of stopping: a VERIFIED issue still needs Boss + assignment
      // (this happens when a workflow is retried after a partial run), and a
      // REJECTED one is finished. The status decides - never the AI.
      const issue = await issueDao.findIssueById(issueId);
      if (issue?.status !== 'VERIFIED') {
        return { issueId, stage: 'WATCHER', outcome: 'STOPPED', detail: watcher.error };
      }
      logger.info('Workflow resuming at Boss: issue already VERIFIED', { issueId });
    } else {
      // AI failure: issue STAYS REPORTED, admin handles it manually.
      await recordWorkflowFailure({ issueId, stage: 'WATCHER', rawCode: watcher.error });
      return { issueId, stage: 'WATCHER', outcome: 'WORK_ITEM_CREATED', detail: watcher.error };
    }
  } else if (watcher.decision === 'REJECT') {
    // A validated Watcher decision, not a failure: issue is REJECTED. Stop.
    // Watcher did its job, so any WATCHER work item is obsolete.
    await adminTaskDao.resolveActiveWorkItem(issueId, 'WATCHER').catch(() => 0);
    return { issueId, stage: 'WATCHER', outcome: 'WATCHER_REJECTED' };
  }

  // ACCEPT -> issue is VERIFIED (or already was). Continue.

  // Self-healing: a WATCHER work item exists only because Watcher could not
  // run. Now that it has (or the issue was already verified), that item is
  // done - close it, or the Admin board keeps showing a stale task. Same rule
  // applies after Boss below.
  await adminTaskDao.resolveActiveWorkItem(issueId, 'WATCHER').catch(() => 0);

  // ---- Stage 2: Boss (once) --------------------------------------------
  const boss = await runBoss(issueId);

  if (!boss.success || !boss.decision) {
    if (boss.error === 'ISSUE_NOT_FOUND' || boss.error === 'BOSS_REQUIRES_VERIFIED_ISSUE') {
      return { issueId, stage: 'BOSS', outcome: 'STOPPED', detail: boss.error };
    }

    // AI failure: issue STAYS VERIFIED, admin assigns manually.
    await recordWorkflowFailure({
      issueId,
      stage: 'BOSS',
      rawCode: boss.error ?? 'AI_SERVICE_ERROR',
    });
    return { issueId, stage: 'BOSS', outcome: 'WORK_ITEM_CREATED', detail: boss.error };
  }

  const decision: BossDecision = boss.decision;

  // Boss produced a decision: any BOSS work item is now obsolete.
  await adminTaskDao.resolveActiveWorkItem(issueId, 'BOSS').catch(() => 0);

  // ---- Stage 3: Assignment (eligibility + round robin + task) ----------
  const assignment = await assignIssueWithDecision(issueId, decision);

  if (assignment.success) {
    // Assignment went through: close the ASSIGNMENT item too (a previous
    // attempt may have failed and left one open).
    await adminTaskDao.resolveActiveWorkItem(issueId, 'ASSIGNMENT').catch(() => 0);
    return { issueId, stage: 'ASSIGNMENT', outcome: 'ASSIGNED', detail: assignment.assignmentId };
  }

  switch (assignment.error) {
    case 'ALREADY_ASSIGNED':
      // Another path already created the task: not a failure, no work item.
      await adminTaskDao.resolveActiveWorkItem(issueId, 'ASSIGNMENT').catch(() => 0);
      return { issueId, stage: 'ASSIGNMENT', outcome: 'ALREADY_ASSIGNED' };

    case 'NO_ELIGIBLE_AUTHORITY':
      // AI succeeded, nobody matched: distinct work-item type.
      await recordWorkflowFailure({ issueId, stage: 'ELIGIBILITY', rawCode: 'NO_ELIGIBLE_AUTHORITY' });
      return { issueId, stage: 'ASSIGNMENT', outcome: 'WORK_ITEM_CREATED', detail: 'NO_ELIGIBLE_AUTHORITY' };

    case 'ISSUE_NOT_FOUND':
    case 'ISSUE_NOT_VERIFIED':
      return { issueId, stage: 'ASSIGNMENT', outcome: 'STOPPED', detail: assignment.error };

    default:
      // ROUND_ROBIN_ERROR / TASK_CREATION_FAILED / ASSIGNMENT_DB_ERROR / ...
      if (ASSIGNMENT_FAILURE_CODES.includes(assignment.error)) {
        await recordWorkflowFailure({
          issueId,
          stage: 'ASSIGNMENT',
          rawCode: assignment.error,
          type: 'ASSIGNMENT_FAILURE',
        });
        return { issueId, stage: 'ASSIGNMENT', outcome: 'WORK_ITEM_CREATED', detail: assignment.error };
      }
      return { issueId, stage: 'ASSIGNMENT', outcome: 'STOPPED', detail: assignment.error };
  }
};

/**
 * Fire-and-forget entry point. Swallows every rejection: an unhandled promise
 * rejection in a background workflow must never crash the server, and the
 * citizen's request has already been answered with 201.
 */
export const triggerWorkflow = (issueId: string): void => {
  void runWorkflow(issueId)
    .then((result) => {
      logger.info('Workflow finished', {
        issueId: result.issueId,
        stage: result.stage,
        outcome: result.outcome,
        detail: result.detail,
      });
    })
    .catch((error: unknown) => {
      // Belt and braces: normalise the unexpected into an admin work item too,
      // so a bug in the pipeline is visible to the admin instead of being lost.
      logger.error('Workflow crashed', {
        issueId,
        error: error instanceof Error ? error.message : 'unknown error',
      });
      void recordWorkflowFailure({
        issueId,
        stage: 'ASSIGNMENT',
        rawCode: error instanceof Error ? error.message : 'AI_SERVICE_ERROR',
        type: 'ASSIGNMENT_FAILURE',
      }).catch(() => undefined);
    });
};

/**
 * Admin "resend bucket": drains the AI retry queue back through the pipeline.
 *
 * One pass claims the whole PENDING bucket atomically (FOR UPDATE SKIP LOCKED,
 * so two concurrent resends never run the same issue twice), runs each entry
 * through `runWorkflow` sequentially - one Gemini call at a time, which also
 * respects the free-tier quota - and then:
 *
 *   outcome finished for good (ASSIGNED / REJECTED / ALREADY_ASSIGNED / STOPPED)
 *     -> entry marked COMPLETED, it leaves the bucket
 *   outcome WORK_ITEM_CREATED again (AI still down, still no authority)
 *     -> entry goes back to PENDING with attempts already +1, so the next
 *        resend picks it up; NO_ELIGIBLE_AUTHORITY is data, not a stuck AI
 *        decision, so it completes instead of looping forever
 *
 * Never rejects: a failure of the drain itself is logged and reported as a
 * zero-count result, because there is nobody to hand an exception to.
 */
export const resendRetryBucket = async (): Promise<RetryQueueDrainResult> => {
  const result: RetryQueueDrainResult = { claimed: 0, completed: 0, requeued: 0 };

  try {
    // Recover anything a previous (crashed) pass left half-done first.
    const recovered = await aiQueueDao.requeueStaleProcessingEntries();
    if (recovered > 0) {
      logger.warn('Retry bucket: recovered stale PROCESSING entries', { count: recovered });
    }

    const entries = await aiQueueDao.claimPendingEntries();
    result.claimed = entries.length;

    if (entries.length === 0) {
      logger.info('Retry bucket resend: nothing to send');
      return result;
    }

    logger.info('Retry bucket resend started', { count: entries.length });

    for (const entry of entries) {
      try {
        const outcome = await runWorkflow(entry.issueId);
        const stillStuck = outcome.outcome === 'WORK_ITEM_CREATED' && outcome.detail !== 'NO_ELIGIBLE_AUTHORITY';

        if (stillStuck) {
          await aiQueueDao.markRetryEntryFailed(entry.id);
          result.requeued += 1;
        } else {
          await aiQueueDao.markRetryEntryCompleted(entry.id);
          result.completed += 1;

          // The pipeline got past this stage, so the work item that existed
          // only because it could not run is now done - close it, otherwise
          // the Admin board keeps showing a task that no longer needs a human.
          // NO_ELIGIBLE_AUTHORITY keeps its work item: a human still assigns.
          if (outcome.outcome !== 'WORK_ITEM_CREATED') {
            await adminTaskDao.resolveActiveWorkItem(entry.issueId, entry.stage).catch(() => 0);
          }
        }

        logger.info('Retry bucket entry processed', {
          entryId: entry.id,
          issueId: entry.issueId,
          attempts: entry.attempts,
          stage: outcome.stage,
          outcome: outcome.outcome,
          detail: outcome.detail,
        });
      } catch (error) {
        // One bad entry must not abort the rest of the bucket.
        await aiQueueDao.markRetryEntryFailed(entry.id).catch(() => undefined);
        result.requeued += 1;
        logger.error('Retry bucket entry crashed', {
          entryId: entry.id,
          issueId: entry.issueId,
          error: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    logger.info('Retry bucket resend finished', { ...result });
    return result;
  } catch (error) {
    logger.error('Retry bucket resend failed', {
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return result;
  }
};
