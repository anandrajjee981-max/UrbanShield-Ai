import { api, getApiErrorMessage, type ApiSuccess } from './api';

/**
 * Admin API service layer for the UrbanShieldAI operations console.
 *
 * Backend contract (backend/src):
 * - Auth: JWT HTTP-only cookie, `withCredentials: true` (centralised in `api`).
 * - All routes require role ADMIN (backend returns 401/403 otherwise).
 * - Issues are READ-ONLY: GET /api/admin/issues, GET /api/admin/issues/:issueId.
 *   There is deliberately no verify/reject/status PATCH for issues.
 * - Authority applications: GET list/detail, GET audit, PATCH verify ({} body),
 *   PATCH reject ({ reason? } body). Bodies are strict — never send role,
 *   adminId, verificationStatus or arbitrary status fields.
 */

// ---------------------------------------------------------------------------
// Types (mirror backend/src/models/*)
// ---------------------------------------------------------------------------

/** Statuses the backend accepts in `?status=` — the review stage only. */
export type AdminIssueStatus = 'REPORTED' | 'VERIFIED' | 'REJECTED';

export type AuthorityVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AdminMonitoredIssue {
  id: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  locationType: 'GPS' | 'MANUAL';
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  /** Any lifecycle status the backend returns (filter type stays narrow). */
  status: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  citizen: { name: string; email: string };
  // Assignment context is informational only; absent until the task-assignment
  // module lands. Kept optional so the UI degrades to "Unassigned".
  assignedTo?: string | null;
  assignee?: { name: string; email: string } | null;
  assignedAt?: string | null;
}

export interface AdminAuthorityApplication {
  id: string;
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  governmentIdType: string;
  /** Masked server-side (e.g. XXXX-XXXX-9012). Never a raw ID number. */
  governmentIdMasked: string;
  /** Private document reference — rendered behind a "View Document" action. */
  documentUrl: string | null;
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
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  account: { email: string; role: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthorityAuditEntry {
  id: string;
  action: 'SUBMIT' | 'RESUBMIT' | 'VERIFY' | 'REJECT';
  previousStatus: AuthorityVerificationStatus | null;
  newStatus: AuthorityVerificationStatus;
  reason: string | null;
  adminId: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalIssues: number;
  pendingIssues: number;
  criticalIssues: number;
  totalApplications: number;
  pendingApplications: number;
  verifiedAuthorities: number;
  resolvedIssues: number;
  rejectedIssues: number;
}

export { getApiErrorMessage };

// ---------------------------------------------------------------------------
// User provisioning (ADMIN only)
// ---------------------------------------------------------------------------

export type ProvisionableRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';

export interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: ProvisionableRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/admin/users — create any account type, including ADMIN.
 * The public register endpoint can never do this (backend rejects it).
 */
export async function adminCreateUserRequest(input: {
  name: string;
  email: string;
  password: string;
  role: ProvisionableRole;
}): Promise<CreatedUser> {
  const res = await api.post<ApiSuccess<{ user: CreatedUser }>>('/admin/users', input);
  return res.data.data.user;
}

// ---------------------------------------------------------------------------
// Issue monitoring (read-only)
// ---------------------------------------------------------------------------

export async function fetchAdminIssuesRequest(params?: {
  status?: AdminIssueStatus;
  limit?: number;
}): Promise<AdminMonitoredIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: AdminMonitoredIssue[] }>>('/admin/issues', {
    params: { ...(params?.status ? { status: params.status } : {}), limit: params?.limit ?? 100 },
  });
  return res.data.data.issues;
}

export async function fetchAdminIssueByIdRequest(issueId: string): Promise<AdminMonitoredIssue> {
  const res = await api.get<ApiSuccess<{ issue: AdminMonitoredIssue }>>(
    `/admin/issues/${issueId}`,
  );
  return res.data.data.issue;
}

// ---------------------------------------------------------------------------
// Authority applications
// ---------------------------------------------------------------------------

