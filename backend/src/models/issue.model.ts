import type { IssueStatus, IssueType, LocationType } from '../types/issue.types.js';

/**
 * An `issues` row exactly as PostgreSQL returns it (snake_case columns).
 * Only the DAO layer ever sees this shape.
 */
export interface IssueRow {
  id: string;
  user_id: string;
  issue_type: IssueType;
  description: string;
  image_url: string | null;
  image_file_id: string | null;
  location_type: LocationType;
  /** NUMERIC columns arrive as strings so precision is not lost in transit. */
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  status: IssueStatus;
  /** Authority review metadata (003_add_issue_verification.sql). */
  verified_by: string | null;
  verified_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * An `issues` row joined to the citizen who reported it, as the admin monitoring
 * view reads it.
 *
 * Only `name` and `email` are selected from `users`, so `password_hash` can
 * never reach this shape even by accident. This join is used by the *monitoring*
 * read paths only - the authority review payload never selects it, because who
 * filed a report is not what an authority needs in order to judge the civic
 * problem (see `AuthorityReviewIssue`).
 */
export interface MonitoredIssueRow extends IssueRow {
  citizen_name: string;
  citizen_email: string;
  /** Latest non-cancelled assignment of this issue, if any (authority_tasks). */
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_email: string | null;
  assigned_at: Date | null;
}

/** Domain entity passed between DAO, service and controller. */
export interface Issue {
  id: string;
  userId: string;
  issueType: IssueType;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: IssueStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The only issue shape that may leave the service layer.
 *
 * `userId` is dropped on purpose: an issue is always read back by the citizen
 * who created it, so repeating the account id in the payload adds nothing.
 */
export interface SafeIssue {
  id: string;
  issueType: IssueType;
  description: string;
  imageUrl: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: IssueStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Values required to insert a new issue. The columns not listed here
 * (`id`, `status`, `created_at`, `updated_at`) are filled in by PostgreSQL
 * defaults, which is what keeps `REPORTED` out of the citizen's hands.
 */
export interface CreateIssueData {
  userId: string;
  issueType: IssueType;
  description: string;
  imageUrl: string | null;
  imageFileId: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

/**
 * The part of a multipart upload the issue service needs. Declared here so the
 * service and DAO layers never have to import multer's types; the file multer
 * produces satisfies this shape structurally.
 */
export interface UploadedImageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * The issue shape a verified authority receives when reviewing a citizen report.
 *
 * Everything here is what is needed to judge the civic problem itself:
 *
 *   issueType, description, imageUrl, locationType, latitude, longitude, address,
 *   status, createdAt
 *
 * plus the review metadata (who decided, when, and why it was rejected), which an
 * authority needs to see the outcome of a decision already taken.
 *
 * What is deliberately absent: `userId` (the account is identified through the
 * `issues` row, not repeated in the payload), `imageFileId` (an ImageKit internal
 * reference), and the reporting citizen's identity. Reporting a civic problem is
 * not something an authority must know about a person in order to decide whether
 * the problem is real, so no name or email is joined or returned here.
 */
export interface AuthorityReviewIssue {
  id: string;
  issueType: IssueType;
  description: string;
  imageUrl: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: IssueStatus;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The issue shape the admin monitoring view receives.
 *
 * The same civic report as `AuthorityReviewIssue` plus the reporting citizen, which
 * the existing monitoring dashboard lists and links. It is a standalone interface
 * rather than `AuthorityReviewIssue & { citizen }` so the read-only payload is
 * explicit in one place and cannot grow a second review capability by inheritance.
 */
export interface MonitoredIssue extends AuthorityReviewIssue {
  citizen: {
    name: string;
    email: string;
  };
  /**
   * The authority currently handling this issue, derived from the latest
   * non-cancelled `authority_tasks` row (AI-assigned or admin-assigned).
   * Null only when no authority has been assigned — that is the sole case the
   * admin dashboard renders as "Unassigned".
   */
  assignedTo: string | null;
  assignee: { name: string; email: string } | null;
  assignedAt: Date | null;
}

/** Maps a raw database row to the domain entity. */
export const toIssue = (row: IssueRow): Issue => ({
  id: row.id,
  userId: row.user_id,
  issueType: row.issue_type,
  description: row.description,
  imageUrl: row.image_url,
  imageFileId: row.image_file_id,
  locationType: row.location_type,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  address: row.address,
  status: row.status,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  rejectedBy: row.rejected_by,
  rejectedAt: row.rejected_at,
  rejectionReason: row.rejection_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Maps a row that also carries the joined citizen columns. */
export const toAuthorityReviewIssue = (row: IssueRow): AuthorityReviewIssue => ({
  id: row.id,
  issueType: row.issue_type,
  description: row.description,
  imageUrl: row.image_url,
  locationType: row.location_type,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  address: row.address,
  status: row.status,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  rejectedBy: row.rejected_by,
  rejectedAt: row.rejected_at,
  rejectionReason: row.rejection_reason,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * Maps a monitoring row, adding the joined reporter on top of the authority view.
 *
 * Built from `toAuthorityReviewIssue` so the two payloads cannot drift: anything
 * added to the review shape is added to the monitoring view as well, and the only
 * difference is the reporter.
 */
export const toMonitoredIssue = (row: MonitoredIssueRow): MonitoredIssue => ({
  ...toAuthorityReviewIssue(row),
  citizen: {
    name: row.citizen_name,
    email: row.citizen_email,
  },
  assignedTo: row.assigned_to,
  assignee: row.assignee_name
    ? { name: row.assignee_name, email: row.assignee_email ?? '' }
    : null,
  assignedAt: row.assigned_at,
});

/**
 * Strips internal columns before an issue is serialised into an API response.
 * Every response path in the service layer goes through this function, so
 * `imageFileId` (ImageKit internal reference) and `userId` never leak.
 */
export const toSafeIssue = (issue: Issue): SafeIssue => ({
  id: issue.id,
  issueType: issue.issueType,
  description: issue.description,
  imageUrl: issue.imageUrl,
  locationType: issue.locationType,
  latitude: issue.latitude,
  longitude: issue.longitude,
  address: issue.address,
  status: issue.status,
  createdAt: issue.createdAt,
  updatedAt: issue.updatedAt,
});
