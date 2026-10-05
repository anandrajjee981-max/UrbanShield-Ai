import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import {
  adminListIssuesRequest,
  fetchMyIssuesRequest,
  fetchMyTasksRequest,
  getApiErrorMessage,
  type BackendIssueStatus,
  type BackendSafeIssue,
} from '../../services/api';
import type { RootState } from '../store';
import type { Incident, IncidentStatus, Severity } from '../../types';
import { backendTypeToCategory } from './reportsSlice';

export const AUTHORITY_NOT_VERIFIED = 'AUTHORITY_NOT_VERIFIED';

// The backend has no dedicated /incidents endpoint, so the command center is
// fed from the role-scoped real sources: citizens see their own issues
// (GET /issues/my), authorities see the review queue
// (GET /authority/issues), admins see the full queue
// (GET /admin/issues). REJECTED reports are dismissed reports, not active
// risks, so they stay on the Reports page and out of this list.

/**
 * Display heuristic from the lifecycle status alone. The backend tracks no
 * severity/complexity, so this is a presentation mapping, not stored data.
 */
function severityFor(status: BackendIssueStatus): Severity {
  if (status === 'REPORTED') return 'high';
  if (status === 'RESOLVED') return 'low';
  if (status === 'REJECTED') return 'low';
  return 'medium';
}

function statusFor(status: BackendIssueStatus): IncidentStatus {
  if (status === 'RESOLVED') return 'resolved';
  if (status === 'VERIFIED') return 'monitoring';
  return 'active';
}

export function backendIssueToIncident(
  issue: BackendSafeIssue,
  reporter: string,
  categoryOverride?: Incident['category'],
): Incident {
  const description = issue.description;
  return {
    id: issue.id,
    title: description.length > 60 ? `${description.slice(0, 60)}…` : description,
    category: categoryOverride ?? backendTypeToCategory(issue.issueType),
    severity: severityFor(issue.status),
    status: statusFor(issue.status),
    // MANUAL-address reports carry no coordinates — kept null, never faked.
    lat: issue.latitude,
    lng: issue.longitude,
    // Name only — coordinates are for map markers, never address text.
    address: issue.address ?? 'Location not provided',
    reportedAt: issue.createdAt,
    reporter,
    description,
    affectedRadiusKm: 0.5,
  };
}

export const fetchIncidents = createAsyncThunk<Incident[], void, { rejectValue: string; state: RootState }>(
  'incidents/fetch',
  async (_, { getState, rejectWithValue }) => {
    const role = getState().auth.user?.role ?? 'CITIZEN';

    try {
      if (role === 'ADMIN') {
        const issues = await adminListIssuesRequest();
        return issues
          .filter((i) => i.status !== 'REJECTED')
          .map((i) => backendIssueToIncident(i, `Citizen report · ${i.citizen.name}`));
      }
      if (role === 'AUTHORITY') {
        const issues = await fetchMyTasksRequest();
        return issues
          .filter((i) => i.status !== 'REJECTED')
          .map((i) => backendIssueToIncident(i, 'City report'));
      }
      const issues = await fetchMyIssuesRequest();
      return issues
        .filter((i) => i.status !== 'REJECTED')
        .map((i) => backendIssueToIncident(i, 'You (live report)'));
    } catch (err) {
      if (
        role === 'AUTHORITY' &&
        err instanceof AxiosError &&
        err.response?.status === 403 &&
        (err.response.data as { code?: string } | undefined)?.code === AUTHORITY_NOT_VERIFIED
      ) {
        return rejectWithValue(AUTHORITY_NOT_VERIFIED);
      }
      return rejectWithValue(getApiErrorMessage(err, 'Could not load city incidents.'));
    }
  },
);

interface State {
  items: Incident[];
  loading: boolean;
  severityFilter: Severity | 'all';
  search: string;
  /** ISO timestamp of the last successful fetch (drives "Last updated"). */
  lastUpdated: string | null;
  error: string | null;
}

const initialState: State = { items: [], loading: false, severityFilter: 'all', search: '', lastUpdated: null, error: null };

const slice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setSeverityFilter: (s, a: PayloadAction<Severity | 'all'>) => { s.severityFilter = a.payload; },
    setSearch: (s, a: PayloadAction<string>) => { s.search = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchIncidents.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchIncidents.fulfilled, (s, a) => {
      s.loading = false;
      s.items = a.payload;
      s.lastUpdated = new Date().toISOString();
      s.error = null;
    });
    b.addCase(fetchIncidents.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? 'Could not load city incidents.';
    });
  },
});

export const { setSeverityFilter, setSearch } = slice.actions;
export default slice.reducer;
