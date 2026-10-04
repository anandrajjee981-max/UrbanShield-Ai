/**
 * Issue domain types shared by the DAO, service, controller and validation
 * layers.
 *
 * These tuples are the single source of truth: the Zod schemas derive their
 * enums from them and the `issues_issue_type_valid` / `issues_status_valid` /
 * `issues_location_type_valid` CHECK constraints in 002_create_issues.sql (plus
 * 003_add_issue_verification.sql) list the same values. Adding an issue type or
 * status later means adding it here and to that CHECK constraint.
 *
 * Ownership of the review stage: a citizen reports, and a *verified authority*
 * decides whether the report is genuine. An admin has no transition at all - it
 * may only read the issue queue for monitoring. The constants below therefore
 * name the authority, not the admin; the absence of an admin action in this file
 * is what keeps `/api/admin/issues` read-only.
 */

export const ISSUE_TYPES = [
  'WATER_LEAKAGE',
  'WATER_SHORTAGE',
  'EXTREME_HEAT',
  'FLOODING',
  'DRAINAGE',
  'OTHER',
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

/**
 * The full lifecycle, in the order an issue moves through it:
 *
 *   REPORTED -> VERIFIED -> ASSIGNED -> IN_PROGRESS -> RESOLVED
 *                    \
 *                     -> REJECTED  (terminal, decided by an authority)
 *
 * Only `INITIAL_ISSUE_STATUS` is ever written by the citizen facing API, and the
 * VERIFIED / REJECTED transition is owned by a verified authority
 * (`/api/authority/issues/...`). ASSIGNED / IN_PROGRESS / RESOLVED belong to the
 * later task-assignment workflow, which is a separate module and has no API yet.
 */
export const ISSUE_STATUSES = [
  'REPORTED',
  'VERIFIED',
  'REJECTED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
] as const;

export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/**
 * Hard coded on the server, never read from the request body: a citizen can
 * only create a new issue, never place it further along the workflow.
 */
export const INITIAL_ISSUE_STATUS = 'REPORTED' satisfies IssueStatus;

/**
 * The only status an authority may review. REVIEWED_ISSUE_STATUSES lists the two
 * outcomes an authority review can produce.
 *
 * This constant is the single source of truth behind
 * `WHERE id = $1 AND status = 'REPORTED'` in src/dao/issue.dao.ts, so the
 * allowed transitions are readable in one place instead of being spread over
 * route, service and SQL.
 */
export const REVIEWABLE_ISSUE_STATUS = INITIAL_ISSUE_STATUS;

/**
 * Statuses an issue can hold once an authority has reviewed it.
 *
 * Both are terminal at this stage: neither an authority nor a citizen can move
 * an issue back to REPORTED, or from one outcome to the other.
 */
export const REVIEWED_ISSUE_STATUSES = ['VERIFIED', 'REJECTED'] as const;

export type ReviewedIssueStatus = (typeof REVIEWED_ISSUE_STATUSES)[number];

/**
 * The authority actions that exist at this stage, and the status each one
 * produces.
 *
 * Only REPORTED -> VERIFIED and REPORTED -> REJECTED are allowed. There is no
 * transition out of VERIFIED or REJECTED, and no way to set a status directly:
 * each action is its own endpoint, so a client cannot send an arbitrary status.
 * An admin holds neither action - see the file header.
 */
export const AUTHORITY_ISSUE_ACTIONS = ['VERIFY', 'REJECT'] as const;

export type AuthorityIssueAction = (typeof AUTHORITY_ISSUE_ACTIONS)[number];

export const ISSUE_STATUS_AFTER_AUTHORITY_ACTION: Readonly<Record<AuthorityIssueAction, IssueStatus>> = {
  VERIFY: 'VERIFIED',
  REJECT: 'REJECTED',
};

/** True for an issue an authority has already reviewed, whatever the outcome. */
export const isReviewedIssueStatus = (status: IssueStatus): status is ReviewedIssueStatus =>
  (REVIEWED_ISSUE_STATUSES as readonly IssueStatus[]).includes(status);

/**
 * Every status reachable through the review stage: the pending queue plus the two
 * review outcomes. It is the allow list for a `?status=` filter on both issue
 * listings - the authority queue and the admin monitoring view.
 *
 * The later assignment statuses are deliberately absent, so `?status=` can never
 * be used to probe a stage that has no API yet.
 */
export const ISSUE_REVIEW_STATUSES = [
  REVIEWABLE_ISSUE_STATUS,
  ...REVIEWED_ISSUE_STATUSES,
] as const;

export type IssueReviewStatus = (typeof ISSUE_REVIEW_STATUSES)[number];

/**
 * How the citizen located the problem.
 *
 * - `GPS`   - the browser resolved `navigator.geolocation` and sent the
 *              coordinates. The backend never asks the device for a location.
 * - `MANUAL`- the citizen typed an address; no geocoding is attempted yet.
 */
export const LOCATION_TYPES = ['GPS', 'MANUAL'] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];
