import * as adminTaskDao from '../dao/admin-task.dao.js';
import { enqueueForRetry } from './ai-queue.service.js';
import type {
  AdminWorkItem,
  AdminWorkItemStatus,
  AiFailureCode,
  CreateAdminWorkItemData,
  FailureStage,
} from '../types/admin-task.types.js';
import { logger } from '../utils/logger.js';

/**
 * Admin "My Tasks" work items + AI failure recovery records.
 *
 * Product rule encoded here: an AI/Gemini/LangGraph failure is NEVER treated as
 * an invalid citizen issue. The issue keeps its status (REPORTED or VERIFIED)
 * and an OPEN admin work item is created so a human can intervene. Nothing in
 * this module ever writes to `issues` or `authority_tasks`.
 *
 * Server-side only: failure codes and stages come from backend execution and
 * are never accepted from a request body.
 */

/**
 * Normalises any provider/automation error code into a safe application-level
 * code. Raw Gemini text (quota messages, auth errors, request payloads) never
 * leaves the AI service layer - only these codes are stored or shown.
 */
export const normalizeAiFailure = (rawCode: string): AiFailureCode => {
  const code = rawCode.toUpperCase();
  if (code.includes('TIMEOUT')) return 'AI_SERVICE_TIMEOUT';
  if (code.includes('RATE') || code.includes('QUOTA') || code.includes('LIMIT')) {
    return 'AI_SERVICE_RATE_LIMITED';
  }
  if (code.includes('INVALID') || code.includes('PARSE') || code.includes('OUTPUT')) {
    return 'AI_SERVICE_INVALID_RESPONSE';
  }
  if (code.includes('UNAVAILABLE') || code.includes('CONFIG') || code.includes('AUTH')) {
    return 'AI_SERVICE_UNAVAILABLE';
  }
  return 'AI_SERVICE_ERROR';
};

/** Human-readable Admin-facing wording. No provider jargon, no secrets. */
const failureWording: Record<FailureStage, { title: string; description: string }> = {
  WATCHER: {
    title: 'AI Service Failure',
    description:
      'AI service could not review the submitted issue. Manual review required. This is a system issue, not a problem with the citizen report.',
  },
  BOSS: {
    title: 'AI Service Failure',
    description:
      'AI analysis could not determine assignment requirements. Manual review/assignment required.',
  },
  ELIGIBILITY: {
    title: 'No Eligible Authority',
    description: 'No eligible authority was found for this issue. Manual authority assignment required.',
  },
  ASSIGNMENT: {
    title: 'Assignment Failure',
    description: 'Automatic authority assignment failed. Manual assignment required.',
  },
};

export interface RecordFailureParams {
  issueId: string;
  stage: FailureStage;
  /** Raw internal code from the failing service (logged, never shown raw). */
  rawCode: string;
  /** ELIGIBILITY stage uses its own work-item type, not an AI failure. */
  type?: CreateAdminWorkItemData['type'];
  priority?: CreateAdminWorkItemData['priority'];
}

/**
 * Records a workflow failure as an admin work item. Idempotent per
 * issue + stage (database-level), never throws to the caller: a failure to
 * record a failure must not crash the background workflow.
 */
export const recordWorkflowFailure = async (params: RecordFailureParams): Promise<string | null> => {
  const { issueId, stage } = params;
  const isEligibility = stage === 'ELIGIBILITY';
  const failureCode = isEligibility ? 'NO_ELIGIBLE_AUTHORITY' : normalizeAiFailure(params.rawCode);
  const wording = failureWording[stage];
  const type = params.type ?? (isEligibility ? 'NO_ELIGIBLE_AUTHORITY' : 'AI_SERVICE_FAILURE');

  try {
    const id = await adminTaskDao.createAdminWorkItem({
      issueId,
      type,
      failureStage: stage,
      failureCode,
      title: wording.title,
      description: `${wording.description} (Reason: ${failureCode})`,
      priority: params.priority ?? 'HIGH',
    });

    // null = an active work item for this stage already exists (idempotent retry).
    logger[id ? 'warn' : 'info']('Workflow failure recorded', {
      issueId,
      stage,
      failureCode,
      created: Boolean(id),
    });

    // AI failures also land in the retry bucket: the issue was neither accepted
    // nor rejected, so its material must be resendable by the Admin. A
    // NO_ELIGIBLE_AUTHORITY is a data condition, not a stuck AI decision - it
    // would fail again on resend, so it is board-only.
    if (type === 'AI_SERVICE_FAILURE') {
      await enqueueForRetry({ issueId, stage, failureCode });
    }

    return id;
  } catch (error) {
    logger.error('Failed to record workflow failure', {
      issueId,
      stage,
      failureCode,
      error: error instanceof Error ? error.message : 'unknown error',
    });
    return null;
  }
};

/** Admin My Tasks listing. */
export const listWorkItems = async (status?: string): Promise<AdminWorkItem[]> => {
  const normalized = status?.trim() ? status.trim().toUpperCase() : null;
  return adminTaskDao.findAdminWorkItems(normalized);
};

/** One work item for the admin detail view. */
export const getWorkItem = async (id: string): Promise<AdminWorkItem | null> => {
  return adminTaskDao.findAdminWorkItemById(id);
};

export type { AdminWorkItemStatus };
