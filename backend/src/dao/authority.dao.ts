import type { PoolClient } from 'pg';
import { query, withTransaction } from '../config/db.js';
import type {
  AdminAuthorityApplication,
  AdminAuthorityApplicationRow,
  AuthorityApplication,
  AuthorityApplicationRow,
  AuthorityAuditEntry,
  AuthorityAuditEntryRow,
  CreateAuthorityApplicationData,
} from '../models/authority.model.js';
import {
  toAdminAuthorityApplication,
  toAuthorityApplication,
  toAuthorityAuditEntry,
} from '../models/authority.model.js';
import type {
  AuthoritySkill,
  AuthorityVerificationAction,
  AuthorityVerificationStatus,
} from '../types/authority.types.js';
import {
  AUTHORITY_STATUS_AFTER_ADMIN_ACTION,
  INITIAL_AUTHORITY_VERIFICATION_STATUS,
  RESUBMITTABLE_AUTHORITY_STATUS,
  REVIEWABLE_AUTHORITY_STATUS,
} from '../types/authority.types.js';
import type { UserRole } from '../types/auth.types.js';
import { InternalServerError } from '../utils/api-error.js';

/**
 * Database access for `authority_applications`,
 * `authority_application_skills` and `authority_verification_audit`.
 *
 * This layer performs SQL and row mapping only - no business rules, no status
 * transition decisions, no JWT handling and no ImageKit calls. Every query is
 * parameterised, so user input can never be interpolated into SQL text.
 *
 * What is *not* writable from here is the point of the whole module:
 *
 *  - `createAuthorityApplication` does not insert `verification_status`. The
 *    column DEFAULT supplies PENDING, so a candidate cannot choose a status.
 *  - `verifyAuthorityApplication` / `rejectAuthorityApplication` take the reviewer
 *    id as an argument (the caller passes `req.user.userId`) and never read it
 *    from a request field.
 *  - Both admin writes carry `WHERE verification_status = $n` with the source
 *    status as a parameter, so an already-reviewed application can never be
 *    overwritten - even if two admins press the button simultaneously.
 */

/**
 * Every column of an application, including the sensitive ones.
 *
 * Used by the writes, which must persist the whole row. The read paths below use
 * narrower lists - see the note on `ADMIN_APPLICATION_SELECT`.
 */
const APPLICATION_COLUMNS =
  'id, user_id, full_name, date_of_birth, phone, email, address, government_id_type, government_id_number, government_id_last4, document_url, document_file_id, document_mime_type, department, designation, jurisdiction_type, jurisdiction_name, availability, verification_status, rejection_reason, submitted_at, verified_by, verified_at, rejected_by, rejected_at, created_at, updated_at';

/**
 * Columns read for an admin review.
 *
 * `government_id_number` is selected because the admin screen derives the mask
 * from it (src/utils/mask.ts) - it is never returned as-is, which
 * `toAdminAuthorityApplication` enforces by mapping the row to a shape that has
 * no field for it.
 */
const ADMIN_APPLICATION_COLUMNS =
  'a.id, a.user_id, a.full_name, a.date_of_birth, a.phone, a.email, a.address, a.government_id_type, a.government_id_number, a.government_id_last4, a.document_url, a.document_file_id, a.document_mime_type, a.department, a.designation, a.jurisdiction_type, a.jurisdiction_name, a.availability, a.verification_status, a.rejection_reason, a.submitted_at, a.verified_by, a.verified_at, a.rejected_by, a.rejected_at, a.created_at, a.updated_at, u.email AS account_email, u.role AS account_role';

/**
 * The admin review query, joined to `users` for the account it belongs to.
 *
 * `password_hash` is deliberately absent from the select list, so the credential
 * cannot reach an admin payload even by accident. The full name shown to the
 * reviewer is `a.full_name` (the attested name from the application), not
 * `u.name`, because the application is what the admin is verifying.
 */
const ADMIN_APPLICATION_SELECT = `
  SELECT ${ADMIN_APPLICATION_COLUMNS}
  FROM authority_applications a
  JOIN users u ON u.id = a.user_id`;

/**
 * Skills for a set of applications, fetched in one query.
 *
 * A single round trip rather than one query per application, because the admin
 * queue lists up to 100 applications and an N+1 here would be 101 round trips per
 * page load. Returns a `Map` keyed by application id.
 */
