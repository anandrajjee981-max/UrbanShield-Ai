import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  adminGetIssueRequest,
  adminListIssuesRequest,
  adminRejectIssueRequest,
  adminVerifyIssueRequest,
  analyzeIssueRequest,
  assignIssueRequest,
  browseReportsRequest,
  deleteRejectedIssueRequest,
  fetchMyTasksRequest,
  fetchWorkforceRequest,
  getApiErrorMessage,
  recommendAssignmentRequest,
  resolveTaskRequest,
  startTaskRequest,
  type AssignmentRecommendation,
  type BackendAdminIssue,
  type BackendSafeIssue,
  type WorkforceMember,
} from '../../services/api';

// One slice for the whole post-report lifecycle so Admin Review and
// Authority Tasks share the same issue shapes and error handling:
//   REPORTED -> VERIFIED -> (AI analysis + recommendation) -> ASSIGNED
//     -> IN_PROGRESS -> RESOLVED   (REJECTED is terminal from REPORTED)

export type ReviewQueueStatus = 'REPORTED' | 'VERIFIED' | 'REJECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';

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

export const verifyIssueThunk = createAsyncThunk<BackendAdminIssue, string, { rejectValue: string }>(
  'workflow/verify',
  async (issueId, { rejectWithValue }) => {
    try {
      return await adminVerifyIssueRequest(issueId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not verify the issue.'));
    }
  },
);

export const rejectIssueThunk = createAsyncThunk<
  BackendAdminIssue,
  { issueId: string; reason?: string },
  { rejectValue: string }
>('workflow/reject', async ({ issueId, reason }, { rejectWithValue }) => {
  try {
    return await adminRejectIssueRequest(issueId, reason);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not reject the issue.'));
  }
});

/** Permanently removes a REJECTED issue from the queue. */
export const deleteRejectedIssueThunk = createAsyncThunk<string, string, { rejectValue: string }>(
  'workflow/deleteRejected',
  async (issueId, { rejectWithValue }) => {
    try {
      const deleted = await deleteRejectedIssueRequest(issueId);
      return deleted.id;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not delete the issue.'));
    }
  },
);

export const analyzeIssueThunk = createAsyncThunk<BackendAdminIssue, string, { rejectValue: string }>(
  'workflow/analyze',
  async (issueId, { rejectWithValue }) => {
    try {
      return await analyzeIssueRequest(issueId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not analyse the issue.'));
    }
  },
);

export const fetchRecommendation = createAsyncThunk<
  AssignmentRecommendation,
  string,
  { rejectValue: string }
>('workflow/recommendation', async (issueId, { rejectWithValue }) => {
  try {
    return await recommendAssignmentRequest(issueId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load the recommendation.'));
  }
});

export const assignIssueThunk = createAsyncThunk<
  BackendAdminIssue,
  { issueId: string; authorityId: string },
  { rejectValue: string }
>('workflow/assign', async ({ issueId, authorityId }, { rejectWithValue }) => {
  try {
    return await assignIssueRequest(issueId, authorityId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not assign the issue.'));
  }
});

export const fetchWorkforce = createAsyncThunk<WorkforceMember[], void, { rejectValue: string }>(
  'workflow/workforce',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchWorkforceRequest();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load the workforce.'));
    }
  },
);

export const fetchMyTasks = createAsyncThunk<BackendSafeIssue[], void, { rejectValue: string }>(
  'workflow/myTasks',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchMyTasksRequest();
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load your tasks.'));
    }
  },
);

/** Every citizen report on the city (AUTHORITY read-only browse). */
export const fetchBrowseReports = createAsyncThunk<
  BackendAdminIssue[],
  string | void,
  { rejectValue: string }
>('workflow/browse', async (status, { rejectWithValue }) => {
  try {
    return await browseReportsRequest(status ?? undefined);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load citizen reports.'));
  }
});

