/**
 * Authority verification domain types, shared by the DAO, service, controller
 * and validation layers.
 *
 * The idea this file exists to enforce:
 *
 *     registered authority candidate  !=  verified authority
 *
 * `UserRole` (src/types/auth.types.ts) already lets an account register as
 * AUTHORITY. That means "wants to be an authority" and nothing more. The
 * privilege lives in `AuthorityVerificationStatus` below, and only an admin can
 * move it to VERIFIED. So there are two independent facts:
 *
 *     role = AUTHORITY, status = PENDING   ->  application under review
 *     role = AUTHORITY, status = VERIFIED  ->  verified authority
 *
 * The tuples here are the single source of truth. The Zod schemas derive their
 * enums from them, and the enum domains in 004_create_authority_verification.sql
 * list the same values. Adding a department or a status means adding it here and
 * to that migration.
 */

// ---------------------------------------------------------------------------
// Verification status
// ---------------------------------------------------------------------------

/**
 * The whole verification workflow:
 *
 *   submit / resubmit --> PENDING
 *   PENDING  --(admin verify)--> VERIFIED
 *   PENDING  --(admin reject)--> REJECTED
 *   REJECTED --(resubmit)-----> PENDING
 *
 * There is no REVOKED / SUSPENDED status. Moving an already VERIFIED authority
 * back is a separate future admin workflow (revocation), and deliberately
 * omitting the status here is what keeps that door closed for now: an admin
 * cannot express "un-verify" through any of these endpoints.
 */
export const AUTHORITY_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED'] as const;

export type AuthorityVerificationStatus = (typeof AUTHORITY_VERIFICATION_STATUSES)[number];

/**
 * What a submission is, server-side, always.
 *
 * Hard coded here and mirrored by the column DEFAULT in
 * 004_create_authority_verification.sql. It is never read from a request body:
 * the schemas are `.strict()`, so a client that posts `verificationStatus` gets a
 * 400 instead of quietly promoting itself.
 */
export const INITIAL_AUTHORITY_VERIFICATION_STATUS = 'PENDING' satisfies AuthorityVerificationStatus;

/**
 * The only status an admin may act on.
 *
 * This constant is the single source of truth behind `WHERE ... AND
 * verification_status = 'PENDING'` in src/dao/authority.dao.ts, so the allowed
 * admin transitions are readable in one place instead of being spread over
 * route, service and SQL.
 */
export const REVIEWABLE_AUTHORITY_STATUS = INITIAL_AUTHORITY_VERIFICATION_STATUS;

/**
 * Statuses a rejected candidate may submit again from.
 *
 * Only REJECTED. A PENDING application is already in the queue (resubmitting
 * would silently reorder it and reset its audit history), and a VERIFIED
 * application belongs to a verified authority, which is a different workflow.
 */
export const RESUBMITTABLE_AUTHORITY_STATUS = 'REJECTED' satisfies AuthorityVerificationStatus;

/** The admin decisions that exist at this stage. */
export const ADMIN_AUTHORITY_ACTIONS = ['VERIFY', 'REJECT'] as const;

export type AdminAuthorityAction = (typeof ADMIN_AUTHORITY_ACTIONS)[number];

/** The status each admin action produces. */
export const AUTHORITY_STATUS_AFTER_ADMIN_ACTION: Readonly<
  Record<AdminAuthorityAction, AuthorityVerificationStatus>
> = {
  VERIFY: 'VERIFIED',
  REJECT: 'REJECTED',
};

/** Actions recorded in the audit trail, whoever performed them. */
export const AUTHORITY_VERIFICATION_ACTIONS = ['SUBMIT', 'RESUBMIT', 'VERIFY', 'REJECT'] as const;

export type AuthorityVerificationAction = (typeof AUTHORITY_VERIFICATION_ACTIONS)[number];

/**
 * Statuses the admin queue can be filtered by: the pending queue plus the two
 * outcomes. Deliberately the complete list - every status an application can
 * hold is reviewable information for an admin, and there is no later stage to
 * hide.
 */
