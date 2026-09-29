import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as analyticsApi from '../api/analyticsApi.js'

/**
 * Analytics store.
 *
 * A single `loadAnalytics` bundle feeds every chart, the AI insight rail and
 * the recommendation list, so the page shows one loading state rather than six.
 */

export const loadAnalytics = createAsyncThunk('analytics/load', async (filters, { rejectWithValue }) => {
  try {
    return await analyticsApi.fetchAnalyticsBundle(filters)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

export const askAi = createAsyncThunk('analytics/askAi', async (question, { rejectWithValue }) => {
  try {
    return await analyticsApi.askAiAssistant(question)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  overview: {},
  riskTrend: [],
  reportsTrend: [],
  byWard: [],
  byStatus: [],
  byIssueType: [],
  byCategory: [],
  topIssueTypes: [],
  predictions: [],
  predictionCards: [],
  recommendations: [],
  insights: [],
  loading: false,
  error: null,
  updatedAt: null,
  assistant: { question: '', answer: '', suggestions: [], loading: false, error: null },
}

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    clearAssistant(state) {
      state.assistant = { ...initialState.assistant }
    },
    insightReceived(state, action) {
      if (!action.payload?.id) return
      if (!state.insights.some((insight) => insight.id === action.payload.id)) {
        state.insights.unshift(action.payload)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAnalytics.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadAnalytics.fulfilled, (state, action) => {
        const {
          overview,
          riskTrend,
          reportsTrend,
          byWard,
          byStatus,
          byIssueType,
          topIssueTypes,
          byCategory,
          series,
          cards,
          recommendations,
          insights,
        } = action.payload

        Object.assign(state, {
          overview,
          riskTrend,
          reportsTrend,
          byWard,
          byStatus,
          byIssueType,
          topIssueTypes,
          byCategory,
          predictions: series,
          predictionCards: cards,
          recommendations,
          insights,
          loading: false,
          updatedAt: new Date().toISOString(),
        })
      })
      .addCase(loadAnalytics.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load analytics.'
      })

      .addCase(askAi.pending, (state) => {
        state.assistant.loading = true
        state.assistant.error = null
        state.assistant.question = ''
      })
      .addCase(askAi.fulfilled, (state, action) => {
        state.assistant.loading = false
        state.assistant.answer = action.payload.answer
        state.assistant.suggestions = action.payload.suggestions ?? []
        state.assistant.question = action.payload.question
      })
      .addCase(askAi.rejected, (state, action) => {
        state.assistant.loading = false
        state.assistant.error = action.payload ?? 'The assistant could not respond.'
      })
  },
})

export const { clearAssistant, insightReceived } = analyticsSlice.actions

export default analyticsSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export const selectAnalyticsLoading = (state) => state.analytics.loading
export const selectAnalyticsError = (state) => state.analytics.error
export const selectOverview = (state) => state.analytics.overview
export const selectRiskTrend = (state) => state.analytics.riskTrend
export const selectReportsTrend = (state) => state.analytics.reportsTrend
export const selectWardRisk = (state) => state.analytics.byWard
export const selectStatusDistribution = (state) => state.analytics.byStatus
export const selectIssueDistribution = (state) => state.analytics.byIssueType
export const selectCategoryDistribution = (state) => state.analytics.byCategory
export const selectTopIssueTypes = (state) => state.analytics.topIssueTypes
export const selectPredictions = (state) => state.analytics.predictions
export const selectPredictionCards = (state) => state.analytics.predictionCards
export const selectRecommendations = (state) => state.analytics.recommendations
export const selectInsights = (state) => state.analytics.insights
export const selectAssistant = (state) => state.analytics.assistant

/** Ward data sorted worst-first - the order the bar chart and table both use. */
export const selectWardRiskRanked = createSelector([selectWardRisk], (wards) => [...wards].sort((a, b) => b.score - a.score))

/** The five KPI definitions the analytics header renders. */
export const selectAnalyticsKpis = createSelector([selectOverview], (overview) => [
  { key: 'highHeatRiskZones', label: 'High Heat Risk Zones', value: overview.highHeatRiskZones ?? 0, tone: 'heat' },
  { key: 'waterStressAreas', label: 'Water Stress Areas', value: overview.waterStressAreas ?? 0, tone: 'water' },
  { key: 'infrastructureRisks', label: 'Infrastructure Risks', value: overview.infrastructureRisks ?? 0, tone: 'infrastructure' },
  { key: 'totalGreenCover', label: 'Total Green Cover (sq km)', value: overview.totalGreenCover ?? 0, tone: 'garbage' },
  { key: 'totalReports', label: 'Total Reports', value: overview.totalReports ?? 0, tone: 'road' },
])
