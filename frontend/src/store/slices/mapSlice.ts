import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mockRiskZones } from '../../data/mockRiskData';
import { fetchMyIssuesRequest, type BackendSafeIssue } from '../../services/api';
import type { Incident, IncidentStatus, Severity } from '../../types';
import { backendTypeToCategory } from './reportsSlice';

export const fetchMapData = createAsyncThunk('map/fetch', async () => {
  await new Promise((r) => setTimeout(r, 300));
  // Risk zones have no backend endpoint yet, so the demo zone layer stays.
  // Incident markers are 100% live (see useMapIncidents) — no mock markers.
  return { zones: mockRiskZones, incidents: [] as Incident[] };
});

const statusToSeverity = (s: BackendSafeIssue['status']): Severity => {
  switch (s) {
    case 'REPORTED': return 'high';
    case 'VERIFIED':
    case 'ASSIGNED':
    case 'IN_PROGRESS': return 'medium';
    case 'RESOLVED':
    case 'REJECTED':
    default: return 'low';
  }
};

const statusToIncidentStatus = (s: BackendSafeIssue['status']): IncidentStatus =>
  s === 'RESOLVED' ? 'resolved' : 'active';

/**
 * A real backend issue → map marker. GPS issues only (MANUAL addresses have
 * no coordinates worth pinning) and REJECTED ones are skipped.
 */
export function backendIssueToMapIncident(
  issue: BackendSafeIssue,
  reporterLabel: string,
): Incident | null {
  if (issue.latitude === null || issue.longitude === null) return null;
  if (issue.status === 'REJECTED') return null;
  const title =
    issue.description.length > 60 ? `${issue.description.slice(0, 60)}…` : issue.description;
  return {
    id: issue.id,
    title,
    category: backendTypeToCategory(issue.issueType),
    severity: statusToSeverity(issue.status),
    status: statusToIncidentStatus(issue.status),
    lat: issue.latitude,
    lng: issue.longitude,
    address: issue.address ?? 'Location not provided',
    reportedAt: issue.createdAt,
    reporter: reporterLabel,
    description: issue.description,
    affectedRadiusKm: 0.5,
  };
}

/** The signed-in user's own live reports as map markers. */
export const fetchRealMapReports = createAsyncThunk('map/fetchReal', async () => {
  const issues = await fetchMyIssuesRequest();
  return issues
    .map((i) => backendIssueToMapIncident(i, 'You (live report)'))
    .filter((x): x is Incident => x !== null);
});

interface MapState {
  zones: typeof mockRiskZones;
  incidents: Incident[];
  /** Live markers from the backend (user's own reports). */
  realIncidents: Incident[];
  showRiskLayers: boolean;
  showIncidents: boolean;
  activeCategory: string;
  center: [number, number];
  loading: boolean;
}

const initialState: MapState = {
  zones: [], incidents: [], realIncidents: [],
  showRiskLayers: true, showIncidents: true,
  activeCategory: 'all', center: [23.34, 85.31], loading: false,
};

const slice = createSlice({
  name: 'map', initialState,
  reducers: {
    toggleRiskLayers: (s) => { s.showRiskLayers = !s.showRiskLayers; },
    toggleIncidents: (s) => { s.showIncidents = !s.showIncidents; },
    setCategory: (s, a: PayloadAction<string>) => { s.activeCategory = a.payload; },
    setCenter: (s, a: PayloadAction<[number, number]>) => { s.center = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchMapData.pending, (s) => { s.loading = true; });
    b.addCase(fetchMapData.fulfilled, (s, a) => { s.loading = false; s.zones = a.payload.zones; s.incidents = a.payload.incidents; });
    b.addCase(fetchRealMapReports.fulfilled, (s, a) => { s.realIncidents = a.payload; });
  },
});

export const { toggleRiskLayers, toggleIncidents, setCategory, setCenter } = slice.actions;
export default slice.reducer;