const findSkillsForApplications = async (
  applicationIds: readonly string[],
): Promise<Map<string, AuthoritySkill[]>> => {
  const skillsByApplication = new Map<string, AuthoritySkill[]>();

  if (applicationIds.length === 0) {
    return skillsByApplication;
  }

  const { rows } = await query<{ application_id: string; skill: AuthoritySkill }>(
    `SELECT application_id, skill
     FROM authority_application_skills
     WHERE application_id = ANY($1::uuid[])
     ORDER BY skill`,
    [applicationIds],
  );

  for (const row of rows) {
    const existing = skillsByApplication.get(row.application_id);

    if (existing) {
      existing.push(row.skill);
      continue;
    }

    skillsByApplication.set(row.application_id, [row.skill]);
  }

  return skillsByApplication;
};

/** Replaces an application's skills with exactly the supplied set. */
const replaceSkills = async (
  client: PoolClient,
  applicationId: string,
  skills: readonly AuthoritySkill[],
): Promise<void> => {
  await client.query('DELETE FROM authority_application_skills WHERE application_id = $1', [
    applicationId,
  ]);

  for (const skill of skills) {
    await client.query(
      'INSERT INTO authority_application_skills (application_id, skill) VALUES ($1, $2)',
      [applicationId, skill],
    );
  }
};

/** Appends one immutable audit entry. */
const appendAuditEntry = async (
  client: PoolClient,
  entry: {
    applicationId: string;
    adminId: string | null;
    action: AuthorityVerificationAction;
    previousStatus: AuthorityVerificationStatus | null;
    newStatus: AuthorityVerificationStatus;
    reason?: string | null;
  },
): Promise<void> => {
  await client.query(
    `INSERT INTO authority_verification_audit
       (application_id, admin_id, action, previous_status, new_status, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.applicationId,
      entry.adminId,
      entry.action,
      entry.previousStatus,
      entry.newStatus,
      entry.reason ?? null,
    ],
  );
};

// ---------------------------------------------------------------------------
// Candidate reads
// ---------------------------------------------------------------------------

/** One candidate's own application, or null when they have not applied yet. */
export const findAuthorityApplicationByUserId = async (
  userId: string,
): Promise<AuthorityApplication | null> => {
  const { rows } = await query<AuthorityApplicationRow>(
    `SELECT ${APPLICATION_COLUMNS} FROM authority_applications WHERE user_id = $1 LIMIT 1`,
    [userId],
  );
  const row = rows[0];

  if (!row) return null;

  const skills = await findSkillsForApplications([row.id]);

  return toAuthorityApplication(row, skills.get(row.id) ?? []);
};

/**
 * The account role, read alongside the application so the service can tell a
 * demoted AUTHORITY from a normal one.
 *
 * Used by the verified-authority gate, which needs both facts and must not trust
 * the JWT alone: a token minted before a role change still carries the old role
 * until it expires.
 */
export const findAuthorityStandingByUserId = async (
  userId: string,
): Promise<{ role: UserRole; verificationStatus: AuthorityVerificationStatus | null } | null> => {
  const { rows } = await query<{ role: UserRole; verification_status: AuthorityVerificationStatus | null }>(
    `SELECT u.role, a.verification_status
     FROM users u
     LEFT JOIN authority_applications a ON a.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId],
  );
  const row = rows[0];

  return row ? { role: row.role, verificationStatus: row.verification_status } : null;
};

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

/**
 * Applications for the admin queue, newest submission first, optionally narrowed
 * to one status.
 *
 * The status filter is a parameter, never concatenated SQL text, so a caller
 * cannot inject a condition. An absent filter lists every status.
 */
export const findAuthorityApplicationsForAdmin = async (
  status: AuthorityVerificationStatus | null,
  limit: number,
): Promise<AdminAuthorityApplication[]> => {
  const { rows } = await query<AdminAuthorityApplicationRow>(
    `${ADMIN_APPLICATION_SELECT}
     WHERE $1::authority_verification_status IS NULL OR a.verification_status = $1::authority_verification_status
     ORDER BY a.submitted_at DESC
     LIMIT $2`,
    [status, limit],
  );

  const skillsByApplication = await findSkillsForApplications(rows.map((row) => row.id));

  return rows.map((row) => toAdminAuthorityApplication(row, skillsByApplication.get(row.id) ?? []));
};

