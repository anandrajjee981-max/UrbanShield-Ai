import * as authorityDao from '../dao/authority.dao.js';
import type {
  AuthorityApplication,
  CreateAuthorityApplicationData,
  SafeAuthorityApplication,
  UploadedAuthorityDocument,
} from '../models/authority.model.js';
import { toSafeAuthorityApplication } from '../models/authority.model.js';
import {
  AUTHORITY_AVAILABILITIES,
  AUTHORITY_DEPARTMENTS,
  AUTHORITY_DESIGNATIONS,
  AUTHORITY_JURISDICTION_TYPES,
  AUTHORITY_SKILLS,
  AUTHORITY_VERIFICATION_STATUSES,
  GOVERNMENT_ID_TYPES,
  INITIAL_AUTHORITY_VERIFICATION_STATUS,
  RESUBMITTABLE_AUTHORITY_STATUS,
} from '../types/authority.types.js';
import type { AuthorityVerificationStatus } from '../types/authority.types.js';
import type { SubmitAuthorityApplicationRequest } from '../validation/authority.schema.js';
import { submitAuthorityApplicationSchema } from '../validation/authority.schema.js';
import { BadRequestError, ConflictError, InternalServerError } from '../utils/api-error.js';
import { governmentIdLast4 } from '../utils/mask.js';
import * as authorityDocumentService from './authority-document.service.js';

/**
 * Business layer for the authority candidate's own application.
 *
 * Responsibilities:
 *  - Re-parse the request with `submitAuthorityApplicationSchema`, so the service
 *    stays safe when it is called from outside the HTTP boundary
 *  - Enforce the submission rules: a mandatory identity document, and which
 *    current statuses may (re-)submit
 *  - Resolve the document through the upload service and derive the masked
 *    government ID material
 *  - Decide between a first submission and a re-submission, which is what keeps
 *    `REJECTED -> PENDING` a server-owned decision
 *  - Return a `SafeAuthorityApplication`, the only shape allowed to reach a
 *    response
 *
 * Status policy: a candidate can only ever move their application INTO PENDING.
 * `verificationStatus` is never read from the request (the schema is `.strict()`,
 * so the field is a 400) and the INSERT leaves the column to its DEFAULT. The
 * assertion at the end is the last line of defence, so a future change that starts
 * passing a status through cannot silently let a candidate mark themselves
 * VERIFIED.
 *
 * Deliberately not here: task assignment, workload, AI document verification and
 * automatic approval. This module decides who a candidate *is*, nothing about
 * what they will be asked to do.
 */

export interface SubmitAuthorityApplicationParams {
  /** Authenticated candidate id, from `req.user.userId`. Never from the body. */
  userId: string;
  body: SubmitAuthorityApplicationRequest;
  /**
   * The in-memory identity document produced by the `uploadAuthorityDocument`
   * middleware. Forwarded to ImageKit; never written to disk or PostgreSQL.
   */
  documentFile?: UploadedAuthorityDocument | null;
}

/**
 * The closed vocabularies the application form is built from.
 *
 * Served from the same constants the Zod schemas and the database enum domains
 * use, so the form can never offer a value the API would reject. Publishing them
 * from here is what keeps those three definitions from drifting apart as values
 * are added.
 */
export interface AuthorityApplicationOptions {
  departments: readonly string[];
  designations: readonly string[];
  skills: readonly string[];
  jurisdictionTypes: readonly string[];
  availabilities: readonly string[];
  governmentIdTypes: readonly string[];
  verificationStatuses: readonly AuthorityVerificationStatus[];
}

export const getAuthorityApplicationOptions = (): AuthorityApplicationOptions => ({
  departments: AUTHORITY_DEPARTMENTS,
  designations: AUTHORITY_DESIGNATIONS,
  skills: AUTHORITY_SKILLS,
  jurisdictionTypes: AUTHORITY_JURISDICTION_TYPES,
  availabilities: AUTHORITY_AVAILABILITIES,
  governmentIdTypes: GOVERNMENT_ID_TYPES,
  verificationStatuses: AUTHORITY_VERIFICATION_STATUSES,
});

/**
 * Message for an attempt to submit while the application is in a state that does
 * not accept one.
 *
 * It names the state, because the candidate is being told what to do next (wait,
 * or nothing at all if they are already verified) and a vague error would leave
 * them resubmitting forever.
 */
