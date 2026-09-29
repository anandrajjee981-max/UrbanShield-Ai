import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { fetchDashboard, fetchDepartments } from '../api/dashboardApi.js'

/**
 * Authority dashboard store.
 *
 * Replaces the old hardcoded fixture: every number here is fetched through
 * `redux/api/dashboardApi.js` and re-derived whenever the global filter changes.
 */

export const loadDashboard = createAsyncThunk('dashboard/load', async (filters, { rejectWithValue }) => {
  try {
    return await fetchDashboard(filters)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const loadDepartments = createAsyncThunk('dashboard/loadDepartments', async (_, { rejectWithValue }) => {
  try {
    return await fetchDepartments()
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  stats: {},
  weather: null,
  recentReports: [],
  reportsByStatus: [],
  topIssueTypes: [],
  issueTrends: [],
  wardRisk: [],
  activeAssignments: [],
  departments: [],
  loading: false,
  departmentsLoading: false,
  error: null,
  updatedAt: null,
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /** Applies a realtime delta without discarding the rest of the payload. */
    dashboardRecount(state, action) {
      const { totalReports, pendingVerification } = action.payload
      if (typeof totalReports === 'number') {
        state.stats.totalReports = { ...state.stats.totalReports, value: totalReports }
      }
      if (typeof pendingVerification === 'number') {
        state.stats.pendingVerification = { ...state.stats.pendingVerification, value: pendingVerification }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadDashboard.fulfilled, (state, action) => {
        const {
          stats,
          weather,
          recentReports,
          reportsByStatus,
          topIssueTypes,
          issueTrends,
          wardRisk,
          activeAssignments,
          updatedAt,
        } = action.payload

        Object.assign(state, {
          stats,
          weather,
          recentReports,
          reportsByStatus,
          topIssueTypes,
          issueTrends,
          wardRisk,
          activeAssignments,
          loading: false,
          updatedAt,
        })
      })
      .addCase(loadDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load the dashboard.'
      })

      .addCase(loadDepartments.pending, (state) => {
        state.departmentsLoading = true
      })
      .addCase(loadDepartments.fulfilled, (state, action) => {
        state.departments = action.payload
        state.departmentsLoading = false
      })
      .addCase(loadDepartments.rejected, (state, action) => {
        state.departmentsLoading = false
        state.error = action.payload ?? 'Could not load departments.'
      })
  },
})

export const { dashboardRecount } = dashboardSlice.actions

export default dashboardSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export const selectDashboardLoading = (state) => state.dashboard.loading
export const selectDashboardError = (state) => state.dashboard.error
export const selectStats = (state) => state.dashboard.stats
export const selectWeather = (state) => state.dashboard.weather
export const selectRecentReports = (state) => state.dashboard.recentReports
export const selectReportsByStatus = (state) => state.dashboard.reportsByStatus
export const selectTopIssueTypes = (state) => state.dashboard.topIssueTypes
export const selectIssueTrends = (state) => state.dashboard.issueTrends
export const selectWardRisk = (state) => state.dashboard.wardRisk
export const selectActiveAssignments = (state) => state.dashboard.activeAssignments
export const selectDepartments = (state) => state.dashboard.departments
export const selectDepartmentsLoading = (state) => state.dashboard.departmentsLoading

/** Ordered KPI definitions - the card row renders straight from this. */
export const selectDashboardKpis = createSelector([selectStats], (stats) => [
  { key: 'highRiskZones', label: 'High Risk Zones', tone: 'high' },
  { key: 'mediumRiskZones', label: 'Medium Risk Zones', tone: 'medium' },
  { key: 'lowRiskZones', label: 'Low Risk Zones', tone: 'low' },
  { key: 'totalReports', label: 'Total Reports', tone: 'info' },
  { key: 'pendingVerification', label: 'Pending Verification', tone: 'warning' },
  { key: 'activeDepartments', label: 'Active Departments', tone: 'infrastructure' },
].map((card) => ({ ...card, ...(stats[card.key] ?? { value: 0, trend: 0, isUp: false }) })))
