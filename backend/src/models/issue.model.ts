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
  created_at: Date;
  updated_at: Date;
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
  createdAt: issue.createdAt,
  updatedAt: issue.updatedAt,
});