/** One application for the review screen, or null when the id does not exist. */
export const findAuthorityApplicationForAdminById = async (
  applicationId: string,
): Promise<AdminAuthorityApplication | null> => {
  const { rows } = await query<AdminAuthorityApplicationRow>(
    `${ADMIN_APPLICATION_SELECT}
     WHERE a.id = $1
     LIMIT 1`,
    [applicationId],
  );
  const row = rows[0];

  if (!row) return null;

  const skills = await findSkillsForApplications([row.id]);

  return toAdminAuthorityApplication(row, skills.get(row.id) ?? []);
};

/** The full decision history of one application, oldest first. */
export const findAuthorityAuditTrail = async (
  applicationId: string,
): Promise<AuthorityAuditEntry[]> => {
  const { rows } = await query<AuthorityAuditEntryRow>(
    `SELECT id, application_id, admin_id, action, previous_status, new_status, reason, created_at
     FROM authority_verification_audit
     WHERE application_id = $1
     ORDER BY created_at ASC, id ASC`,
    [applicationId],
  );

  return rows.map(toAuthorityAuditEntry);
};

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Inserts a new application as PENDING.
 *
 * `verification_status` is absent from the column list on purpose: the column
 * DEFAULT supplies PENDING, which is what makes it impossible for this DAO to
 * create an already-verified authority. The first audit entry is written in the
 * same transaction, so an application can never exist without its SUBMIT record.
 */
export const createAuthorityApplication = async (
  data: CreateAuthorityApplicationData,
): Promise<AuthorityApplication> => {
  return withTransaction(async (client) => {
    const { rows } = await client.query<AuthorityApplicationRow>(
      `INSERT INTO authority_applications (
         user_id, full_name, date_of_birth, phone, email, address,
         government_id_type, government_id_number, government_id_last4,
         document_url, document_file_id, document_mime_type,
         department, designation, jurisdiction_type, jurisdiction_name, availability
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING ${APPLICATION_COLUMNS}`,
      [
        data.userId,
        data.fullName,
        data.dateOfBirth,
        data.phone,
        data.email,
        data.address,
        data.governmentIdType,
        data.governmentIdNumber,
        data.governmentIdLast4,
        data.documentUrl,
        data.documentFileId,
        data.documentMimeType,
        data.department,
        data.designation,
        data.jurisdictionType,
        data.jurisdictionName,
        data.availability,
      ],
    );

    const row = rows[0];

    if (!row) {
      throw new InternalServerError('Authority application could not be created');
    }

    await replaceSkills(client, row.id, data.skills);

    await appendAuditEntry(client, {
      applicationId: row.id,
      adminId: null,
      action: 'SUBMIT',
      previousStatus: null,
      newStatus: INITIAL_AUTHORITY_VERIFICATION_STATUS,
    });

    return toAuthorityApplication(row, data.skills);
  });
};

/**
 * Replaces a REJECTED application's content and returns it to PENDING.
 *
 * Guarded twice, which is what makes the transition safe under concurrency:
 *
 *  - `verification_status = $RESUBMITTABLE_AUTHORITY_STATUS` in the WHERE clause,
 *    so a PENDING or VERIFIED application cannot be re-submitted even if two
 *    requests arrive at once. The service turns "no row updated" into a 409.
 *  - `submitted_at = NOW()`, so the admin queue reorders by the new submission
 *    while `created_at` still records when the person first applied.
 *
 * Every field is overwritten, not merged: the candidate is correcting the whole
 * application. `verified_at` / `rejected_at` are nulled to satisfy the
 * `authority_applications_verification_state_valid` CHECK.
 */
