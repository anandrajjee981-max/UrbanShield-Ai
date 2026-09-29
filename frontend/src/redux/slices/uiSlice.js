import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { searchAll } from '../api/reportApi.js'
import { DEFAULT_FILTERS } from '../../utils/constants.js'

/**
 * Cross-cutting UI state: chrome (sidebar, drawer), toasts, global search and
 * the filter set that every data-driven page reacts to.
 */

export const performSearch = createAsyncThunk('ui/search', async (query, { rejectWithValue }) => {
  try {
    return await searchAll(query)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandPaletteOpen: false,
  filters: { ...DEFAULT_FILTERS },
  toasts: [],
  search: { query: '', results: { reports: [], wards: [], departments: [] }, loading: false, open: false },
}

let toastId = 0

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed(state, action) {
      state.sidebarCollapsed = action.payload
    },
    setMobileNavOpen(state, action) {
      state.mobileNavOpen = action.payload
    },
    setCommandPaletteOpen(state, action) {
      state.commandPaletteOpen = action.payload
    },
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload }
    },
    resetFilters(state) {
      state.filters = { ...DEFAULT_FILTERS }
    },
    setSearchQuery(state, action) {
      state.search.query = action.payload
      state.search.open = action.payload.length > 0
      if (!action.payload) state.search.results = { reports: [], wards: [], departments: [] }
    },
    setSearchOpen(state, action) {
      state.search.open = action.payload
    },
    addToast: {
      reducer(state, action) {
        state.toasts.push(action.payload)
        // Keep the stack shallow so a burst of realtime events cannot fill the screen.
        if (state.toasts.length > 4) state.toasts.shift()
      },
      prepare(toast) {
        toastId += 1
        return { payload: { id: `toast-${toastId}`, tone: 'info', duration: 4500, ...toast } }
      },
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload)
    },
    clearToasts(state) {
      state.toasts = []
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(performSearch.pending, (state) => {
        state.search.loading = true
      })
      .addCase(performSearch.fulfilled, (state, action) => {
        state.search.loading = false
        state.search.results = action.payload
      })
      .addCase(performSearch.rejected, (state) => {
        state.search.loading = false
        state.search.results = { reports: [], wards: [], departments: [] }
      })
  },
})

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setMobileNavOpen,
  setCommandPaletteOpen,
  setFilters,
  resetFilters,
  setSearchQuery,
  setSearchOpen,
  addToast,
  dismissToast,
  clearToasts,
} = uiSlice.actions

export default uiSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export const selectSidebarCollapsed = (state) => state.ui.sidebarCollapsed
export const selectMobileNavOpen = (state) => state.ui.mobileNavOpen
export const selectGlobalFilters = (state) => state.ui.filters
export const selectToasts = (state) => state.ui.toasts
export const selectSearch = (state) => state.ui.search
export const selectSearchOpen = (state) => state.ui.search.open

/** True when any filter differs from its default - drives the "Clear" button. */
export const selectFiltersActive = createSelector([selectGlobalFilters], (filters) =>
  Object.entries(DEFAULT_FILTERS).some(([key, value]) => filters[key] !== value),
)
