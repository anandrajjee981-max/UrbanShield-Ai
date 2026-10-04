import axios, { AxiosError } from 'axios';

/**
 * Real backend client for UrbanShield-Ai.
 *
 * Backend contract (backend/src):
 * - Base: /api, forwarded to the backend by the Vite proxy in development.
 * - Auth is cookie-only: POST /auth/register|/login writes an HTTP-only
 *   `access_token` cookie. The browser replays it automatically, so
 *   `withCredentials: true` is required and no token is stored in JS.
 * - Envelope: { success: true, message, data } / { success: false, message, code, errors? }
 * - Issues: POST /issues/ (JSON or multipart with `image` field),
 *   POST /issues/upload, GET /issues/my
 * - Admin: GET /admin/issues, GET /admin/issues/:id,
 *   PATCH /admin/issues/:id/verify, PATCH /admin/issues/:id/reject
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  // Required: browser only sends the `access_token` cookie when this is set
  // and backend CORS allows the exact frontend origin with credentials: true.
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Shared envelope + error helper
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  code: string;
  errors?: string[];
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as Partial<ApiFailure> | undefined;
    if (data?.errors?.length) return data.errors.join('\n');
    if (typeof data?.message === 'string' && data.message.length > 0) return data.message;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (error.message === 'Network Error') {
      return 'Cannot reach the backend. Check that the backend service is running and can connect to its database.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

// ---------------------------------------------------------------------------
// Backend shapes (mirror backend/src/models/* + validation/*)
// ---------------------------------------------------------------------------

export type BackendRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN';

export interface BackendUser {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  createdAt: string;
  updatedAt: string;
}

export type BackendIssueType =
  | 'WATER_LEAKAGE'
  | 'WATER_SHORTAGE'
  | 'EXTREME_HEAT'
  | 'FLOODING'
  | 'DRAINAGE'
  | 'OTHER';

export type BackendIssueStatus =
  | 'REPORTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED';

export type BackendLocationType = 'GPS' | 'MANUAL';

/** POST /api/issues body (JSON variant — multipart uses the same fields + `image` file). */
export type CreateIssueBody =
  | {
      issueType: BackendIssueType;
      description: string;
      locationType: 'GPS';
      latitude: number;
      longitude: number;
      imageUrl?: string;
      imageFileId?: string;
    }
  | {
      issueType: BackendIssueType;
      description: string;
      locationType: 'MANUAL';
      address: string;
      imageUrl?: string;
      imageFileId?: string;
    };

export interface BackendSafeIssue {
  id: string;
  issueType: BackendIssueType;
  description: string;
  imageUrl: string | null;
  locationType: BackendLocationType;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  status: BackendIssueStatus;
  skillRequired: string | null;
  complexity: string | null;
  effortHours: number | null;
  aiAnalyzedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendAdminIssue extends BackendSafeIssue {
  citizen: { name: string; email: string };
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  assignedTo: string | null;
  assignee: { name: string; email: string } | null;
  assignedBy: string | null;
}

export interface WorkflowAnalysis {
  skillRequired: string;
  complexity: string;
  effortHours: number;
  analyzedAt: string;
}

export interface WorkforceMember {
  id: string;
  name: string;
  email: string;
  activeAssignments: number;
  available: boolean;
}

export interface AssignmentCandidate {
  authority: WorkforceMember;
  score: number;
  reason: string;
}

export interface AssignmentRecommendation {
  issueId: string;
  analysis: WorkflowAnalysis;
  workforce: WorkforceMember[];
  ranking: AssignmentCandidate[];
  recommendedAuthorityId: string | null;
}

// ---------------------------------------------------------------------------
// Auth — POST /api/auth/*
// ---------------------------------------------------------------------------

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
  role?: 'CITIZEN' | 'AUTHORITY';
}): Promise<BackendUser> {
  const res = await api.post<ApiSuccess<{ user: BackendUser }>>('/auth/register', input);
  return res.data.data.user;
}

export async function loginRequest(input: { email: string; password: string }): Promise<BackendUser> {
  const res = await api.post<ApiSuccess<{ user: BackendUser }>>('/auth/login', input);
  return res.data.data.user;
}

export async function fetchMeRequest(): Promise<BackendUser> {
  const res = await api.get<ApiSuccess<{ user: BackendUser }>>('/auth/me');
  return res.data.data.user;
}

export async function logoutRequest(): Promise<void> {
  await api.post('/auth/logout');
}

// ---------------------------------------------------------------------------
// Citizen issues — /api/issues
// ---------------------------------------------------------------------------

export async function fetchMyIssuesRequest(): Promise<BackendSafeIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: BackendSafeIssue[] }>>('/issues/my');
  return res.data.data.issues;
}

