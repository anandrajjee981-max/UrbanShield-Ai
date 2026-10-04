import type {
  IssueComplexity,
  IssueStatus,
  IssueType,
  LocationType,
  SkillRequired,
} from '../types/issue.types.js';

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
  /** Admin review metadata (003_add_issue_verification.sql). */
  verified_by: string | null;
  verified_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  /** AI analysis + assignment lifecycle (004_issue_ai_assignment.sql). */
  skill_required: SkillRequired | null;
  complexity: IssueComplexity | null;
  /** NUMERIC arrives as a string, like latitude / longitude. */
  effort_hours: string | null;
  ai_analyzed_at: Date | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: Date | null;
  started_at: Date | null;
  resolved_at: Date | null;
  resolution_note: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * An `issues` row joined to the citizen who reported it, as the admin review
 * screen reads it.
 *
 * Only `name` and `email` are selected from `users`, so `password_hash` can
 * never reach this shape even by accident.
 */
export interface AdminIssueRow extends IssueRow {
  citizen_name: string;
  citizen_email: string;
  assignee_name: string | null;
  assignee_email: string | null;
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
  skillRequired: SkillRequired | null;
  complexity: IssueComplexity | null;
  effortHours: number | null;
  aiAnalyzedAt: Date | null;
  assignedTo: string | null;
  assignedBy: string | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
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
  skillRequired: SkillRequired | null;
  complexity: IssueComplexity | null;
  effortHours: number | null;
  aiAnalyzedAt: Date | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
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
 * The issue shape the admin review screen receives.
 *
 * It is deliberately a standalone interface rather than `Issue & { citizen }`:
 * that would carry `userId` and `imageFileId` into the response, and an admin
 * payload must only contain what the review actually needs - the report, the
 * location, the review metadata and who reported it.
 *
 * The citizen's identity comes from the `users` join performed in the DAO, and
 * the reviewer's identity is a user id only: the admin's name and email are
 * resolved through the same relationship instead of being copied into
 * `issues`.
 */
export interface AdminIssue {
  id: string;
  issueType: IssueType;
  description: string;
  imageUrl: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: IssueStatus;
  citizen: {
    name: string;
    email: string;
  };
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  skillRequired: SkillRequired | null;
  complexity: IssueComplexity | null;
  effortHours: number | null;
  aiAnalyzedAt: Date | null;
  assignedTo: string | null;
  assignee: { name: string; email: string } | null;
  assignedBy: string | null;
  assignedAt: Date | null;
  startedAt: Date | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  skillRequired: row.skill_required,
  complexity: row.complexity,
  effortHours: row.effort_hours === null ? null : Number(row.effort_hours),
  aiAnalyzedAt: row.ai_analyzed_at,
  assignedTo: row.assigned_to,
  assignedBy: row.assigned_by,
  assignedAt: row.assigned_at,
  startedAt: row.started_at,
  resolvedAt: row.resolved_at,
  resolutionNote: row.resolution_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Maps a row that also carries the joined citizen columns. */
export const toAdminIssue = (row: AdminIssueRow): AdminIssue => ({
  id: row.id,
  issueType: row.issue_type,
  description: row.description,
  imageUrl: row.image_url,
  locationType: row.location_type,
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  address: row.address,
  status: row.status,
  citizen: {
    name: row.citizen_name,
    email: row.citizen_email,
  },
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  rejectedBy: row.rejected_by,
  rejectedAt: row.rejected_at,
  rejectionReason: row.rejection_reason,
  skillRequired: row.skill_required,
  complexity: row.complexity,
  effortHours: row.effort_hours === null ? null : Number(row.effort_hours),
  aiAnalyzedAt: row.ai_analyzed_at,
  assignedTo: row.assigned_to,
  assignee:
    row.assignee_name !== null && row.assignee_email !== null
      ? { name: row.assignee_name, email: row.assignee_email }
      : null,
  assignedBy: row.assigned_by,
  assignedAt: row.assigned_at,
  startedAt: row.started_at,
  resolvedAt: row.resolved_at,
  resolutionNote: row.resolution_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
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
  skillRequired: issue.skillRequired,
  complexity: issue.complexity,
  effortHours: issue.effortHours,
  aiAnalyzedAt: issue.aiAnalyzedAt,
  assignedAt: issue.assignedAt,
  startedAt: issue.startedAt,
  resolvedAt: issue.resolvedAt,
  resolutionNote: issue.resolutionNote,
  createdAt: issue.createdAt,
  updatedAt: issue.updatedAt,
});
