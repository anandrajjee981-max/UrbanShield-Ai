import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchAssignedTaskRequest,
  fetchAssignedTasksRequest,
  fetchTaskCommentsRequest,
  getApiErrorMessage,
  postTaskCommentRequest,
  updateAssignedTaskStatusRequest,
  type AssignedTask,
  type AssignedTaskPriority,
  type AssignedTaskStatus,
  type TaskComment,
  type TaskCounts,
} from '../../services/api';

export type TasksTab = 'ALL' | AssignedTaskStatus | 'OVERDUE';

export const fetchAssignedTasks = createAsyncThunk<
  { tasks: AssignedTask[]; counts: TaskCounts },
  { status?: AssignedTaskStatus; priority?: AssignedTaskPriority; search?: string } | void,
  { rejectValue: string }
>('authorityTasks/fetchAll', async (args, { rejectWithValue }) => {
  try {
    return await fetchAssignedTasksRequest(args ?? undefined);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load your tasks.'));
  }
});

export const fetchAssignedTaskDetail = createAsyncThunk<
  { task: AssignedTask; comments: TaskComment[] },
  string,
  { rejectValue: string }
>('authorityTasks/fetchOne', async (taskId, { rejectWithValue }) => {
  try {
    return await fetchAssignedTaskRequest(taskId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not load task details.'));
  }
});

export const changeTaskStatus = createAsyncThunk<
  AssignedTask,
  { taskId: string; status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'; note?: string; reason?: string },
  { rejectValue: string }
>('authorityTasks/changeStatus', async (args, { rejectWithValue }) => {
  try {
    return await updateAssignedTaskStatusRequest(args.taskId, {
      status: args.status,
      note: args.note,
      reason: args.reason,
    });
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not update the task.'));
  }
});

export const addTaskComment = createAsyncThunk<
  TaskComment,
  { taskId: string; body: string },
  { rejectValue: string }
>('authorityTasks/addComment', async (args, { rejectWithValue }) => {
  try {
    return await postTaskCommentRequest(args.taskId, args.body);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not add the comment.'));
  }
});

export const refreshTaskComments = createAsyncThunk<TaskComment[], string, { rejectValue: string }>(
  'authorityTasks/refreshComments',
  async (taskId, { rejectWithValue }) => {
    try {
      return await fetchTaskCommentsRequest(taskId);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load comments.'));
    }
  },
);

interface AuthorityTasksState {
  tasks: AssignedTask[];
  counts: TaskCounts;
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
  detail: AssignedTask | null;
  comments: TaskComment[];
  detailLoading: boolean;
  lastFetchedAt: string | null;
}

const initialState: AuthorityTasksState = {
  tasks: [],
  counts: { pending: 0, inProgress: 0, overdue: 0, completed: 0, total: 0 },
  loading: false,
  actionLoading: false,
  error: null,
  detail: null,
  comments: [],
  detailLoading: false,
  lastFetchedAt: null,
};

const slice = createSlice({
  name: 'authorityTasks',
  initialState,
  reducers: {
    clearTasksError: (s) => {
      s.error = null;
    },
    clearTaskDetail: (s) => {
      s.detail = null;
      s.comments = [];
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAssignedTasks.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchAssignedTasks.fulfilled, (s, a) => {
      s.loading = false;
      s.tasks = a.payload.tasks;
      s.counts = a.payload.counts;
      s.lastFetchedAt = new Date().toISOString();
    });
    b.addCase(fetchAssignedTasks.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? 'Could not load your tasks.';
    });
    b.addCase(fetchAssignedTaskDetail.pending, (s) => {
      s.detailLoading = true;
    });
    b.addCase(fetchAssignedTaskDetail.fulfilled, (s, a) => {
      s.detailLoading = false;
      s.detail = a.payload.task;
      s.comments = a.payload.comments;
      const idx = s.tasks.findIndex((t) => t.id === a.payload.task.id);
      if (idx >= 0) s.tasks[idx] = a.payload.task;
    });
    b.addCase(fetchAssignedTaskDetail.rejected, (s) => {
      s.detailLoading = false;
    });
    b.addCase(changeTaskStatus.pending, (s) => {
      s.actionLoading = true;
      s.error = null;
    });
    b.addCase(changeTaskStatus.fulfilled, (s, a) => {
      s.actionLoading = false;
      const idx = s.tasks.findIndex((t) => t.id === a.payload.id);
      if (idx >= 0) s.tasks[idx] = a.payload;
      if (s.detail?.id === a.payload.id) s.detail = a.payload;
    });
    b.addCase(changeTaskStatus.rejected, (s, a) => {
      s.actionLoading = false;
      s.error = a.payload ?? 'Could not update the task.';
    });
    b.addCase(addTaskComment.fulfilled, (s, a) => {
      s.comments = [...s.comments, a.payload];
    });
    b.addCase(refreshTaskComments.fulfilled, (s, a) => {
      s.comments = a.payload;
    });
  },
});

export const { clearTasksError, clearTaskDetail } = slice.actions;
export default slice.reducer;
