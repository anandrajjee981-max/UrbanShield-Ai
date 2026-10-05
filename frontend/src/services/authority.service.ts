import { api, getApiErrorMessage, type ApiSuccess } from './api';

/**
 * Authority candidate API layer (/api/authority/...).
 *
 * Backend contract (backend/src):
 * - All routes require role AUTHORITY (cookie session). CITIZEN/ADMIN get 403.
 * - GET /application/options → closed vocabularies — the form MUST be built
 *   from these, never hardcoded, so it can't offer values the API rejects.
 * - GET /application → { application: SafeAuthorityApplication | null }
 *   (null = never applied yet, still a 200).
 * - POST /application → multipart with text fields + `document` file
 *   (jpg/png/webp/pdf, ≤8MB, REQUIRED). 201 on create, 409 when PENDING or
 *   VERIFIED. Only a REJECTED application may be re-submitted (same endpoint).
 * - GET /profile → { profile | null }, 403 AUTHORITY_NOT_VERIFIED unless the
 *   candidate's application is VERIFIED.
 */

export type AuthorityVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AuthorityApplicationOptions {
  departments: string[];
  designations: string[];
  skills: string[];
  jurisdictionTypes: string[];
  availabilities: string[];
  governmentIdTypes: string[];
  verificationStatuses: AuthorityVerificationStatus[];
}

/** Candidate-facing application view — masked ID, no document URL. */
export interface MyAuthorityApplication {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: string;
  governmentIdMasked: string;
  hasDocument: boolean;
  documentMimeType: string | null;
  department: string;
  designation: string;
  skills: string[];
  jurisdictionType: string;
  jurisdictionName: string;
  availability: string;
  verificationStatus: AuthorityVerificationStatus;
  rejectionReason: string | null;
  submittedAt: string;
  verifiedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorityProfile {
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  skills: string[];
  jurisdictionType: string;
  jurisdictionName: string;
  availability: string;
  verificationStatus: AuthorityVerificationStatus;
  verifiedAt: string | null;
}

export interface SubmitApplicationInput {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: string;
  governmentIdNumber: string;
  department: string;
  designation: string;
  /** Multi-select — sent comma-joined; the backend also accepts JSON/repeated keys. */
  skills: string[];
  jurisdictionType: string;
  jurisdictionName: string;
  availability?: string;
  /** Identity proof (jpg/png/webp/pdf ≤8MB). Always required, incl. resubmit. */
  document: File;
}

export { getApiErrorMessage };

export async function fetchApplicationOptionsRequest(): Promise<AuthorityApplicationOptions> {
  const res = await api.get<ApiSuccess<{ options: AuthorityApplicationOptions }>>(
    '/authority/application/options',
  );
  return res.data.data.options;
}

export async function fetchMyApplicationRequest(): Promise<MyAuthorityApplication | null> {
  const res = await api.get<ApiSuccess<{ application: MyAuthorityApplication | null }>>(
    '/authority/application',
  );
  return res.data.data.application;
}

export async function submitApplicationRequest(
  input: SubmitApplicationInput,
): Promise<MyAuthorityApplication> {
  const form = new FormData();
  form.append('fullName', input.fullName.trim());
  form.append('dateOfBirth', input.dateOfBirth.trim());
  form.append('phone', input.phone.trim());
  form.append('email', input.email.trim());
  form.append('address', input.address.trim());
  form.append('governmentIdType', input.governmentIdType);
  form.append('governmentIdNumber', input.governmentIdNumber.trim());
  form.append('department', input.department);
  form.append('designation', input.designation);
  form.append('skills', input.skills.join(','));
  form.append('jurisdictionType', input.jurisdictionType);
  form.append('jurisdictionName', input.jurisdictionName.trim());
  if (input.availability) form.append('availability', input.availability);
  form.append('document', input.document);
  const res = await api.post<ApiSuccess<{ application: MyAuthorityApplication }>>(
    '/authority/application',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data.application;
}

export async function fetchAuthorityProfileRequest(): Promise<AuthorityProfile | null> {
  const res = await api.get<ApiSuccess<{ profile: AuthorityProfile | null }>>('/authority/profile');
  return res.data.data.profile;
}