export const startTaskThunk = createAsyncThunk<BackendSafeIssue, string, { rejectValue: string }>(
  'workflow/startTask',
  async (issueId, { rejectWithValue }) => {
    try {
      return await startTaskRequest(issueId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not start the task.'));
    }
  },
);

export const resolveTaskThunk = createAsyncThunk<
  BackendSafeIssue,
  { issueId: string; note?: string },
  { rejectValue: string }
>('workflow/resolveTask', async ({ issueId, note }, { rejectWithValue }) => {
  try {
    return await resolveTaskRequest(issueId, note);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not resolve the task.'));
  }
});

interface WorkflowState {
  queue: BackendAdminIssue[];
  queueLoading: boolean;
  selected: BackendAdminIssue | null;
  selectedLoading: boolean;
  recommendation: AssignmentRecommendation | null;
  recommendationLoading: boolean;
  workforce: WorkforceMember[];
  workforceLoading: boolean;
  tasks: BackendSafeIssue[];
  tasksLoading: boolean;
  browse: BackendAdminIssue[];
  browseLoading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  queue: [],
  queueLoading: false,
  selected: null,
  selectedLoading: false,
  recommendation: null,
  recommendationLoading: false,
  workforce: [],
  workforceLoading: false,
  tasks: [],
  tasksLoading: false,
  browse: [],
  browseLoading: false,
  actionLoading: false,
  error: null,
};

/** Keeps the queue row and the open detail in sync after a transition. */
function upsertSelected(state: WorkflowState, issue: BackendAdminIssue) {
  state.selected = issue;
  const idx = state.queue.findIndex((q) => q.id === issue.id);
  if (idx >= 0) state.queue[idx] = issue;
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
      s.recommendation = null;
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
    b.addCase(verifyIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(verifyIssueThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertSelected(s, a.payload); });
    b.addCase(verifyIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not verify the issue.';
    });
    b.addCase(rejectIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(rejectIssueThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertSelected(s, a.payload); });
    b.addCase(rejectIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not reject the issue.';
    });
    b.addCase(deleteRejectedIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(deleteRejectedIssueThunk.fulfilled, (s, a) => {
      s.actionLoading = false;
      s.queue = s.queue.filter((q) => q.id !== a.payload);
      if (s.selected?.id === a.payload) {
        s.selected = null;
        s.recommendation = null;
      }
    });
    b.addCase(deleteRejectedIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not delete the issue.';
    });
    b.addCase(analyzeIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(analyzeIssueThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertSelected(s, a.payload); });
    b.addCase(analyzeIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not analyse the issue.';
    });
    b.addCase(fetchRecommendation.pending, (s) => { s.recommendationLoading = true; s.error = null; });
    b.addCase(fetchRecommendation.fulfilled, (s, a) => {
      s.recommendationLoading = false;
      s.recommendation = a.payload;
    });
    b.addCase(fetchRecommendation.rejected, (s, a) => {
      s.recommendationLoading = false;
      s.error = a.payload ?? 'Could not load the recommendation.';
    });
    b.addCase(assignIssueThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(assignIssueThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertSelected(s, a.payload); });
    b.addCase(assignIssueThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not assign the issue.';
    });
    b.addCase(fetchWorkforce.pending, (s) => { s.workforceLoading = true; });
    b.addCase(fetchWorkforce.fulfilled, (s, a) => { s.workforceLoading = false; s.workforce = a.payload; });
    b.addCase(fetchWorkforce.rejected, (s, a) => {
      s.workforceLoading = false;
      s.error = a.payload ?? 'Could not load the workforce.';
    });
    b.addCase(fetchMyTasks.pending, (s) => { s.tasksLoading = true; s.error = null; });
    b.addCase(fetchMyTasks.fulfilled, (s, a) => { s.tasksLoading = false; s.tasks = a.payload; });
    b.addCase(fetchMyTasks.rejected, (s, a) => {
      s.tasksLoading = false;
      s.error = a.payload ?? 'Could not load your tasks.';
    });
    b.addCase(fetchBrowseReports.pending, (s) => { s.browseLoading = true; s.error = null; });
    b.addCase(fetchBrowseReports.fulfilled, (s, a) => { s.browseLoading = false; s.browse = a.payload; });
    b.addCase(fetchBrowseReports.rejected, (s, a) => {
      s.browseLoading = false;
      s.error = a.payload ?? 'Could not load citizen reports.';
    });
    const upsertTask = (s: WorkflowState, issue: BackendSafeIssue) => {
      const idx = s.tasks.findIndex((t) => t.id === issue.id);
      if (idx >= 0) s.tasks[idx] = issue;
      else s.tasks.unshift(issue);
    };
    b.addCase(startTaskThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(startTaskThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertTask(s, a.payload); });
    b.addCase(startTaskThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not start the task.';
    });
    b.addCase(resolveTaskThunk.pending, (s) => { s.actionLoading = true; s.error = null; });
    b.addCase(resolveTaskThunk.fulfilled, (s, a) => { s.actionLoading = false; upsertTask(s, a.payload); });
    b.addCase(resolveTaskThunk.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not resolve the task.';
    });
  },
});

export const { clearWorkflowError, clearSelection } = slice.actions;
export default slice.reducer;
