/**
 * Admin "My Tasks" work items.
 *
 * These are ADMIN work items, never authority tasks: an AI failure work item
 * means "the system could not automatically process this issue", NOT "the
 * citizen submitted an invalid issue". The issue itself keeps its status
 * (REPORTED after a Watcher failure, VERIFIED after Boss/assignment failures)
 * and stays available for manual handling.
 *
 * `failureCode` is always a normalised, provider-agnostic code from
 * `AI_FAILURE_CODES` - raw Gemini/LangGraph errors and secrets never reach
 * this table or the Admin UI.
 */

export const ADMIN_WORK_ITEM_TYPES = [
  'AI_SERVICE_FAILURE',
  'NO_ELIGIBLE_AUTHORITY',
  'ASSIGNMENT_FAILURE',
] as const;

export type AdminWorkItemType = (typeof ADMIN_WORK_ITEM_TYPES)[number];

export const ADMIN_WORK_ITEM_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;

export type AdminWorkItemStatus = (typeof ADMIN_WORK_ITEM_STATUSES)[number];

export const INITIAL_ADMIN_WORK_ITEM_STATUS = 'OPEN' satisfies AdminWorkItemStatus;

export const ADMIN_WORK_ITEM_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;

export type AdminWorkItemPriority = (typeof ADMIN_WORK_ITEM_PRIORITIES)[number];

/** Which pipeline stage produced the work item. Drives idempotency. */
export const FAILURE_STAGES = ['WATCHER', 'BOSS', 'ELIGIBILITY', 'ASSIGNMENT'] as const;

export type FailureStage = (typeof FAILURE_STAGES)[number];

/**
 * Safe, human-readable failure reasons shown to the Admin. Provider errors
 * (Gemini quota, auth, parsing, network) are normalised into one of these
 * before storage so no raw provider text or secret can leak.
 */
export const AI_FAILURE_CODES = [
  'AI_SERVICE_UNAVAILABLE',
  'AI_SERVICE_TIMEOUT',
  'AI_SERVICE_RATE_LIMITED',
  'AI_SERVICE_INVALID_RESPONSE',
  'AI_SERVICE_ERROR',
] as const;

export type AiFailureCode = (typeof AI_FAILURE_CODES)[number];

export interface CreateAdminWorkItemData {
  issueId: string;
  type: AdminWorkItemType;
  failureStage: FailureStage;
  failureCode: string | null;
  title: string;
  description: string;
  priority: AdminWorkItemPriority;
}

export interface AdminWorkItem {
  id: string;
  issueId: string;
  failureStage: FailureStage;
  failureCode: string | null;
  type: AdminWorkItemType;
  title: string;
  description: string;
  status: AdminWorkItemStatus;
  priority: AdminWorkItemPriority;
  createdAt: Date;
  updatedAt: Date;
}
