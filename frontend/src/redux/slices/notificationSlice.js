import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { fetchNotifications, markNotificationRead } from '../api/dashboardApi.js'

/**
 * Notification centre.
 *
 * The unread count drives the header badge and the sidebar badge, so it is
 * derived once here rather than counted in three components.
 */

export const loadNotifications = createAsyncThunk('notifications/load', async (_, { rejectWithValue }) => {
  try {
    return await fetchNotifications()
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    return await markNotificationRead(id)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  items: [],
  loading: false,
  error: null,
  connected: false,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markAllRead(state) {
      state.items = state.items.map((item) => ({ ...item, read: true }))
    },
    clearAll(state) {
      state.items = []
    },
    setConnected(state, action) {
      state.connected = action.payload
    },
    /** Realtime push - new notifications land without a refetch. */
    notificationReceived(state, action) {
      const incoming = action.payload
      if (!incoming?.id) return
      if (state.items.some((item) => item.id === incoming.id)) return
      state.items.unshift({ ...incoming, read: false, createdAt: incoming.createdAt ?? new Date().toISOString() })
      state.items = state.items.slice(0, 50)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        state.items = action.payload
        state.loading = false
      })
      .addCase(loadNotifications.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load notifications.'
      })
      .addCase(markRead.fulfilled, (state, action) => {
        const target = state.items.find((item) => item.id === action.payload.id)
        if (target) target.read = true
      })
  },
})

export const { markAllRead, clearAll, setConnected, notificationReceived } = notificationSlice.actions

export default notificationSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export const selectNotifications = (state) => state.notifications.items
export const selectNotificationsError = (state) => state.notifications.error
export const selectNotificationsLoading = (state) => state.notifications.loading
export const selectRealtimeConnected = (state) => state.notifications.connected

export const selectUnreadCount = createSelector([selectNotifications], (items) => items.filter((item) => !item.read).length)

export const selectUnreadNotifications = createSelector([selectNotifications], (items) => items.filter((item) => !item.read))

/** Grouped by day for the notification centre list. */
export const selectNotificationsByDay = createSelector([selectNotifications], (items) => {
  const groups = new Map()

  for (const item of items) {
    const key = new Date(item.createdAt).toDateString()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }

  return [...groups.entries()].map(([day, entries]) => ({ day, entries }))
})
