import * as aiQueueDao from '../dao/ai-queue.dao.js';
import * as issueDao from '../dao/issue.dao.js';
import type { EnqueueRetryParams, RetryQueueEntry, RetryQueuePayload } from '../types/ai-queue.types.js';
import { logger } from '../utils/logger.js';

/**
 * AI retry bucket (message queue) - enqueue and listing.
 *
 * This is the "stuck material" store: when Watcher/Boss could not decide
 * (AI unavailable, timeout, quota), the issue is neither accepted nor rejected.
 * Its public content is snapshotted here so the Admin can resend the bucket
 * through the same pipeline instead of asking the citizen to re-report.
 *
 * The resend loop (`resendRetryBucket`) lives in the workflow service, which
 * owns `runWorkflow` - keeping this module free of any import back into the
 * pipeline avoids a cycle.
 *
 * Never throws: failing to queue a failure must not break the workflow that is
 * already handling that failure.
 */

/** Public issue fields only - no userId, no verification metadata, no secrets. */
const toPayload = (issue: NonNullable<Awaited<ReturnType<typeof issueDao.findIssueById>>>): RetryQueuePayload => ({
  issueId: issue.id,
  issueType: issue.issueType,
  description: issue.description,
  imageUrl: issue.imageUrl,
  locationType: issue.locationType,
  latitude: issue.latitude,
  longitude: issue.longitude,
  address: issue.address,
  issueStatus: issue.status,
});

/**
 * Snapshots the stuck issue into the bucket. Idempotent per issue + stage, so
 * a retry storm (repeated AI failures) produces exactly one entry.
 */
export const enqueueForRetry = async (params: EnqueueRetryParams): Promise<string | null> => {
  try {
    const issue = await issueDao.findIssueById(params.issueId);
    if (!issue) {
      // Nothing to resend: the material is gone.
      logger.warn('Retry bucket skip: issue not found', { issueId: params.issueId, stage: params.stage });
      return null;
    }

    const id = await aiQueueDao.enqueueRetryEntry(params, toPayload(issue));
    // null = an active entry for this issue + stage already exists.
    logger[id ? 'warn' : 'info']('Retry bucket entry', {
      issueId: params.issueId,
      stage: params.stage,
      failureCode: params.failureCode,
      created: Boolean(id),
    });
    return id;
  } catch (error) {
    logger.error('Failed to enqueue retry entry', {
      issueId: params.issueId,
      stage: params.stage,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return null;
  }
};

/** Bucket listing for the Admin. Default view: what is waiting to be resent. */
export const listQueue = async (status?: string): Promise<RetryQueueEntry[]> => {
  const trimmed = status?.trim().toUpperCase() ?? '';
  return aiQueueDao.findRetryEntries(trimmed || null);
};

export type { RetryQueueEntry };
