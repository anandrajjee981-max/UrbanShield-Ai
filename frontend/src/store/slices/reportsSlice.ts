import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  createIssueRequest,
  fetchMyIssuesRequest,
  getApiErrorMessage,
  type BackendIssueStatus,
  type BackendIssueType,
  type BackendSafeIssue,
  type CreateIssueBody,
} from '../../services/api';
import type { CitizenReport, IncidentCategory } from '../../types';

// Connected to the real backend: GET /api/issues/my + POST /api/issues/.
// The backend has no title/votes/reporter fields, so they are derived for display.

export const backendTypeToCategory = (t: BackendIssueType): IncidentCategory => {
  switch (t) {
    case 'FLOODING':
    case 'WATER_LEAKAGE':
    case 'WATER_SHORTAGE':
      return 'flood';
    case 'EXTREME_HEAT':
      return 'heat';
    case 'DRAINAGE':
    case 'OTHER':
    default:
      return 'infrastructure';
  }
};

export const categoryToBackendType = (c: IncidentCategory): BackendIssueType => {
  switch (c) {
    case 'flood':
      return 'FLOODING';
    case 'heat':
      return 'EXTREME_HEAT';
    case 'fire':
    case 'air':
    case 'medical':
      return 'OTHER';
    case 'infrastructure':
    default:
      return 'DRAINAGE';
  }
};

export const backendStatusToReport = (
  s: BackendIssueStatus,
): CitizenReport['status'] => {
  switch (s) {
    case 'REPORTED':
      return 'pending';
    case 'VERIFIED':
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return 'verified';
    case 'RESOLVED':
      return 'actioned';
    case 'REJECTED':
      return 'rejected';
    default:
      return 'pending';
  }
};

export function backendIssueToReport(issue: BackendSafeIssue): CitizenReport {
  const title =
    issue.description.length > 60 ? `${issue.description.slice(0, 60)}…` : issue.description;
  return {
    id: issue.id,
    category: backendTypeToCategory(issue.issueType),
    title,
    description: issue.description,
    lat: issue.latitude ?? 28.6139,
    lng: issue.longitude ?? 77.209,
    address:
      issue.address ??
      (issue.latitude !== null && issue.longitude !== null
        ? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`
        : 'Location not provided'),
    status: backendStatusToReport(issue.status),
    createdAt: issue.createdAt,
    votes: 0,
    imageUrl: issue.imageUrl ?? undefined,
    locationType: issue.locationType,
    rawStatus: issue.status,
    skillRequired: issue.skillRequired,
    complexity: issue.complexity,
    effortHours: issue.effortHours,
    resolutionNote: issue.resolutionNote,
  };
}

export interface SubmitReportInput {
  category: IncidentCategory;
  description: string;
  coords: [number, number] | null;
  address: string;
  photo: File | null;
}

export const fetchReports = createAsyncThunk<CitizenReport[], void, { rejectValue: string }>(
  'reports/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const issues = await fetchMyIssuesRequest();
      return issues.map(backendIssueToReport);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load your reports.'));
    }
  },
);

export const submitReport = createAsyncThunk<CitizenReport, SubmitReportInput, { rejectValue: string }>(
  'reports/submit',
  async ({ category, description, coords, address, photo }, { rejectWithValue }) => {
    try {
      const issueType = categoryToBackendType(category);
      let body: CreateIssueBody;
      if (coords) {
        body = {
          issueType,
          description: description.trim(),
          locationType: 'GPS',
          latitude: coords[0],
          longitude: coords[1],
        };
      } else {
        body = {
          issueType,
          description: description.trim(),
          locationType: 'MANUAL',
          address: address.trim(),
        };
      }
      const issue = await createIssueRequest(body, photo);
      return backendIssueToReport(issue);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not submit the report.'));
    }
  },
);

interface State {
  items: CitizenReport[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}

const initialState: State = { items: [], loading: false, submitting: false, error: null };

const slice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportsError: (s) => {
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchReports.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchReports.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; });
    b.addCase(fetchReports.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? 'Could not load your reports.';
    });
    b.addCase(submitReport.pending, (s) => { s.submitting = true; s.error = null; });
    b.addCase(submitReport.fulfilled, (s, a) => {
      s.submitting = false;
      // Newest REPORTED issue first
      s.items.unshift(a.payload);
    });
    b.addCase(submitReport.rejected, (s, a) => {
      s.submitting = false;
      s.error = a.payload ?? 'Could not submit the report.';
    });
  },
});

export const { clearReportsError } = slice.actions;
export default slice.reducer;
