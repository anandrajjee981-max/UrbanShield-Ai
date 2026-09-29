import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as reportApi from '../api/reportApi.js'
import { DEFAULT_FILTERS } from '../../utils/constants.js'
import { STATUS_ACTIONS } from '../../utils/constants.js'

/**
 * Reports store.
 *
 * Holds the filtered list, the report currently open in a detail view, the
 * active filter set and the pagination envelope. Every mutation goes through a
 * thunk so the slice stays the only place that knows how a report changes.
 */

export const loadReports = createAsyncThunk('reports/load', async (params, { rejectWithValue }) => {
  try {
    return await reportApi.fetchReports(params)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const loadMyReports = createAsyncThunk('reports/loadMine', async (params, { rejectWithValue }) => {
  try {
    return await reportApi.fetchMyReports(params)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const loadReportById = createAsyncThunk('reports/loadOne', async (id, { rejectWithValue }) => {
  try {
    return await reportApi.fetchReportById(id)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const submitReport = createAsyncThunk('reports/submit', async (payload, { rejectWithValue }) => {
  try {
    return await reportApi.createReport(payload)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const changeReportStatus = createAsyncThunk('reports/changeStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    return await reportApi.updateReportStatus(id, status)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const assignReport = createAsyncThunk('reports/assign', async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await reportApi.assignReport(id, payload)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const addNote = createAsyncThunk('reports/addNote', async ({ id, body }, { rejectWithValue }) => {
  try {
    return await reportApi.addReportNote(id, body)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const rejectReport = createAsyncThunk('reports/reject', async ({ id, reason }, { rejectWithValue }) => {
  try {
    return await reportApi.rejectReport(id, reason)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  items: [],
  allItems: [],
  selectedReport: null,
  loading: false,
  detailLoading: false,
  submitting: false,
  actionLoading: false,
  error: null,
  filters: { ...DEFAULT_FILTERS, scope: 'all' },
  pagination: { page: 1, limit: 10, total: 0, pageCount: 1, from: 0, to: 0 },
  lastCreated: null,
  assignmentOptions: { departments: [], officers: [] },
}

/** Replaces a report everywhere it is cached, so lists and the map stay in sync. */
function upsertReport(state, report) {
  if (!report) return

  const index = state.items.findIndex((item) => item.id === report.id)
  if (index !== -1) state.items[index] = report

  const allIndex = state.allItems.findIndex((item) => item.id === report.id)
  if (allIndex !== -1) state.allItems[allIndex] = report

  if (state.selectedReport?.id === report.id) state.selectedReport = report
}

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload, page: 1 }
    },
    resetFilters(state) {
      state.filters = { ...DEFAULT_FILTERS, scope: state.filters.scope }
    },
    setPage(state, action) {
      state.pagination.page = action.payload
    },
    clearSelectedReport(state) {
      state.selectedReport = null
    },
    clearLastCreated(state) {
      state.lastCreated = null
    },
    /** Applies a realtime push without refetching the whole list. */
    reportReceived(state, action) {
      upsertReport(state, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadReports.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadReports.fulfilled, (state, action) => {
        const { items, total, page, pageCount, from, to, limit } = action.payload
        state.items = items
        state.pagination = { total, page, pageCount, from, to, limit }
        state.loading = false
      })
      .addCase(loadReports.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load reports.'
      })

      .addCase(loadMyReports.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadMyReports.fulfilled, (state, action) => {
        state.items = action.payload.items
        state.pagination = {
          total: action.payload.total,
          page: action.payload.page,
          pageCount: action.payload.pageCount,
          from: action.payload.from,
          to: action.payload.to,
          limit: action.payload.limit,
        }
        state.loading = false
      })
      .addCase(loadMyReports.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load your reports.'
      })

      .addCase(loadReportById.pending, (state) => {
        state.detailLoading = true
        state.error = null
      })
      .addCase(loadReportById.fulfilled, (state, action) => {
        state.selectedReport = action.payload
        state.detailLoading = false
      })
      .addCase(loadReportById.rejected, (state, action) => {
        state.detailLoading = false
        state.error = action.payload ?? 'Could not load that report.'
      })

      .addCase(submitReport.pending, (state) => {
        state.submitting = true
        state.error = null
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.submitting = false
        state.lastCreated = action.payload
        state.allItems.unshift(action.payload)
        state.items.unshift(action.payload)
        state.pagination.total += 1
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.submitting = false
        state.error = action.payload ?? 'Could not submit the report.'
      })

      .addCase(changeReportStatus.pending, (state) => {
        state.actionLoading = true
      })
      .addCase(changeReportStatus.fulfilled, (state, action) => {
        state.actionLoading = false
        upsertReport(state, action.payload)
      })
      .addCase(changeReportStatus.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload ?? 'Could not update the status.'
      })

      .addCase(assignReport.pending, (state) => {
        state.actionLoading = true
      })
      .addCase(assignReport.fulfilled, (state, action) => {
        state.actionLoading = false
        upsertReport(state, action.payload)
      })
      .addCase(assignReport.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload ?? 'Could not assign this report.'
      })

      .addCase(addNote.pending, (state) => {
        state.actionLoading = true
      })
      .addCase(addNote.fulfilled, (state, action) => {
        state.actionLoading = false
        upsertReport(state, action.payload)
      })
      .addCase(addNote.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload ?? 'Could not add the note.'
      })

      .addCase(rejectReport.pending, (state) => {
        state.actionLoading = true
      })
      .addCase(rejectReport.fulfilled, (state, action) => {
        state.actionLoading = false
        upsertReport(state, action.payload)
      })
      .addCase(rejectReport.rejected, (state, action) => {
        state.actionLoading = false
        state.error = action.payload ?? 'Could not reject this report.'
      })
  },
})

export const { setFilters, resetFilters, setPage, clearSelectedReport, clearLastCreated, reportReceived } = reportSlice.actions

export default reportSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors - components read these, never raw state paths.
 * ------------------------------------------------------------------ */

export const selectReports = (state) => state.reports.items
export const selectReportFilters = (state) => state.reports.filters
export const selectReportPagination = (state) => state.reports.pagination
export const selectReportsLoading = (state) => state.reports.loading
export const selectReportsError = (state) => state.reports.error
export const selectSelectedReport = (state) => state.reports.selectedReport
export const selectSubmitting = (state) => state.reports.submitting
export const selectActionLoading = (state) => state.reports.actionLoading
export const selectLastCreated = (state) => state.reports.lastCreated

export const selectPendingVerificationCount = createSelector([selectReports], (reports) =>
  reports.filter((report) => report.status === 'reported').length,
)

export const selectActiveAssignmentCount = createSelector([selectReports], (reports) =>
  reports.filter((report) => ['assigned', 'in_progress'].includes(report.status)).length,
)

/** Everything the incident detail view needs, in one object. */
export const selectReportDetail = createSelector([selectSelectedReport], (report) => ({
  report,
  nextAction: report ? STATUS_ACTIONS[report.status] : null,
  canVerify: report?.status === 'reported',
  canAssign: report?.status === 'verified',
  canStart: report?.status === 'assigned',
  canResolve: report?.status === 'in_progress',
}))
