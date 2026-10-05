import * as issueDao from '../dao/issue.dao.js';
import type { MonitoredIssue } from '../models/issue.model.js';
import { ISSUE_LIST_MAX_LIMIT, issueIdSchema, issueListQuerySchema } from '../validation/issue-review.schema.js';
import { NotFoundError } from '../utils/api-error.js';

/**
 * Business layer for the admin side of the issue workflow, which is *monitoring*
 * only:
 *
 *   GET /api/admin/issues            the issue queue, read-only
 *   GET /api/admin/issues/:issueId   one issue, read-only
 *
 * What used to live here - REPORTED -> VERIFIED and REPORTED -> REJECTED - now
 * belongs to a verified authority (src/service/authority-issue.service.ts). There
 * is deliberately no `verifyIssue` or `rejectIssue` export and no status write of
 * any kind in this file, so "an admin cannot verify an issue" is not a rule this
 * layer has to remember: there is no code path that could do it.
 *
 * Authorisation is settled at the route (`authenticate` + `requireRole('ADMIN')`).
 * This service only decides what a reader may see, and 404s an id that does not
 * exist.
 *
 * Nothing else belongs here: no SQL (that is the DAO), no HTTP concerns (that is
 * the controller), and no AI analysis, effort estimation, assignment or
 * workforce logic.
 */

/** Ceiling for one admin dashboard page. */
const MAX_LIST_LIMIT = ISSUE_LIST_MAX_LIMIT;

/**
 * The raw query object as Express hands it over (`ParsedQs`), so this service can
 * re-parse it with `issueListQuerySchema`.
 *
 * The values stay `unknown` on purpose: the schema, not the type, decides what a
 * valid `status` or `limit` is.
 */
export interface AdminIssueMonitoringQuery {
  status?: unknown;
  limit?: unknown;
}

/**
 * Reads an issue for monitoring, or reports that it does not exist.
 *
 * The lookup is unfiltered by status on purpose: a reviewed issue must still be
 * openable, only the *transition* used to be restricted. The id is validated here
 * so a malformed value is a clean 400 instead of a PostgreSQL uuid error.
 */
const requireMonitoredIssue = async (issueId: string): Promise<MonitoredIssue> => {
  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const parsedIssueId = issueIdSchema.parse(issueId);
  const issue = await issueDao.findMonitoredIssueById(parsedIssueId);

  if (!issue) {
    throw new NotFoundError('Issue not found', 'ISSUE_NOT_FOUND');
  }

  return issue;
};

/**
 * Issues for the admin monitoring dashboard, newest first.
 *
 * The status filter and the page size come from `issueListQuerySchema`, so an
 * unknown status, a non numeric limit or an unknown query parameter is a 400
 * rather than a silently ignored filter. Without `status` every issue in the
 * review stage is listed, which is what the dashboard shows by default.
 */
export const listIssuesForMonitoring = async (query: AdminIssueMonitoringQuery): Promise<MonitoredIssue[]> => {
  // Throws a ZodError -> 400 naming the rejected field.
  const { status, limit } = issueListQuerySchema.parse(query);

  return issueDao.findIssuesForMonitoring(status ?? null, limit ?? MAX_LIST_LIMIT);
};

/**
 * One issue with everything the monitoring view needs: the report, its photo, its
 * location, who reported it and whatever the authority recorded when they reviewed
 * it.
 *
 * Read-only: this is the same data an authority sees, plus the reporter, and it
 * cannot be acted on from here.
 *
 * 404 when the id does not exist.
 */
export const getIssueForMonitoring = async (issueId: string): Promise<MonitoredIssue> =>
  requireMonitoredIssue(issueId);