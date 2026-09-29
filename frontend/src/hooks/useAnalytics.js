import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { askAi, clearAssistant, loadAnalytics } from '../redux/slices/analyticsSlice.js'
import { selectApiFilters } from '../redux/selectors.js'
import {
  selectAnalyticsError,
  selectAnalyticsKpis,
  selectAnalyticsLoading,
  selectAssistant,
  selectCategoryDistribution,
  selectInsights,
  selectIssueDistribution,
  selectOverview,
  selectPredictionCards,
  selectPredictions,
  selectRecommendations,
  selectReportsTrend,
  selectRiskTrend,
  selectStatusDistribution,
  selectTopIssueTypes,
  selectWardRiskRanked,
} from '../redux/slices/analyticsSlice.js'

/**
 * Analytics data hook.
 *
 * Fetches the whole bundle whenever the global filters change, so every chart,
 * the AI rail and the KPI row always describe the same window.
 */
export function useAnalytics({ enabled = true } = {}) {
  const dispatch = useDispatch()
  const filters = useSelector(selectApiFilters)

  const loading = useSelector(selectAnalyticsLoading)
  const error = useSelector(selectAnalyticsError)
  const kpis = useSelector(selectAnalyticsKpis)
  const overview = useSelector(selectOverview)
  const riskTrend = useSelector(selectRiskTrend)
  const reportsTrend = useSelector(selectReportsTrend)
  const wardRisk = useSelector(selectWardRiskRanked)
  const byStatus = useSelector(selectStatusDistribution)
  const byIssueType = useSelector(selectIssueDistribution)
  const byCategory = useSelector(selectCategoryDistribution)
  const topIssueTypes = useSelector(selectTopIssueTypes)
  const predictions = useSelector(selectPredictions)
  const predictionCards = useSelector(selectPredictionCards)
  const recommendations = useSelector(selectRecommendations)
  const insights = useSelector(selectInsights)
  const assistant = useSelector(selectAssistant)

  useEffect(() => {
    if (enabled) dispatch(loadAnalytics(filters))
  }, [dispatch, enabled, filters])

  const ask = useCallback((question) => dispatch(askAi(question)), [dispatch])
  const resetAssistant = useCallback(() => dispatch(clearAssistant()), [dispatch])
  const refetch = useCallback(() => dispatch(loadAnalytics(filters)), [dispatch, filters])

  return {
    loading,
    error,
    kpis,
    overview,
    riskTrend,
    reportsTrend,
    wardRisk,
    byStatus,
    byIssueType,
    byCategory,
    topIssueTypes,
    predictions,
    predictionCards,
    recommendations,
    insights,
    assistant,
    ask,
    resetAssistant,
    refetch,
  }
}

export default useAnalytics
