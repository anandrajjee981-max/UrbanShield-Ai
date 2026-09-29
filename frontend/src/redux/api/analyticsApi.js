import { USE_MOCK, fakeLatency, get } from '../../services/api.js'
import { MOCK_REPORTS } from '../../mock/reports.js'
import { MOCK_RISK_ZONES } from '../../mock/risks.js'
import { applyFilters, rangeToDays } from '../../utils/filters.js'
import {
  buildAiInsights,
  buildCategoryDistribution,
  buildIssueDistribution,
  buildOverview,
  buildPredictions,
  buildRecommendations,
  buildReportsTrend,
  buildRiskTrend,
  buildRiskPredictions,
  buildStatusDistribution,
  buildTopIssueTypes,
  buildWardRisk,
} from '../../mock/analytics.js'

/**
 * Analytics endpoints.
 *
 * In mock mode every figure is computed from the same report/risk datasets the
 * dashboard and map use, so KPIs can never drift from the charts below them.
 */

function source(filters) {
  return {
    reports: applyFilters(MOCK_REPORTS, filters),
    risks: applyFilters(MOCK_RISK_ZONES, filters),
  }
}

/** `GET /api/analytics/overview` */
export async function fetchAnalyticsOverview(filters = {}) {
  if (!USE_MOCK) return get('/api/analytics/overview', filters)

  await fakeLatency()
  const { reports, risks } = source(filters)
  return buildOverview(risks, reports)
}

/** `GET /api/analytics/trends` */
export async function fetchAnalyticsTrends(filters = {}) {
  if (!USE_MOCK) return get('/api/analytics/trends', filters)

  await fakeLatency()
  const { reports, risks } = source(filters)
  const days = rangeToDays(filters.dateRange) ?? 30

  return {
    riskTrend: buildRiskTrend(reports, risks, Math.min(days, 30)),
    reportsTrend: buildReportsTrend(reports, Math.min(days, 14)),
  }
}

/** `GET /api/analytics/distribution` */
export async function fetchAnalyticsDistribution(filters = {}) {
  if (!USE_MOCK) return get('/api/analytics/distribution', filters)

  await fakeLatency()
  const { reports, risks } = source(filters)

  return {
    byWard: buildWardRisk(risks, reports),
    byStatus: buildStatusDistribution(reports),
    byIssueType: buildIssueDistribution(reports),
    topIssueTypes: buildTopIssueTypes(reports),
    byCategory: buildCategoryDistribution(reports),
  }
}

/** `GET /api/analytics/predictions` */
export async function fetchAnalyticsPredictions(filters = {}) {
  if (!USE_MOCK) return get('/api/analytics/predictions', filters)

  await fakeLatency()
  const { reports, risks } = source(filters)

  return {
    series: buildPredictions(risks, reports),
    cards: buildRiskPredictions(risks),
    recommendations: buildRecommendations(risks),
    insights: buildAiInsights(risks, reports, buildWardRisk(risks, reports)),
  }
}

/** Single call used by the Risk Analytics page - one loading state, one error. */
export async function fetchAnalyticsBundle(filters = {}) {
  const [overview, trends, distribution, predictions] = await Promise.all([
    fetchAnalyticsOverview(filters),
    fetchAnalyticsTrends(filters),
    fetchAnalyticsDistribution(filters),
    fetchAnalyticsPredictions(filters),
  ])

  return { overview, ...trends, ...distribution, ...predictions }
}

/** `POST /api/ai/ask` - the AI assistant endpoint. */
export async function askAiAssistant(question, filters = {}) {
  if (!USE_MOCK) return get('/api/ai/ask', { question, ...filters })

  await fakeLatency(500, 900)
  const { reports, risks } = source(filters)
  const wards = buildWardRisk(risks, reports)
  const worst = [...wards].sort((a, b) => b.score - a.score)[0]
  const topIssue = buildTopIssueTypes(reports, 1)[0]

  return {
    question,
    answer:
      `Across the current window I am tracking ${risks.length} active risk zones and ${reports.length} citizen reports. ` +
      `${worst?.ward ?? 'Ward 1'} carries the highest composite risk at ${worst?.score ?? 0}/100, and ` +
      `${topIssue?.name ?? 'road damage'} is the most reported issue with ${topIssue?.value ?? 0} reports. ` +
      `My recommendation is to prioritise ${worst?.ward ?? 'the highest scoring ward'} for a joint inspection this week.`,
    sources: { risks: risks.length, reports: reports.length, generatedAt: new Date().toISOString() },
    suggestions: [
      'Which ward has the highest composite risk?',
      'Summarise water stress areas',
      'What should the Heat Cell prioritise this week?',
      'Show reports awaiting verification',
    ],
  }
}
