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
 *   POST /issues/upload, GET /issues/my, DELETE /issues/:id (own report only)
 * - Admin: GET /admin/issues, GET /admin/issues/:issueId (monitoring only —
 *   no issue status transitions; verification belongs to /authority/issues).
 *   Authority applications live in services/admin.service.ts.
 * - Authority: GET /authority/issues (review queue), GET /:issueId,
 *   PATCH /:issueId/verify ({}), PATCH /:issueId/reject ({reason?}).
 *   No browse/start/resolve/assign/analyze/workforce endpoints exist yet.
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

/**
 * Citizen's own report, exactly as GET /api/issues/my returns it
 * (backend toSafeIssue — no review metadata, no analysis fields).
 */
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
  createdAt: string;
  updatedAt: string;
}

/**
 * Authority review shape (GET /api/authority/issues...): the report plus the
 * verify/reject metadata a reviewer needs. No citizen identity, no analysis
 * or assignment fields — those modules do not exist on the backend yet.
 */
export interface AuthorityTaskIssue extends BackendSafeIssue {
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
}

/**
 * Admin monitoring shape (GET /api/admin/issues...): the authority review
 * shape plus the reporting citizen. Read-only.
 */
export interface BackendAdminIssue extends AuthorityTaskIssue {
  citizen: { name: string; email: string };
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

/** Deletes one of the caller's own reports — DELETE /api/issues/:id */
export async function deleteIssueRequest(issueId: string): Promise<string> {
  const res = await api.delete<ApiSuccess<{ issueId: string }>>(`/issues/${issueId}`);
  return res.data.data.issueId;
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

/** Statuses the backend accepts in `?status=` (review stage only). */
export type ReviewStageStatus = 'REPORTED' | 'VERIFIED' | 'REJECTED';

export async function adminListIssuesRequest(params?: {
  status?: ReviewStageStatus;
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

// ---------------------------------------------------------------------------
// Authority review — /api/authority/issues (verified AUTHORITY only)
// ---------------------------------------------------------------------------

/** REPORTED -> VERIFIED. Body is exactly {} — the endpoint decides everything. */
export async function authorityVerifyIssueRequest(issueId: string): Promise<AuthorityTaskIssue> {
  const res = await api.patch<ApiSuccess<{ issue: AuthorityTaskIssue }>>(
    `/authority/issues/${issueId}/verify`,
    {},
  );
  return res.data.data.issue;
}

/** REPORTED -> REJECTED. Only an optional reason may be sent. */
export async function authorityRejectIssueRequest(
  issueId: string,
  reason?: string,
): Promise<AuthorityTaskIssue> {
  const trimmed = reason?.trim();
  const res = await api.patch<ApiSuccess<{ issue: AuthorityTaskIssue }>>(
    `/authority/issues/${issueId}/reject`,
    trimmed ? { reason: trimmed } : {},
  );
  return res.data.data.issue;
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
// Authority review queue — GET /api/authority/issues (verified AUTHORITY only)
// ---------------------------------------------------------------------------

/**
 * The authority review queue (REPORTED/VERIFIED/REJECTED with review
 * metadata). There is no separate "my tasks" endpoint yet — assignment is a
 * future module — so this queue is what AUTHORITY screens are built on.
 */
export async function fetchMyTasksRequest(params?: {
  status?: ReviewStageStatus;
  limit?: number;
}): Promise<AuthorityTaskIssue[]> {
  const res = await api.get<ApiSuccess<{ issues: AuthorityTaskIssue[] }>>('/authority/issues', {
    params,
  });
  return res.data.data.issues;
}

// ---------------------------------------------------------------------------
// Authority "My Tasks" — GET/PATCH /api/authority/tasks (verified AUTHORITY)
// ---------------------------------------------------------------------------

export type AssignedTaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AssignedTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AssignedTask {
  id: string;
  issueId: string;
  title: string | null;
  issueType: string;
  description: string;
  imageUrl: string | null;
  location: { type: 'GPS'; latitude: number; longitude: number } | { type: 'MANUAL'; address: string };
  requiredSkill: string;
  requiredJurisdiction: string | null;
  estimatedDurationMinutes: number;
  complexity: string;
  status: AssignedTaskStatus;
  priority: AssignedTaskPriority;
  dueDate: string | null;
  assignedBy: string | null;
  completedAt: string | null;
  rejectionReason: string | null;
  workNotes: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCounts {
  pending: number;
  inProgress: number;
  overdue: number;
  completed: number;
  total: number;
}

export interface TaskComment {
  id: string;
  body: string;
  authorRole: string;
  authorName: string | null;
  createdAt: string;
}

export async function fetchAssignedTasksRequest(params?: {
  status?: AssignedTaskStatus;
  priority?: AssignedTaskPriority;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{ tasks: AssignedTask[]; counts: TaskCounts }> {
  const res = await api.get<ApiSuccess<{ tasks: AssignedTask[]; counts: TaskCounts }>>(
    '/authority/tasks',
    { params },
  );
  return res.data.data;
}

export async function fetchAssignedTaskRequest(
  taskId: string,
): Promise<{ task: AssignedTask; comments: TaskComment[] }> {
  const res = await api.get<ApiSuccess<{ task: AssignedTask; comments: TaskComment[] }>>(
    `/authority/tasks/${taskId}`,
  );
  return res.data.data;
}

export async function updateAssignedTaskStatusRequest(
  taskId: string,
  input: { status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; note?: string; reason?: string },
): Promise<AssignedTask> {
  const res = await api.patch<ApiSuccess<{ task: AssignedTask }>>(
    `/authority/tasks/${taskId}/status`,
    input,
  );
  return res.data.data.task;
}

export async function fetchTaskCommentsRequest(taskId: string): Promise<TaskComment[]> {
  const res = await api.get<ApiSuccess<{ comments: TaskComment[] }>>(
    `/authority/tasks/${taskId}/comments`,
  );
  return res.data.data.comments;
}

export async function postTaskCommentRequest(taskId: string, body: string): Promise<TaskComment> {
  const res = await api.post<ApiSuccess<{ comment: TaskComment }>>(
    `/authority/tasks/${taskId}/comments`,
    { body },
  );
  return res.data.data.comment;
}
