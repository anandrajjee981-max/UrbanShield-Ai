import { NodeTimeoutError } from '@langchain/langgraph';
import { env } from '../../config/env.js';
import * as issueDao from '../../dao/issue.dao.js';
import type { Issue } from '../../models/issue.model.js';
import { REVIEWABLE_ISSUE_STATUS } from '../../types/issue.types.js';
import { logger } from '../../utils/logger.js';
import { watcherGraph } from '../graph/watcher.graph.js';
import type { WatcherState } from '../graph/watcher.state.js';
import { WatcherInvalidOutputError, WATCHER_DECISION_STATUS } from '../types/watcher.types.js';
import type { WatcherErrorCode, WatcherRunResult } from '../types/watcher.types.js';

/**
 * Executes the Watcher workflow for one issue.
 *
 * This is the only place LangGraph is run, and it sits between the Express
 * controller and the DAO so neither of them ever sees a model, a prompt or a
 * graph:
 *
 *   load issue -> build Watcher state -> run LangGraph -> validate result
 *     -> apply the transition through the issue DAO -> return the outcome
 *
 * Rules enforced here:
 *  - The LLM never reaches PostgreSQL. The decision comes back as data, the
 *    status is written by `issueDao.applyWatcherDecision`, and only from the
 *    REPORTED state (guarded in SQL).
 *  - Nothing ever throws out of this module. A failure is a controlled
 *    `{ success: false, error }` value plus a server side log, so a provider
 *    outage can neither fail the citizen's report nor move an issue: the row
 *    simply stays REPORTED.
 *  - No sensitive data is logged. Provider messages are redacted before they
 *    reach the logger, and the state built below carries no user identity.
 */

const failed = (issueId: string, error: WatcherErrorCode): WatcherRunResult => ({
  success: false,
  issueId,
  error,
});

/**
 * Civic content only. `userId`, the reporter's name, email, tokens and the
 * ImageKit file id are deliberately not copied, so they can never reach the
 * prompt even by accident.
 */
const toWatcherState = (issue: Issue): WatcherState => ({
  issueId: issue.id,
  issueType: issue.issueType,
  description: issue.description,
  locationType: issue.locationType,
  latitude: issue.latitude,
  longitude: issue.longitude,
  address: issue.address,
  imageUrl: issue.imageUrl,
  decision: null,
  confidence: null,
  reason: null,
});

/**
 * Error text that is safe to log: the configured API key is removed from the
 * message, so a provider error that echoes the key back can never be written
 * to the log.
 */
const redact = (error: unknown): string => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const apiKey = env.OPENROUTER_API_KEY;

  return apiKey ? message.split(apiKey).join('[redacted]') : message;
};

/**
 * Walks the `cause` chain, which is where LangGraph parks the error that
 * actually ended a node run.
 */
const isTimeoutError = (error: unknown, depth = 0): boolean => {
  if (depth > 5 || !(error instanceof Error)) return false;
  if (error instanceof NodeTimeoutError || error.name === 'NodeTimeoutError') return true;

  return isTimeoutError(error.cause, depth + 1);
};

/**
 * OpenRouter reports an exhausted rate limit as a 429 with "quota"/"limit"
 * text on the wrapped error. Walking the cause chain keeps it from being
 * reported as a generic provider failure, so the admin work item reads
 * AI_SERVICE_RATE_LIMITED instead.
 */
const isRateLimitError = (error: unknown, depth = 0): boolean => {
  if (depth > 5 || !(error instanceof Error)) return false;
  const message = error.message.toUpperCase();
  if (
    error.message.includes('429') ||
    message.includes('QUOTA') ||
    message.includes('RATE LIMIT') ||
    message.includes('EXCEEDED YOUR CURRENT QUOTA')
  ) {
    return true;
  }
  return isRateLimitError(error.cause, depth + 1);
};

/**
 * Maps a failure of the graph run onto its own error code, so a timeout is
 * never reported as a generic provider failure. Invalid model output keeps its
 * own code because it is a model quality problem, not an availability one.
 */
const classifyRunError = (error: unknown): WatcherErrorCode => {
  if (error instanceof WatcherInvalidOutputError) return 'WATCHER_INVALID_OUTPUT';
  if (isTimeoutError(error)) return 'WATCHER_TIMEOUT';
  if (isRateLimitError(error)) return 'WATCHER_RATE_LIMITED';

  return 'WATCHER_UNAVAILABLE';
};

/**
 * Runs the full Watcher flow for one issue and returns its outcome.
 *
 * Never rejects: every failure path returns `{ success: false, error }` after
 * logging, because the caller is a fire-and-forget trigger with nobody to
 * catch an exception.
 */
export const runWatcher = async (issueId: string): Promise<WatcherRunResult> => {
  try {
    if (!env.OPENROUTER_API_KEY) {
      // Config problem, not a code problem: the issue simply stays REPORTED.
      logger.warn('Watcher unavailable: no AI API key configured', { issueId });
      return failed(issueId, 'WATCHER_UNAVAILABLE');
    }

    logger.info('Watcher started', { issueId });

    const issue = await issueDao.findIssueById(issueId);

    if (!issue) {
      return failed(issueId, 'ISSUE_NOT_FOUND');
    }

    if (issue.status !== REVIEWABLE_ISSUE_STATUS) {
      // Already decided (by an authority or by an earlier Watcher run).
      logger.info('Watcher skipped: issue is not awaiting review', {
        issueId,
        status: issue.status,
      });
      return failed(issueId, 'ISSUE_NOT_PENDING');
    }

    let finalState: WatcherState;

    try {
      finalState = await watcherGraph.invoke(toWatcherState(issue));
    } catch (error) {
      const code = classifyRunError(error);
      logger.error('Watcher AI run failed', { issueId, error: code, detail: redact(error) });
      return failed(issueId, code);
    }

    const { decision, confidence, reason } = finalState;

    if (decision === null || confidence === null || reason === null) {
      // Unreachable: the node only returns once it produced all three.
      logger.error('Watcher graph finished without a decision', { issueId });
      return failed(issueId, 'WATCHER_INVALID_OUTPUT');
    }

    const status = WATCHER_DECISION_STATUS[decision];

    const updated = await issueDao.applyWatcherDecision(
      issue.id,
      status,
      decision === 'REJECT' ? reason : null,
    );

    if (!updated) {
      // The issue stopped being REPORTED between the read and the update.
      logger.info('Watcher decision not applied: issue already processed', { issueId, decision });
      return failed(issueId, 'ISSUE_NOT_PENDING');
    }

    logger.info('Watcher decided', { issueId, decision, confidence, status });

    return { success: true, issueId, decision, confidence, reason, status };
  } catch (error) {
    logger.error('Watcher execution failed', { issueId, detail: redact(error) });
    return failed(issueId, 'WATCHER_UNAVAILABLE');
  }
};

/**
 * Fire-and-forget trigger used by the issue creation flow.
 *
 * The API answers as soon as the row is written; the Watcher then decides in
 * the background, so a slow or dead provider can never delay or fail a
 * citizen's report. The outcome is logged, never returned anywhere - on any
 * failure the issue simply stays REPORTED.
 */
export const triggerWatcher = (issueId: string): void => {
  void runWatcher(issueId)
    .then((result) => {
      if (!result.success) {
        logger.warn('Watcher produced no decision', { issueId, error: result.error });
      }
    })
    .catch((error: unknown) => {
      // Unreachable (runWatcher does not throw); kept so a future change can
      // never create an unhandled rejection on a background request.
      logger.error('Watcher trigger failed', { issueId, detail: redact(error) });
    });
};
