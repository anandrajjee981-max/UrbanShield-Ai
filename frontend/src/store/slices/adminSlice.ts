import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  adminCreateUserRequest,
  fetchAdminIssueByIdRequest,
  fetchAdminIssuesRequest,
  fetchAuthorityApplicationByIdRequest,
  fetchAuthorityApplicationsRequest,
  fetchAuthorityAuditTrailRequest,
  getApiErrorMessage,
  rejectAuthorityApplicationRequest,
  verifyAuthorityApplicationRequest,
  type AdminMonitoredIssue,
  type AdminStats,
  type AdminIssueStatus,
  type AdminAuthorityApplication,
  type AuthorityAuditEntry,
  type AuthorityVerificationStatus,
  type CreatedUser,
  type ProvisionableRole,
} from '../../services/admin.service';

/**
 * Redux state for the Admin operations console (/admin/*).
 *
 * All data flows through the read-only monitoring endpoints plus the two
 * authority-application transitions (verify / reject). API logic lives in
 * services/admin.service.ts — never inside components.
 */

interface AsyncSection {
  loading: boolean;
  error: string | null;
}

interface AdminState {
  issues: AdminMonitoredIssue[];
  issuesFetch: AsyncSection;
  selectedIssue: AdminMonitoredIssue | null;
  selectedIssueFetch: AsyncSection;
  applications: AdminAuthorityApplication[];
  applicationsFetch: AsyncSection;
  selectedApplication: AdminAuthorityApplication | null;
  selectedApplicationFetch: AsyncSection;
  auditTrail: AuthorityAuditEntry[];
  auditFetch: AsyncSection;
  actionLoading: boolean;
  actionError: string | null;
  lastAction: string | null;
  stats: AdminStats | null;
  statsFetch: AsyncSection;
  createUserLoading: boolean;
  createUserError: string | null;
  lastCreatedUser: CreatedUser | null;
}

const idle = (): AsyncSection => ({ loading: false, error: null });

const initialState: AdminState = {
  issues: [],
  issuesFetch: idle(),
  selectedIssue: null,
  selectedIssueFetch: idle(),
  applications: [],
  applicationsFetch: idle(),
  selectedApplication: null,
  selectedApplicationFetch: idle(),
  auditTrail: [],
  auditFetch: idle(),
  actionLoading: false,
  actionError: null,
  lastAction: null,
  stats: null,
  statsFetch: idle(),
  createUserLoading: false,
  createUserError: null,
  lastCreatedUser: null,
};

const toStats = (
  issues: AdminMonitoredIssue[],
  applications: AdminAuthorityApplication[],
): AdminStats => ({
  totalIssues: issues.length,
  pendingIssues: issues.filter((i) => i.status === 'REPORTED').length,
  criticalIssues: 0, // backend has no severity column — derived client-side when available
  totalApplications: applications.length,
  pendingApplications: applications.filter((a) => a.verificationStatus === 'PENDING').length,
  verifiedAuthorities: applications.filter((a) => a.verificationStatus === 'VERIFIED').length,
  resolvedIssues: issues.filter((i) => i.status === 'RESOLVED').length,
  rejectedIssues: issues.filter((i) => i.status === 'REJECTED').length,
});

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchAdminStats = createAsyncThunk<AdminStats, void, { rejectValue: string }>(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const [issues, applications] = await Promise.all([
        fetchAdminIssuesRequest({ limit: 100 }),
        fetchAuthorityApplicationsRequest({ limit: 100 }),
      ]);
      return toStats(issues, applications);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Unable to load dashboard statistics.'));
    }
  },
);

export const fetchAdminIssues = createAsyncThunk<
  AdminMonitoredIssue[],
  { status?: AdminIssueStatus; limit?: number } | undefined,
  { rejectValue: string }
>('admin/fetchIssues', async (params, { rejectWithValue }) => {
  try {
    return await fetchAdminIssuesRequest(params ?? { limit: 100 });
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load issues.'));
  }
});

export const fetchAdminIssueById = createAsyncThunk<
  AdminMonitoredIssue,
  string,
  { rejectValue: string }
