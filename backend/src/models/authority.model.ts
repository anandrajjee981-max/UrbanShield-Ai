import type {
  AuthorityAvailability,
  AuthorityDepartment,
  AuthorityDesignation,
  AuthorityJurisdictionType,
  AuthoritySkill,
  AuthorityVerificationAction,
  AuthorityVerificationStatus,
  GovernmentIdType,
} from '../types/authority.types.js';
import { maskGovernmentId } from '../utils/mask.js';

/**
 * `authority_applications` rows exactly as PostgreSQL returns them (snake_case
 * columns). Only the DAO layer ever sees this shape.
 */
export interface AuthorityApplicationRow {
  id: string;
  user_id: string;
  full_name: string;
  /** `DATE` columns arrive as a string, not a Date. */
  date_of_birth: string;
  phone: string;
  email: string;
  address: string;
  government_id_type: GovernmentIdType;
  /**
   * SENSITIVE. Present on the row because the admin review read needs the
   * document to compare against, but it is deliberately absent from every shape
   * that can reach an API response - see {@link toSafeAuthorityApplication} and
   * {@link toAdminAuthorityApplication}.
   */
  government_id_number: string;
  government_id_last4: string;
  document_url: string | null;
  document_file_id: string | null;
  document_mime_type: string | null;
  department: AuthorityDepartment;
  designation: AuthorityDesignation;
  jurisdiction_type: AuthorityJurisdictionType;
  jurisdiction_name: string;
  availability: AuthorityAvailability;
  verification_status: AuthorityVerificationStatus;
  rejection_reason: string | null;
  submitted_at: Date;
  verified_by: string | null;
  verified_at: Date | null;
  rejected_by: string | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * A row joined to the `users` table, as the admin review screen reads it.
 *
 * Only `id`, `role` and `email` are selected from `users`, so `password_hash`
 * cannot reach this shape even by accident. The name shown to the admin comes
 * from the application (`full_name`), not the account, because the application is
 * the attested identity.
 */
export interface AdminAuthorityApplicationRow extends AuthorityApplicationRow {
  account_email: string;
  account_role: string;
}

/**
 * `authority_verification_audit` rows joined to the deciding admin's id.
 *
 * Only the admin's *id* is joined, never their name or email: the audit trail
 * must stay immutable, so a renamed account must not rewrite history.
 */
export interface AuthorityAuditEntryRow {
  id: string;
  application_id: string;
  admin_id: string | null;
  action: AuthorityVerificationAction;
  previous_status: AuthorityVerificationStatus | null;
  new_status: AuthorityVerificationStatus;
  reason: string | null;
  created_at: Date;
}

/** Domain entity passed between DAO, service and controller. */
export interface AuthorityApplication {
  id: string;
  userId: string;
  fullName: string;
  /** ISO `YYYY-MM-DD`, matching the `DATE` column. */
  dateOfBirth: string; 
  phone: string;
  email: string;
  address: string;
  governmentIdType: GovernmentIdType;
  /** SENSITIVE. Never serialised into a response. */
  governmentIdNumber: string;
  governmentIdLast4: string;
  documentUrl: string | null;
  documentFileId: string | null;
  documentMimeType: string | null;
  department: AuthorityDepartment;
  designation: AuthorityDesignation;
  skills: AuthoritySkill[];
  jurisdictionType: AuthorityJurisdictionType;
  jurisdictionName: string;
  availability: AuthorityAvailability;
  verificationStatus: AuthorityVerificationStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The admin review view of an application: the application plus the account it
 * belongs to.
 *
 * A standalone interface rather than `AuthorityApplication & { account }` for the
 * same reason as `AdminIssue` (src/models/issue.model.ts): an intersection would
 * drag `governmentIdNumber`, `documentFileId` and `userId` into the payload,
 * which is exactly what the admin review screen must not carry.
 */
export interface AdminAuthorityApplication {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: GovernmentIdType;
  /**
   * The masked ID, e.g. `XXXX-XXXX-9012`. Even an admin is given the mask by
   * default: the value they need to check is the one on the uploaded document,
   * and returning the digits would put an unnecessary copy of a stranger's
   * national ID into an API response, a browser and a log of that response.
   */
  governmentIdMasked: string;
  documentUrl: string | null;
  documentMimeType: string | null;
  department: AuthorityDepartment;
  designation: AuthorityDesignation;
  skills: AuthoritySkill[];
  jurisdictionType: AuthorityJurisdictionType;
  jurisdictionName: string;
  availability: AuthorityAvailability;
  verificationStatus: AuthorityVerificationStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  account: {
    email: string;
    role: string;
  };
}

/**
 * The only application shape that may reach the candidate themselves.
 *
 * Carries neither `governmentIdNumber` (only `governmentIdMasked`) nor
 * `documentUrl` (only `hasDocument`): a candidate does not need their own ID
 * echoed back to read it, and handing the browser a document URL would put a
 * link to their identity document in the page, in history and in devtools.
 */
export interface SafeAuthorityApplication {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: GovernmentIdType;
  governmentIdMasked: string;
  /** Whether identity proof was attached. The URL is never exposed here. */
  hasDocument: boolean;
  documentMimeType: string | null;
  department: AuthorityDepartment;
  designation: AuthorityDesignation;
  skills: AuthoritySkill[];
  jurisdictionType: AuthorityJurisdictionType;
  jurisdictionName: string;
  availability: AuthorityAvailability;
  verificationStatus: AuthorityVerificationStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  verifiedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** One audit trail entry, as returned to an admin. */
export interface AuthorityAuditEntry {
  id: string;
  action: AuthorityVerificationAction;
  previousStatus: AuthorityVerificationStatus | null;
  newStatus: AuthorityVerificationStatus;
  reason: string | null;
  adminId: string | null;
  createdAt: Date;
}

/**
 * Everything required to insert a new application.
 *
 * `verificationStatus` is intentionally absent: the column DEFAULT 'PENDING'
 * supplies it, which is what makes it impossible for a citizen's POST to decide
 * its own status. `userId` comes from the JWT, never from the body.
 */
export interface CreateAuthorityApplicationData {
  userId: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: GovernmentIdType;
  governmentIdNumber: string;
  governmentIdLast4: string;
  documentUrl: string;
  documentFileId: string;
  documentMimeType: string;
  department: AuthorityDepartment;
  designation: AuthorityDesignation;
  skills: AuthoritySkill[];
  jurisdictionType: AuthorityJurisdictionType;
  jurisdictionName: string;
  availability: AuthorityAvailability;
}

/**
 * The part of a multipart upload the authority service needs.
 *
 * Declared here so the service and DAO layers never import multer's types; the
 * file multer produces satisfies this shape structurally.
 */
export interface UploadedAuthorityDocument {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/** Maps a raw database row to the domain entity. */
export const toAuthorityApplication = (
  row: AuthorityApplicationRow,
  skills: AuthoritySkill[] = [],
): AuthorityApplication => ({
  id: row.id,
  userId: row.user_id,
  fullName: row.full_name,
  dateOfBirth: row.date_of_birth,
  phone: row.phone,
  email: row.email,
  address: row.address,
  governmentIdType: row.government_id_type,
  governmentIdNumber: row.government_id_number,
  governmentIdLast4: row.government_id_last4,
  documentUrl: row.document_url,
  documentFileId: row.document_file_id,
  documentMimeType: row.document_mime_type,
  department: row.department,
  designation: row.designation,
  skills,
  jurisdictionType: row.jurisdiction_type,
  jurisdictionName: row.jurisdiction_name,
  availability: row.availability,
  verificationStatus: row.verification_status,
  rejectionReason: row.rejection_reason,
  submittedAt: row.submitted_at,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  rejectedAt: row.rejected_at,
  rejectedBy: row.rejected_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** Maps a row that also carries the joined account columns. */
export const toAdminAuthorityApplication = (
  row: AdminAuthorityApplicationRow,
  skills: AuthoritySkill[] = [],
): AdminAuthorityApplication => ({
  id: row.id,
  fullName: row.full_name,
  dateOfBirth: row.date_of_birth,
  phone: row.phone,
  email: row.email,
  address: row.address,
  governmentIdType: row.government_id_type,
  governmentIdMasked: maskGovernmentId(row.government_id_number),
  documentUrl: row.document_url,
  documentMimeType: row.document_mime_type,
  department: row.department,
  designation: row.designation,
  skills,
  jurisdictionType: row.jurisdiction_type,
  jurisdictionName: row.jurisdiction_name,
  availability: row.availability,
  verificationStatus: row.verification_status,
  rejectionReason: row.rejection_reason,
  submittedAt: row.submitted_at,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  rejectedBy: row.rejected_by,
  rejectedAt: row.rejected_at,
  account: {
    email: row.account_email,
    role: row.account_role,
  },
});

/**
 * Strips internal and sensitive columns before an application is serialised into
 * a candidate-facing response.
 *
 * Every candidate response path in the service layer goes through this function,
 * so `governmentIdNumber`, `documentUrl` and `documentFileId` cannot leak by
 * someone forgetting to filter a field.
 */
export const toSafeAuthorityApplication = (
  application: AuthorityApplication,
): SafeAuthorityApplication => ({
  id: application.id,
  fullName: application.fullName,
  dateOfBirth: application.dateOfBirth,
  phone: application.phone,
  email: application.email,
  address: application.address,
  governmentIdType: application.governmentIdType,
  governmentIdMasked: maskGovernmentId(application.governmentIdNumber),
  hasDocument: application.documentUrl !== null,
  documentMimeType: application.documentMimeType,
  department: application.department,
  designation: application.designation,
  skills: application.skills,
  jurisdictionType: application.jurisdictionType,
  jurisdictionName: application.jurisdictionName,
  availability: application.availability,
  verificationStatus: application.verificationStatus,
  rejectionReason: application.rejectionReason,
  submittedAt: application.submittedAt,
  verifiedAt: application.verifiedAt,
  rejectedAt: application.rejectedAt,
  createdAt: application.createdAt,
  updatedAt: application.updatedAt,
});

/** Maps a raw audit row to its domain shape. */
export const toAuthorityAuditEntry = (row: AuthorityAuditEntryRow): AuthorityAuditEntry => ({
  id: row.id,
  action: row.action,
  previousStatus: row.previous_status,
  newStatus: row.new_status,
  reason: row.reason,
  adminId: row.admin_id,
  createdAt: row.created_at,
});