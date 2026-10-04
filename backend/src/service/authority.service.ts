import * as issueDao from '../dao/issue.dao.js';
import type { Issue, SafeIssue } from '../models/issue.model.js';
import { toSafeIssue } from '../models/issue.model.js';
import type { AdminIssue } from '../models/issue.model.js';
import { issueIdSchema } from '../validation/admin-issue.schema.js';
import { adminIssueListQuerySchema } from '../validation/admin-issue.schema.js';
import { resolveIssueSchema } from '../validation/workflow.schema.js';
import { ConflictError, NotFoundError } from '../utils/api-error.js';

/**
 * Business layer for the AUTHORITY field workflow:
 *
 *   ASSIGNED --(start)--> IN_PROGRESS --(resolve)--> RESOLVED
 *
 * Responsibilities:
 *  - List the authenticated authority's own tasks (assigned_to = self).
 *  - Move a task one step forward, and only the owner's task: the DAO
 *    guards on `assigned_to`, so another member's id yields "no row updated",
 *    which is reported as a 404 (not a 409) so task ids cannot be probed.
 *  - Parse the optional resolution note here as well as in the route, so the
 *    length / blank rules hold even when called from outside HTTP.
 */

const MAX_LIST_LIMIT = 100;

export interface AuthorityTaskParams {
  issueId: string;
  authorityId: string;
}

export interface ResolveTaskParams extends AuthorityTaskParams {
  body: unknown;
}

const toNotFound = (action: string): NotFoundError =>
  new NotFoundError(`Task not found or not ${action} by you.`, 'TASK_NOT_FOUND');

/** Every task owned by one authority, newest first. */
export const listMyTasks = async (authorityId: string): Promise<SafeIssue[]> => {
  const issues: Issue[] = await issueDao.findIssuesByAssignee(authorityId, MAX_LIST_LIMIT);
  return issues.map(toSafeIssue);
};

/**
 * Every citizen report on the city, newest first, optionally narrowed to one
 * status. This is the read-only browse view for AUTHORITY staff: any issue a
 * citizen reports becomes visible here immediately (REPORTED), then keeps
 * updating through VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED.
 *
 * The payload carries the reporter and assignee names (like the admin
 * review) so field staff have full context; it never carries password
 * hashes or internal file ids - the DAO select list excludes them.
 */
export const browseAllReports = async (query: unknown): Promise<AdminIssue[]> => {
  const { status, limit } = adminIssueListQuerySchema.parse(query ?? {});

  return issueDao.findAllIssues(status ?? null, limit ?? MAX_LIST_LIMIT);
};

/** ASSIGNED -> IN_PROGRESS for the owner's own task. */
export const startTask = async (params: AuthorityTaskParams): Promise<SafeIssue> => {
  const parsedIssueId = issueIdSchema.parse(params.issueId);
  const started = await issueDao.startProgress(parsedIssueId, params.authorityId);

  if (!started) {
    throw toNotFound('assigned to');
  }

  return toSafeIssue(started);
};

/** IN_PROGRESS -> RESOLVED with an optional field note. */
export const resolveTask = async (params: ResolveTaskParams): Promise<SafeIssue> => {
  const parsedIssueId = issueIdSchema.parse(params.issueId);
  const { note } = resolveIssueSchema.parse(params.body ?? {});

  const resolved = await issueDao.resolveIssue(parsedIssueId, params.authorityId, note ?? null);

  if (!resolved) {
    const existing = await issueDao.findIssueById(parsedIssueId);

    if (!existing || existing.assignedTo !== params.authorityId) {
      throw toNotFound('owned');
    }

    throw new ConflictError('Only an IN_PROGRESS task can be resolved.', 'TASK_NOT_RESOLVABLE');
  }

  return toSafeIssue(resolved);
};