>('admin/fetchIssueById', async (issueId, { rejectWithValue }) => {
  try {
    return await fetchAdminIssueByIdRequest(issueId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load issue details.'));
  }
});

export const fetchAuthorityApplications = createAsyncThunk<
  AdminAuthorityApplication[],
  { status?: AuthorityVerificationStatus; limit?: number } | undefined,
  { rejectValue: string }
>('admin/fetchApplications', async (params, { rejectWithValue }) => {
  try {
    return await fetchAuthorityApplicationsRequest(params ?? { limit: 100 });
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load authority applications.'));
  }
});

export const fetchAuthorityApplicationById = createAsyncThunk<
  AdminAuthorityApplication,
  string,
  { rejectValue: string }
>('admin/fetchApplicationById', async (applicationId, { rejectWithValue }) => {
  try {
    return await fetchAuthorityApplicationByIdRequest(applicationId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load application details.'));
  }
});

export const verifyAuthorityApplication = createAsyncThunk<
  AdminAuthorityApplication,
  string,
  { rejectValue: string }
>('admin/verifyApplication', async (applicationId, { rejectWithValue }) => {
  try {
    // Body is exactly {} — enforced in the service layer.
    return await verifyAuthorityApplicationRequest(applicationId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Verification failed. Please try again.'));
  }
});

export const rejectAuthorityApplication = createAsyncThunk<
  AdminAuthorityApplication,
  { applicationId: string; reason?: string },
  { rejectValue: string }
>('admin/rejectApplication', async ({ applicationId, reason }, { rejectWithValue }) => {
  try {
    // Only { reason? } is sent — enforced in the service layer.
    return await rejectAuthorityApplicationRequest(applicationId, reason);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Rejection failed. Please try again.'));
  }
});

export const fetchAuthorityAuditTrail = createAsyncThunk<
  AuthorityAuditEntry[],
  string,
  { rejectValue: string }
>('admin/fetchAuditTrail', async (applicationId, { rejectWithValue }) => {
  try {
    return await fetchAuthorityAuditTrailRequest(applicationId);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load audit history.'));
  }
});

export const adminCreateUser = createAsyncThunk<
  CreatedUser,
  { name: string; email: string; password: string; role: ProvisionableRole },
  { rejectValue: string }
>('admin/createUser', async (input, { rejectWithValue }) => {
  try {
    return await adminCreateUserRequest({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      role: input.role,
    });
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not create the account.'));
  }
});

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const slice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearSelectedIssue: (s) => {
      s.selectedIssue = null;
      s.selectedIssueFetch = idle();
    },
    clearSelectedApplication: (s) => {
      s.selectedApplication = null;
      s.selectedApplicationFetch = idle();
      s.auditTrail = [];
      s.auditFetch = idle();
    },
    clearAdminAction: (s) => {
      s.actionError = null;
      s.lastAction = null;
    },
    clearCreateUser: (s) => {
      s.createUserError = null;
      s.lastCreatedUser = null;
    },
  },
  extraReducers: (b) => {
    // Stats
    b.addCase(fetchAdminStats.pending, (s) => {
      s.statsFetch = { loading: true, error: null };
    });
    b.addCase(fetchAdminStats.fulfilled, (s, a) => {
      s.statsFetch = idle();
      s.stats = a.payload;
    });
    b.addCase(fetchAdminStats.rejected, (s, a) => {
      s.statsFetch = { loading: false, error: a.payload ?? 'Unable to load statistics.' };
    });
    // Issues
    b.addCase(fetchAdminIssues.pending, (s) => {
      s.issuesFetch = { loading: true, error: null };
    });
    b.addCase(fetchAdminIssues.fulfilled, (s, a) => {
      s.issuesFetch = idle();
      s.issues = a.payload;
    });
    b.addCase(fetchAdminIssues.rejected, (s, a) => {
      s.issuesFetch = { loading: false, error: a.payload ?? 'Unable to load issues.' };
    });
    // Issue detail
    b.addCase(fetchAdminIssueById.pending, (s) => {
      s.selectedIssueFetch = { loading: true, error: null };
    });
    b.addCase(fetchAdminIssueById.fulfilled, (s, a) => {
      s.selectedIssueFetch = idle();
      s.selectedIssue = a.payload;
    });
    b.addCase(fetchAdminIssueById.rejected, (s, a) => {
      s.selectedIssueFetch = { loading: false, error: a.payload ?? 'Unable to load issue.' };
      s.selectedIssue = null;
    });
    // Applications
    b.addCase(fetchAuthorityApplications.pending, (s) => {
      s.applicationsFetch = { loading: true, error: null };
    });
    b.addCase(fetchAuthorityApplications.fulfilled, (s, a) => {
      s.applicationsFetch = idle();
      s.applications = a.payload;
    });
    b.addCase(fetchAuthorityApplications.rejected, (s, a) => {
      s.applicationsFetch = { loading: false, error: a.payload ?? 'Unable to load applications.' };
    });
    // Application detail
    b.addCase(fetchAuthorityApplicationById.pending, (s) => {
      s.selectedApplicationFetch = { loading: true, error: null };
    });
    b.addCase(fetchAuthorityApplicationById.fulfilled, (s, a) => {
      s.selectedApplicationFetch = idle();
      s.selectedApplication = a.payload;
    });
    b.addCase(fetchAuthorityApplicationById.rejected, (s, a) => {
      s.selectedApplicationFetch = {
        loading: false,
        error: a.payload ?? 'Unable to load application.',
      };
      s.selectedApplication = null;
    });
    // Verify
    b.addCase(verifyAuthorityApplication.pending, (s) => {
      s.actionLoading = true;
      s.actionError = null;
      s.lastAction = null;
    });
    b.addCase(verifyAuthorityApplication.fulfilled, (s, a) => {
      s.actionLoading = false;
      s.lastAction = 'verified';
      s.selectedApplication = a.payload;
      s.applications = s.applications.map((x) => (x.id === a.payload.id ? a.payload : x));
      if (s.stats) {
        s.stats = {
          ...s.stats,
          pendingApplications: Math.max(0, s.stats.pendingApplications - 1),
          verifiedAuthorities: s.stats.verifiedAuthorities + 1,
        };
      }
    });
    b.addCase(verifyAuthorityApplication.rejected, (s, a) => {
      s.actionLoading = false;
      s.actionError = a.payload ?? 'Verification failed.';
    });
    // Reject
    b.addCase(rejectAuthorityApplication.pending, (s) => {
      s.actionLoading = true;
      s.actionError = null;
      s.lastAction = null;
    });
    b.addCase(rejectAuthorityApplication.fulfilled, (s, a) => {
      s.actionLoading = false;
      s.lastAction = 'rejected';
      s.selectedApplication = a.payload;
      s.applications = s.applications.map((x) => (x.id === a.payload.id ? a.payload : x));
      if (s.stats) {
        s.stats = { ...s.stats, pendingApplications: Math.max(0, s.stats.pendingApplications - 1) };
      }
    });
    b.addCase(rejectAuthorityApplication.rejected, (s, a) => {
      s.actionLoading = false;
      s.actionError = a.payload ?? 'Rejection failed.';
    });
    // Audit
    b.addCase(fetchAuthorityAuditTrail.pending, (s) => {
      s.auditFetch = { loading: true, error: null };
    });
    b.addCase(fetchAuthorityAuditTrail.fulfilled, (s, a) => {
      s.auditFetch = idle();
      s.auditTrail = a.payload;
    });
    b.addCase(fetchAuthorityAuditTrail.rejected, (s, a) => {
      s.auditFetch = { loading: false, error: a.payload ?? 'Unable to load audit history.' };
      s.auditTrail = [];
    });
    // Admin user provisioning
    b.addCase(adminCreateUser.pending, (s) => {
      s.createUserLoading = true;
      s.createUserError = null;
      s.lastCreatedUser = null;
    });
    b.addCase(adminCreateUser.fulfilled, (s, a) => {
      s.createUserLoading = false;
      s.lastCreatedUser = a.payload;
    });
    b.addCase(adminCreateUser.rejected, (s, a) => {
      s.createUserLoading = false;
      s.createUserError = a.payload ?? 'Could not create the account.';
    });
  },
});

export const { clearSelectedIssue, clearSelectedApplication, clearAdminAction, clearCreateUser } = slice.actions;
export default slice.reducer;
