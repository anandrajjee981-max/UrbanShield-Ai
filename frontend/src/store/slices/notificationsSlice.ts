import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { mockNotifications } from '../../data/mockNotifications';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  await new Promise((r) => setTimeout(r, 200));
  return mockNotifications;
});

interface State { items: typeof mockNotifications; open: boolean; }
const initialState: State = { items: [], open: false };

const slice = createSlice({
  name: 'notifications', initialState,
  reducers: {
    togglePanel: (s) => { s.open = !s.open; },
    markAllRead: (s) => { s.items = s.items.map((n) => ({ ...n, read: true })); },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifications.fulfilled, (s, a) => { s.items = a.payload; });
  },
});
export const { togglePanel, markAllRead } = slice.actions;
export default slice.reducer;
