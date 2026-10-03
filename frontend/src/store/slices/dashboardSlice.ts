import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { mockKpis, mockTrend, mockRiskDistribution } from '../../data/mockAnalytics';

export const fetchDashboard = createAsyncThunk('dashboard/fetch', async () => {
  // FRONTEND-ONLY: simulate API latency, replace with real API call later
  await new Promise((r) => setTimeout(r, 400));
  return { kpis: mockKpis, trend: mockTrend, distribution: mockRiskDistribution };
});

interface DashboardState {
  kpis: typeof mockKpis;
  trend: typeof mockTrend;
  distribution: typeof mockRiskDistribution;
  loading: boolean;
}

const initialState: DashboardState = { kpis: [], trend: [], distribution: [], loading: false };

const slice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchDashboard.pending, (s) => { s.loading = true; });
    b.addCase(fetchDashboard.fulfilled, (s, a) => { s.loading = false; s.kpis = a.payload.kpis; s.trend = a.payload.trend; s.distribution = a.payload.distribution; });
    b.addCase(fetchDashboard.rejected, (s) => { s.loading = false; });
  },
});

export default slice.reducer;
