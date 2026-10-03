import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { mockTrend, mockRiskDistribution, mockWaterRisk, mockHeatRisk } from '../../data/mockAnalytics';

export const fetchAnalytics = createAsyncThunk('analytics/fetch', async () => {
  await new Promise((r) => setTimeout(r, 300));
  return { trend: mockTrend, distribution: mockRiskDistribution, water: mockWaterRisk, heat: mockHeatRisk };
});

interface State { trend: typeof mockTrend; distribution: typeof mockRiskDistribution; water: typeof mockWaterRisk; heat: typeof mockHeatRisk; loading: boolean; }
const initialState: State = { trend: [], distribution: [], water: [], heat: [], loading: false };

const slice = createSlice({
  name: 'analytics', initialState, reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchAnalytics.pending, (s) => { s.loading = true; });
    b.addCase(fetchAnalytics.fulfilled, (s, a) => { Object.assign(s, a.payload, { loading: false }); });
  },
});
export default slice.reducer;
