import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { mockNotifications } from '../../data/mockNotifications';
import type { AppNotification } from '../../types';

export const fetchNotifications = createAsyncThunk('notifications/fetch', async () => {
  await new Promise((r) => setTimeout(r, 200));
  return mockNotifications;
});

interface State { items: AppNotification[]; open: boolean; }
const initialState: State = { items: [], open: false };

const slice = createSlice({
  name: 'notifications', initialState,
  reducers: {
    togglePanel: (s) => { s.open = !s.open; },
    closePanel: (s) => { s.open = false; },
    markAllRead: (s) => { s.items = s.items.map((n) => ({ ...n, read: true })); },
    markOneRead: (s, a: PayloadAction<string>) => {
      s.items = s.items.map((n) => (n.id === a.payload ? { ...n, read: true } : n));
    },
    /**
     * Real client-side events (report submitted / accepted / rejected /
     * resolved…) land in the same feed as seeded items, so the bell and the
     * Live City Feed always reflect actual actions taken in this session.
     */
    pushNotification: (s, a: PayloadAction<Omit<AppNotification, 'id' | 'read'> & { id?: string }>) => {
      const item: AppNotification = {
        ...a.payload,
        id: a.payload.id ?? `live-${Date.now()}`,
        read: false,
      };
      s.items = [item, ...s.items].slice(0, 30);
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifications.fulfilled, (s, a) => {
      // Keep session-pushed events ahead of the seeded list on refetch.
      const pushed = s.items.filter((n) => n.id.startsWith('live-'));
      const pushedIds = new Set(pushed.map((n) => n.id));
      s.items = [...pushed, ...a.payload.filter((n) => !pushedIds.has(n.id))];
    });
  },
});
export const { togglePanel, closePanel, markAllRead, markOneRead, pushNotification } = slice.actions;
export default slice.reducer;
