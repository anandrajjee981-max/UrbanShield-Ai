/**
 * Issue domain types shared by the DAO, service, controller and validation
 * layers.
 *
 * These tuples are the single source of truth: the Zod schemas derive their
 * enums from them and the `issues_issue_type_valid` / `issues_status_valid` /
 * `issues_location_type_valid` CHECK constraints in 002_create_issues.sql list
 * the same values. Adding an issue type later means adding it here and to that
 * CHECK constraint.
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
 *
 * Only `INITIAL_ISSUE_STATUS` is ever written by the citizen facing API. The
 * other transitions belong to the authority workflow, which is a later task.
 */
export const ISSUE_STATUSES = [
  'REPORTED',
  'VERIFIED',
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
 * How the citizen located the problem.
 *
 * - `GPS`   - the browser resolved `navigator.geolocation` and sent the
 *              coordinates. The backend never asks the device for a location.
 * - `MANUAL`- the citizen typed an address; no geocoding is attempted yet.
 */
export const LOCATION_TYPES = ['GPS', 'MANUAL'] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];
