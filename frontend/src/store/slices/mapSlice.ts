import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mockRiskZones } from '../../data/mockRiskData';
import { mockIncidents } from '../../data/mockIncidents';

export const fetchMapData = createAsyncThunk('map/fetch', async () => {
  await new Promise((r) => setTimeout(r, 300));
  return { zones: mockRiskZones, incidents: mockIncidents };
});

interface MapState {
  zones: typeof mockRiskZones;
  incidents: typeof mockIncidents;
  showRiskLayers: boolean;
  showIncidents: boolean;
  activeCategory: string;
  center: [number, number];
  loading: boolean;
}

const initialState: MapState = {
  zones: [], incidents: [],
  showRiskLayers: true, showIncidents: true,
  activeCategory: 'all', center: [28.6139, 77.209], loading: false,
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
  },
});

export const { toggleRiskLayers, toggleIncidents, setCategory, setCenter } = slice.actions;
export default slice.reducer;