export async function fetchAuthorityApplicationsRequest(params?: {
  status?: AuthorityVerificationStatus;
  limit?: number;
}): Promise<AdminAuthorityApplication[]> {
  const res = await api.get<ApiSuccess<{ applications: AdminAuthorityApplication[] }>>(
    '/admin/authority-applications',
    { params: { ...(params?.status ? { status: params.status } : {}), limit: params?.limit ?? 100 } },
  );
  return res.data.data.applications;
}

export async function fetchAuthorityApplicationByIdRequest(
  applicationId: string,
): Promise<AdminAuthorityApplication> {
  const res = await api.get<ApiSuccess<{ application: AdminAuthorityApplication }>>(
    `/admin/authority-applications/${applicationId}`,
  );
  return res.data.data.application;
}

export async function fetchAuthorityAuditTrailRequest(
  applicationId: string,
): Promise<AuthorityAuditEntry[]> {
  const res = await api.get<ApiSuccess<{ entries: AuthorityAuditEntry[] }>>(
    `/admin/authority-applications/${applicationId}/audit`,
  );
  return res.data.data.entries;
}

/**
 * PATCH /api/admin/authority-applications/:id/verify
 * Body must be exactly `{}` — the endpoint decides the transition and the
 * reviewer (from the JWT cookie). Never send role/adminId/verificationStatus.
 */
export async function verifyAuthorityApplicationRequest(
  applicationId: string,
): Promise<AdminAuthorityApplication> {
  const res = await api.patch<ApiSuccess<{ application: AdminAuthorityApplication }>>(
    `/admin/authority-applications/${applicationId}/verify`,
    {},
  );
  return res.data.data.application;
}

/**
 * PATCH /api/admin/authority-applications/:id/reject
 * Only `reason` (optional) may be sent. Never send arbitrary status fields.
 */
export async function rejectAuthorityApplicationRequest(
  applicationId: string,
  reason?: string,
): Promise<AdminAuthorityApplication> {
  const trimmed = reason?.trim();
  const res = await api.patch<ApiSuccess<{ application: AdminAuthorityApplication }>>(
    `/admin/authority-applications/${applicationId}/reject`,
    trimmed ? { reason: trimmed } : {},
  );
  return res.data.data.application;
}

// ---------------------------------------------------------------------------
// Manual task assignment (ADMIN only)
// ---------------------------------------------------------------------------

export async function adminAssignTaskRequest(input: {
  issueId: string;
  authorityApplicationId: string;
  title?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate?: string;
}): Promise<{ taskId: string }> {
  const res = await api.post<ApiSuccess<{ taskId: string; task: unknown }>>(
    '/admin/tasks/assign',
    input,
  );
  return { taskId: res.data.data.taskId };
}

export async function adminListAssignmentsRequest(): Promise<import('./api').AssignedTask[]> {
  const res = await api.get<ApiSuccess<{ tasks: import('./api').AssignedTask[] }>>(
    '/admin/tasks/assignments',
  );
  return res.data.data.tasks;
}

// ---------------------------------------------------------------------------
// AI retry bucket (ADMIN only) — GET /api/admin/tasks/queue, POST /queue/resend
// ---------------------------------------------------------------------------

export type RetryQueueStage = 'WATCHER' | 'BOSS' | 'ELIGIBILITY' | 'ASSIGNMENT';
export type RetryQueueStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED';

export interface RetryQueuePayload {
  issueId: string;
  issueType: string;
  description: string;
  imageUrl: string | null;
  locationType: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  issueStatus: string;
}

export interface RetryQueueEntry {
  id: string;
  issueId: string;
  stage: RetryQueueStage;
  failureCode: string | null;
  payload: RetryQueuePayload;
  status: RetryQueueStatus;
  attempts: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetryQueueDrainResult {
  claimed: number;
  completed: number;
  requeued: number;
}

export async function fetchRetryQueueRequest(status?: RetryQueueStatus): Promise<RetryQueueEntry[]> {
  const res = await api.get<ApiSuccess<{ entries: RetryQueueEntry[] }>>('/admin/tasks/queue', {
    params: status ? { status } : {},
  });
  return res.data.data.entries;
}

export async function resendRetryQueueRequest(): Promise<RetryQueueDrainResult> {
  const res = await api.post<ApiSuccess<RetryQueueDrainResult>>('/admin/tasks/queue/resend', {});
  return res.data.data;
}
