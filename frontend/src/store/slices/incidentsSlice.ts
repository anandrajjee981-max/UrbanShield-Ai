import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  adminListIssuesRequest,
  browseReportsRequest,
  fetchMyIssuesRequest,
  getApiErrorMessage,
  type BackendIssueStatus,
  type BackendSafeIssue,
} from '../../services/api';
import type { RootState } from '../store';
import type { Incident, IncidentStatus, Severity } from '../../types';
import { backendTypeToCategory } from './reportsSlice';

// The backend has no dedicated /incidents endpoint, so the command center is
// fed from the role-scoped real sources: citizens see their own issues
// (GET /issues/my), authorities see every city report
// (GET /authority/issues/browse), admins see the full queue
// (GET /admin/issues). REJECTED reports are dismissed reports, not active
// risks, so they stay on the Reports page and out of this list.

function severityFor(status: BackendIssueStatus, complexity: string | null): Severity {
  if (complexity === 'HIGH') return 'critical';
  if (complexity === 'MEDIUM') return 'high';
  if (complexity === 'LOW') return 'medium';
  if (status === 'REPORTED') return 'high';
  if (status === 'RESOLVED') return 'low';
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
    severity: severityFor(issue.status, issue.complexity),
    status: statusFor(issue.status),
    // MANUAL-address reports carry no coordinates — kept null, never faked.
    lat: issue.latitude,
    lng: issue.longitude,
    address:
      issue.address ??
      (issue.latitude !== null && issue.longitude !== null
        ? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`
        : 'Location not provided'),
    reportedAt: issue.createdAt,
    reporter,
    description,
    affectedRadiusKm: 0.5,
  };
}

export const fetchIncidents = createAsyncThunk<Incident[], void, { rejectValue: string; state: RootState }>(
  'incidents/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const role = getState().auth.user?.role ?? 'CITIZEN';
      if (role === 'ADMIN') {
        const issues = await adminListIssuesRequest();
        return issues
          .filter((i) => i.status !== 'REJECTED')
          .map((i) => backendIssueToIncident(i, `Citizen report · ${i.citizen.name}`));
      }
      if (role === 'AUTHORITY') {
        const issues = await browseReportsRequest();
        return issues
          .filter((i) => i.status !== 'REJECTED')
          .map((i) => backendIssueToIncident(i, `Citizen report · ${i.citizen.name}`));
      }
      const issues = await fetchMyIssuesRequest();
      return issues
        .filter((i) => i.status !== 'REJECTED')
        .map((i) => backendIssueToIncident(i, 'You (live report)'));
    } catch (err) {
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
