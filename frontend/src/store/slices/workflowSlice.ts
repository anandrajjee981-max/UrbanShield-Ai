import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  adminGetIssueRequest,
  adminListIssuesRequest,
  authorityRejectIssueRequest,
  authorityVerifyIssueRequest,
  fetchMyTasksRequest,
  getApiErrorMessage,
  type AuthorityTaskIssue,
  type BackendAdminIssue,
  type ReviewStageStatus,
} from '../../services/api';

/**
 * Post-report lifecycle state, wired only to endpoints that exist:
 * - ADMIN reads: GET /api/admin/issues (via adminList/GetIssueRequest)
 * - AUTHORITY review queue + verify/reject: /api/authority/issues
 *
 * There is deliberately no analyze/recommend/assign/workforce/browse/start/
 * resolve here — those backend modules do not exist yet, and the previous
 * thunks targeting them failed with 404 on every call.
 */

export type ReviewQueueStatus = ReviewStageStatus;

export const fetchReviewQueue = createAsyncThunk<
  BackendAdminIssue[],
  { status?: ReviewQueueStatus; limit?: number } | void,
  { rejectValue: string }
>('workflow/fetchQueue', async (args, { rejectWithValue }) => {
  try {
    return await adminListIssuesRequest(args ? { status: args.status, limit: args.limit } : undefined);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load the review queue.'));
  }
});

export const fetchReviewIssue = createAsyncThunk<BackendAdminIssue, string, { rejectValue: string }>(
  'workflow/fetchIssue',
  async (issueId, { rejectWithValue }) => {
    try {
      return await adminGetIssueRequest(issueId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load the issue.'));
    }
  },
);

/** REPORTED -> VERIFIED (verified AUTHORITY only). Body is exactly {}. */
export const authorityVerifyIssueThunk = createAsyncThunk<
  AuthorityTaskIssue,
  string,
  { rejectValue: string }
>('workflow/authorityVerify', async (issueId, { rejectWithValue }) => {
  try {
    return await authorityVerifyIssueRequest(issueId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not verify the issue.'));
  }
});

/** REPORTED -> REJECTED (verified AUTHORITY only). Only an optional reason is sent. */
export const authorityRejectIssueThunk = createAsyncThunk<
  AuthorityTaskIssue,
  { issueId: string; reason?: string },
  { rejectValue: string }
>('workflow/authorityReject', async ({ issueId, reason }, { rejectWithValue }) => {
  try {
    return await authorityRejectIssueRequest(issueId, reason);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not reject the issue.'));
  }
});

/** Authority review queue (GET /api/authority/issues, verified AUTHORITY only). */
export const fetchMyTasks = createAsyncThunk<
  AuthorityTaskIssue[],
  { status?: ReviewQueueStatus } | void,
  { rejectValue: string }
>('workflow/myTasks', async (args, { rejectWithValue }) => {
  try {
    return await fetchMyTasksRequest(args ? { status: args.status } : undefined);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load your tasks.'));
  }
});

interface WorkflowState {
  /** ADMIN monitoring queue (GET /admin/issues). */
  queue: BackendAdminIssue[];
  queueLoading: boolean;
  selected: BackendAdminIssue | null;
  selectedLoading: boolean;
  /** AUTHORITY review queue (GET /authority/issues). */
  tasks: AuthorityTaskIssue[];
  tasksLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  queue: [],
  queueLoading: false,
  selected: null,
  selectedLoading: false,
  tasks: [],
  tasksLoading: false,
  actionLoading: false,
  error: null,
};

/** Keeps the authority queue in sync after a verify/reject transition. */
function upsertTask(state: WorkflowState, issue: AuthorityTaskIssue) {
  const idx = state.tasks.findIndex((t) => t.id === issue.id);
  if (idx >= 0) state.tasks[idx] = issue;
  else state.tasks.unshift(issue);
}

const slice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    clearWorkflowError: (s) => {
      s.error = null;
    },
    clearSelection: (s) => {
      s.selected = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchReviewQueue.pending, (s) => { s.queueLoading = true; s.error = null; });
    b.addCase(fetchReviewQueue.fulfilled, (s, a) => { s.queueLoading = false; s.queue = a.payload; });
    b.addCase(fetchReviewQueue.rejected, (s, a) => {
      s.queueLoading = false;
      s.error = a.payload ?? 'Could not load the review queue.';
    });
    b.addCase(fetchReviewIssue.pending, (s) => { s.selectedLoading = true; s.error = null; });
    b.addCase(fetchReviewIssue.fulfilled, (s, a) => { s.selectedLoading = false; s.selected = a.payload; });
    b.addCase(fetchReviewIssue.rejected, (s, a) => {
      s.selectedLoading = false;
      s.error = a.payload ?? 'Could not load the issue.';
    });
    b.addCase(authorityVerifyIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(authorityVerifyIssueThunk.fulfilled, (s, a) => {
      s.actionLoading = false;
      upsertTask(s, a.payload);
    });
    b.addCase(authorityVerifyIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not verify the issue.';
    });
    b.addCase(authorityRejectIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(authorityRejectIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not reject the issue.';
    });
    b.addCase(authorityRejectIssueThunk.fulfilled, (s, a) => {
      s.actionLoading = false;
      upsertTask(s, a.payload);
    });
    b.addCase(fetchMyTasks.pending, (s) => { s.tasksLoading = true; s.error = null; });
    b.addCase(fetchMyTasks.fulfilled, (s, a) => { s.tasksLoading = false; s.tasks = a.payload; });
    b.addCase(fetchMyTasks.rejected, (s, a) => {
      s.tasksLoading = false;
      s.error = a.payload ?? 'Could not load your tasks.';
    });
  },
});

export const { clearWorkflowError, clearSelection } = slice.actions;
export default slice.reducer;