const describeBlockedStatus = (status: AuthorityVerificationStatus): string => {
  switch (status) {
    case 'VERIFIED':
      return 'Your authority account is already verified.';
    case 'PENDING':
      return 'Your application is already under review.';
    default:
      return 'Your application cannot be submitted in its current state.';
  }
};

/**
 * The candidate's own application, or null when they have never applied.
 *
 * A null result is a normal 200 with `application: null` rather than a 404: "you
 * have not applied yet" is the expected state of every new candidate, not a
 * missing resource.
 */
export const getMyAuthorityApplication = async (
  userId: string,
): Promise<SafeAuthorityApplication | null> => {
  const application = await authorityDao.findAuthorityApplicationByUserId(userId);

  return application ? toSafeAuthorityApplication(application) : null;
};

/**
 * Submits a first application, or re-submits a rejected one.
 *
 * One endpoint for both, because the candidate's intent is identical ("here is my
 * corrected information") and the server can tell them apart from the stored
 * status. Splitting it into `/submit` and `/resubmit` would only add a second door
 * to the same state.
 *
 * 409 when an application already exists in a status that does not accept a
 * submission: PENDING (already queued) or VERIFIED (already an authority).
 */
export const submitAuthorityApplication = async (
  params: SubmitAuthorityApplicationParams,
): Promise<SafeAuthorityApplication> => {
  const { userId, body, documentFile } = params;

  // Throws a ZodError, which the error middleware maps to a 400 with details.
  const payload = submitAuthorityApplicationSchema.parse(body);

  if (!documentFile) {
    throw new BadRequestError(
      'A government identity document is required. Send it in the "document" field',
      'DOCUMENT_REQUIRED',
    );
  }

  const existing = await authorityDao.findAuthorityApplicationByUserId(userId);

  if (existing && existing.verificationStatus !== RESUBMITTABLE_AUTHORITY_STATUS) {
    throw new ConflictError(
      describeBlockedStatus(existing.verificationStatus),
      existing.verificationStatus === 'VERIFIED'
        ? 'AUTHORITY_ALREADY_VERIFIED'
        : 'APPLICATION_NOT_RESUBMITTABLE',
    );
  }

  // The document bytes leave the process here: only a reference comes back, and
  // the stored URL is private in ImageKit and never returned to the candidate.
  const document = await authorityDocumentService.uploadAuthorityDocument(documentFile);

  const data: CreateAuthorityApplicationData = {
    userId,
    fullName: payload.fullName,
    dateOfBirth: payload.dateOfBirth,
    phone: payload.phone,
    email: payload.email,
    address: payload.address,
    governmentIdType: payload.governmentIdType,
    // Already separator-stripped and length-checked by the schema; the mask and the
    // stored last4 are both derived from this exact form, so all three agree.
    governmentIdNumber: payload.governmentIdNumber,
    governmentIdLast4: governmentIdLast4(payload.governmentIdNumber),
    documentUrl: document.documentUrl,
    documentFileId: document.documentFileId,
    documentMimeType: document.mimeType,
    department: payload.department,
    designation: payload.designation,
    skills: payload.skills,
    jurisdictionType: payload.jurisdictionType,
    jurisdictionName: payload.jurisdictionName,
    availability: payload.availability,
  };

  const application: AuthorityApplication | null = existing
    ? await authorityDao.resubmitAuthorityApplication(existing.id, userId, data)
    : await authorityDao.createAuthorityApplication(data);

  if (!application) {
    // Two concurrent submissions from the same candidate: one won, this one lost,
    // and the stored status is no longer REJECTED so it cannot be re-submitted.
    throw new ConflictError(
      'Your application was updated while this request was in flight. Reload and try again.',
      'APPLICATION_STATE_CHANGED',
    );
  }

  if (application.verificationStatus !== INITIAL_AUTHORITY_VERIFICATION_STATUS) {
    // Unreachable: neither write accepts a status, and both target PENDING.
    // Reported as a 500 because it would be our bug, not the caller's.
    throw new InternalServerError(
      'Application was submitted with an unexpected status',
      'UNEXPECTED_APPLICATION_STATUS',
    );
  }

  return toSafeAuthorityApplication(application);
};