export const resubmitAuthorityApplication = async (
  applicationId: string,
  userId: string,
  data: CreateAuthorityApplicationData,
): Promise<AuthorityApplication | null> => {
  return withTransaction(async (client) => {
    const { rows } = await client.query<AuthorityApplicationRow>(
      `UPDATE authority_applications
          SET full_name = $3,
              date_of_birth = $4,
              phone = $5,
              email = $6,
              address = $7,
              government_id_type = $8,
              government_id_number = $9,
              government_id_last4 = $10,
              document_url = $11,
              document_file_id = $12,
              document_mime_type = $13,
              department = $14,
              designation = $15,
              jurisdiction_type = $16,
              jurisdiction_name = $17,
              availability = $18,
              verification_status = $19,
              rejection_reason = NULL,
              rejected_by = NULL,
              rejected_at = NULL,
              verified_by = NULL,
              verified_at = NULL,
              submitted_at = NOW()
        WHERE id = $1
          AND user_id = $2
          AND verification_status = $20::authority_verification_status
        RETURNING ${APPLICATION_COLUMNS}`,
      [
        applicationId,
        userId,
        data.fullName,
        data.dateOfBirth,
        data.phone,
        data.email,
        data.address,
        data.governmentIdType,
        data.governmentIdNumber,
        data.governmentIdLast4,
        data.documentUrl,
        data.documentFileId,
        data.documentMimeType,
        data.department,
        data.designation,
        data.jurisdictionType,
        data.jurisdictionName,
        data.availability,
        INITIAL_AUTHORITY_VERIFICATION_STATUS,
        RESUBMITTABLE_AUTHORITY_STATUS,
      ],
    );

    const row = rows[0];

    if (!row) return null;

    await replaceSkills(client, row.id, data.skills);

    await appendAuditEntry(client, {
      applicationId: row.id,
      adminId: null,
      action: 'RESUBMIT',
      previousStatus: RESUBMITTABLE_AUTHORITY_STATUS,
      newStatus: INITIAL_AUTHORITY_VERIFICATION_STATUS,
    });

    return toAuthorityApplication(row, data.skills);
  });
};

/**
 * PENDING -> VERIFIED, recording who decided and when.
 *
 * `verified_by` comes from the caller, which is the authenticated admin id, and is
 * never read from a request body. `WHERE verification_status = 'PENDING'` makes
 * the transition one-way; a null result means somebody else reviewed it in the
 * meantime.
 *
 * The audit entry is written in the same transaction as the update, so the trail
 * cannot disagree with the status it describes.
 */
export const verifyAuthorityApplication = async (
  applicationId: string,
  adminId: string,
): Promise<AuthorityApplication | null> =>
  withTransaction(async (client) => {
    const { rows } = await client.query<AuthorityApplicationRow>(
      `UPDATE authority_applications
          SET verification_status = $3::authority_verification_status,
              verified_by = $2,
              verified_at = NOW(),
              rejection_reason = NULL,
              rejected_by = NULL,
              rejected_at = NULL
        WHERE id = $1
          AND verification_status = $4::authority_verification_status
        RETURNING ${APPLICATION_COLUMNS}`,
      [
        applicationId,
        adminId,
        AUTHORITY_STATUS_AFTER_ADMIN_ACTION.VERIFY,
        REVIEWABLE_AUTHORITY_STATUS,
      ],
    );

    const row = rows[0];

    if (!row) return null;

    await appendAuditEntry(client, {
      applicationId: row.id,
      adminId,
      action: 'VERIFY',
      previousStatus: REVIEWABLE_AUTHORITY_STATUS,
      newStatus: AUTHORITY_STATUS_AFTER_ADMIN_ACTION.VERIFY,
    });

    const skills = await findSkillsForApplications([row.id]);

    return toAuthorityApplication(row, skills.get(row.id) ?? []);
  });

/**
 * PENDING -> REJECTED, with the optional reason in its own column (never appended
 * to another field) plus the rejecting admin and the timestamp.
 *
 * The same `WHERE verification_status = 'PENDING'` guard as `verifyAuthorityApplication`
 * keeps the transition one-way.
 */
export const rejectAuthorityApplication = async (
  applicationId: string,
  adminId: string,
  reason: string | null,
): Promise<AuthorityApplication | null> =>
  withTransaction(async (client) => {
    const { rows } = await client.query<AuthorityApplicationRow>(
      `UPDATE authority_applications
          SET verification_status = $3::authority_verification_status,
              rejected_by = $2,
              rejected_at = NOW(),
              rejection_reason = $5,
              verified_by = NULL,
              verified_at = NULL
        WHERE id = $1
          AND verification_status = $4::authority_verification_status
        RETURNING ${APPLICATION_COLUMNS}`,
      [
        applicationId,
        adminId,
        AUTHORITY_STATUS_AFTER_ADMIN_ACTION.REJECT,
        REVIEWABLE_AUTHORITY_STATUS,
        reason,
      ],
    );

    const row = rows[0];

    if (!row) return null;

    await appendAuditEntry(client, {
      applicationId: row.id,
      adminId,
      action: 'REJECT',
      previousStatus: REVIEWABLE_AUTHORITY_STATUS,
      newStatus: AUTHORITY_STATUS_AFTER_ADMIN_ACTION.REJECT,
      reason,
    });

    const skills = await findSkillsForApplications([row.id]);

    return toAuthorityApplication(row, skills.get(row.id) ?? []);
  });