/** Standalone photo upload — returns the reference to send with createIssue. */
export async function uploadIssuePhotoRequest(
  file: File,
): Promise<{ imageUrl: string; imageFileId: string }> {
  const form = new FormData();
  form.append('image', file);
  const res = await api.post<ApiSuccess<{ imageUrl: string; imageFileId: string }>>(
    '/issues/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

/**
 * Creates an issue. When `photo` is given it is sent as multipart `image`
 * together with the fields; otherwise plain JSON is sent.
 */
export async function createIssueRequest(
  body: CreateIssueBody,
  photo?: File | null,
): Promise<BackendSafeIssue> {
  if (photo) {
    const form = new FormData();
    form.append('issueType', body.issueType);
    form.append('description', body.description);
    form.append('locationType', body.locationType);
    if (body.locationType === 'GPS') {
      form.append('latitude', String(body.latitude));
      form.append('longitude', String(body.longitude));
    } else {
      form.append('address', body.address);
    }
    form.append('image', photo);
    const res = await api.post<ApiSuccess<{ issue: BackendSafeIssue }>>('/issues/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.issue;
  }
  const res = await api.post<ApiSuccess<{ issue: BackendSafeIssue }>>('/issues/', body);
  return res.data.data.issue;
}

// ---------------------------------------------------------------------------
// Admin review — /api/admin/issues (requires ADMIN cookie session)
// ---------------------------------------------------------------------------

export async function adminListIssuesRequest(params?: {
  status?: 'REPORTED' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';
  limit?: number;
}): Promise<BackendAdminIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: BackendAdminIssue[] }>>('/admin/issues', {
    params,
  });
  return res.data.data.issues;
}

export async function adminGetIssueRequest(issueId: string): Promise<BackendAdminIssue> {
  const res = await api.get<ApiSuccess<{ issue: BackendAdminIssue }>>(`/admin/issues/${issueId}`);
  return res.data.data.issue;
}

export async function adminVerifyIssueRequest(issueId: string): Promise<BackendAdminIssue> {
  const res = await api.patch<ApiSuccess<{ issue: BackendAdminIssue }>>(
    `/admin/issues/${issueId}/verify`,
    {},
  );
  return res.data.data.issue;
}

export async function adminRejectIssueRequest(
  issueId: string,
  reason?: string,
): Promise<BackendAdminIssue> {
  const res = await api.patch<ApiSuccess<{ issue: BackendAdminIssue }>>(
    `/admin/issues/${issueId}/reject`,
    reason ? { reason } : {},
  );
  return res.data.data.issue;
}

/** Permanently removes a REJECTED issue (ADMIN cleanup). */
export async function deleteRejectedIssueRequest(issueId: string): Promise<{ id: string }> {
  const res = await api.delete<ApiSuccess<{ deleted: { id: string } }>>(`/admin/issues/${issueId}`);
  return res.data.data.deleted;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    // /health lives on the server root, not under /api
    const res = await axios.get(`${API_BASE_URL.replace(/\/api\/?$/, '')}/health`, {
      timeout: 5000,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Admin assignment workflow — VERIFIED -> (AI analysis + recommendation) -> ASSIGNED
// ---------------------------------------------------------------------------

export async function analyzeIssueRequest(issueId: string): Promise<BackendAdminIssue> {
  const res = await api.post<ApiSuccess<{ issue: BackendAdminIssue }>>(
    `/admin/issues/${issueId}/analyze`,
    {},
  );
  return res.data.data.issue;
}

export async function recommendAssignmentRequest(issueId: string): Promise<AssignmentRecommendation> {
  const res = await api.get<ApiSuccess<{ recommendation: AssignmentRecommendation }>>(
    `/admin/issues/${issueId}/recommendation`,
  );
  return res.data.data.recommendation;
}

export async function assignIssueRequest(issueId: string, authorityId: string): Promise<BackendAdminIssue> {
  const res = await api.post<ApiSuccess<{ issue: BackendAdminIssue }>>(
    `/admin/issues/${issueId}/assign`,
    { authorityId },
  );
  return res.data.data.issue;
}

export async function fetchWorkforceRequest(): Promise<WorkforceMember[]> {
  const res = await api.get<ApiSuccess<{ workforce: WorkforceMember[] }>>('/admin/issues/workforce');
  return res.data.data.workforce;
}

// ---------------------------------------------------------------------------
// Authority field workflow — ASSIGNED -> IN_PROGRESS -> RESOLVED
// ---------------------------------------------------------------------------

export async function fetchMyTasksRequest(): Promise<BackendSafeIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: BackendSafeIssue[] }>>('/authority/issues');
  return res.data.data.issues;
}

/**
 * Every citizen report on the city (read-only browse for AUTHORITY staff).
 * Any issue a citizen reports appears here from REPORTED onwards, with the
 * reporter and assignee context attached.
 */
export async function browseReportsRequest(status?: string): Promise<BackendAdminIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: BackendAdminIssue[] }>>('/authority/issues/browse', {
    params: status ? { status } : undefined,
  });
  return res.data.data.issues;
}

export async function startTaskRequest(issueId: string): Promise<BackendSafeIssue> {
  const res = await api.patch<ApiSuccess<{ issue: BackendSafeIssue }>>(
    `/authority/issues/${issueId}/start`,
    {},
  );
  return res.data.data.issue;
}

export async function resolveTaskRequest(issueId: string, note?: string): Promise<BackendSafeIssue> {
  const res = await api.patch<ApiSuccess<{ issue: BackendSafeIssue }>>(
    `/authority/issues/${issueId}/resolve`,
    note ? { note } : {},
  );
  return res.data.data.issue;
}
