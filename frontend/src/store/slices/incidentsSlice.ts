import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mockIncidents } from '../../data/mockIncidents';
import type { Incident, Severity } from '../../types';

export const fetchIncidents = createAsyncThunk('incidents/fetch', async () => {
  await new Promise((r) => setTimeout(r, 300));
  return mockIncidents;
});

interface State {
  items: Incident[];
  loading: boolean;
  severityFilter: Severity | 'all';
  search: string;
}

const initialState: State = { items: [], loading: false, severityFilter: 'all', search: '' };

const slice = createSlice({
  name: 'incidents',
  initialState,
  reducers: {
    setSeverityFilter: (s, a: PayloadAction<Severity | 'all'>) => { s.severityFilter = a.payload; },
    setSearch: (s, a: PayloadAction<string>) => { s.search = a.payload; },
  },
  extraReducers: (b) => {
    b.addCase(fetchIncidents.pending, (s) => { s.loading = true; });
    b.addCase(fetchIncidents.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; });
  },
});

export const { setSeverityFilter, setSearch } = slice.actions;
export default slice.reducer;