export const ADMIN_FILTERABLE_AUTHORITY_STATUSES = AUTHORITY_VERIFICATION_STATUSES;

export type AdminFilterableAuthorityStatus = (typeof ADMIN_FILTERABLE_AUTHORITY_STATUSES)[number];

// ---------------------------------------------------------------------------
// Professional information
// ---------------------------------------------------------------------------

/**
 * The department the candidate works for.
 *
 * `OTHER` is an explicit member rather than a nullable "other" field, so an admin
 * can filter on it and the assignment engine can treat it as "unspecified"
 * instead of crashing on a null.
 */
export const AUTHORITY_DEPARTMENTS = [
  'WATER_MANAGEMENT',
  'SANITATION',
  'DRAINAGE',
  'ROAD_MAINTENANCE',
  'ELECTRICITY',
  'WASTE_MANAGEMENT',
  'PUBLIC_HEALTH',
  'OTHER',
] as const;

export type AuthorityDepartment = (typeof AUTHORITY_DEPARTMENTS)[number];

/**
 * Skills a candidate declares.
 *
 * This is a closed vocabulary on purpose: the future assignment engine matches a
 * required skill against these values, and free text would make that match
 * impossible. A new skill is a migration plus a line here.
 */
export const AUTHORITY_SKILLS = [
  'PLUMBING',
  'DRAINAGE_REPAIR',
  'ROAD_MAINTENANCE',
  'ELECTRICAL_MAINTENANCE',
  'WASTE_MANAGEMENT',
  'EMERGENCY_RESPONSE',
] as const;

export type AuthoritySkill = (typeof AUTHORITY_SKILLS)[number];

export const AUTHORITY_DESIGNATIONS = [
  'MUNICIPAL_WORKER',
  'FIELD_OFFICER',
  'ENGINEER',
  'SUPERVISOR',
  'DEPARTMENT_OFFICER',
  'OTHER',
] as const;

export type AuthorityDesignation = (typeof AUTHORITY_DESIGNATIONS)[number];

/**
 * The kind of area the candidate operates in.
 *
 * Stored next to a free-text `jurisdictionName` because the assignment engine
 * will compare the *kind* (is this a ward? a district?) as well as the name.
 * Free text alone cannot be matched reliably; the type makes it comparable.
 */
export const AUTHORITY_JURISDICTION_TYPES = [
  'DISTRICT',
  'CITY',
  'MUNICIPALITY',
  'WARD',
  'ZONE',
] as const;

export type AuthorityJurisdictionType = (typeof AUTHORITY_JURISDICTION_TYPES)[number];

/**
 * Stated availability.
 *
 * Part of the profile the future assignment engine will read, and nothing more.
 * There is deliberately no workload, task count, capacity or estimated duration
 * here: those belong to the assignment module, and inventing them now would
 * mean storing numbers no code produces.
 */
export const AUTHORITY_AVAILABILITIES = ['AVAILABLE', 'PARTIALLY_AVAILABLE', 'UNAVAILABLE'] as const;

export type AuthorityAvailability = (typeof AUTHORITY_AVAILABILITIES)[number];

// ---------------------------------------------------------------------------
// Government identity
// ---------------------------------------------------------------------------

/** Government identity documents a candidate may submit. */
export const GOVERNMENT_ID_TYPES = ['AADHAAR', 'GOVERNMENT_ID', 'OTHER'] as const;

export type GovernmentIdType = (typeof GOVERNMENT_ID_TYPES)[number];

/**
 * Document/image types accepted for identity proof.
 *
 * PDF is included because government ID scans are routinely issued as PDF,
 * while the citizen *issue* photo path only allows raster images
 * (ISSUE_IMAGE_MIME_TYPES). The two lists are deliberately separate: an identity
 * document has different privacy handling than a public street photo.
 */
export const AUTHORITY_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AuthorityDocumentMimeType = (typeof AUTHORITY_DOCUMENT_MIME_TYPES)[number];