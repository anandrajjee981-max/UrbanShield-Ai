import { USE_MOCK, clone, fakeLatency, get, patch } from '../../services/api.js'
import { MOCK_DEPARTMENTS, MOCK_WEATHER } from '../../mock/users.js'
import { MOCK_REPORTS } from '../../mock/reports.js'
import { MOCK_RISK_ZONES } from '../../mock/risks.js'
import { applyFilters, queryItems, rangeToDays } from '../../utils/filters.js'
import { countBySeverity, percentChange } from '../../utils/riskCalculator.js'
import {
  buildStatusDistribution,
  buildTopIssueTypes,
  buildReportsTrend,
  buildWardRisk,
} from '../../mock/analytics.js'

/** `GET /api/dashboard` - the authority landing payload in one round-trip. */
export async function fetchDashboard(filters = {}) {
  if (!USE_MOCK) return get('/api/dashboard', filters)

  await fakeLatency()
  return buildDashboardPayload(filters)
}

function buildDashboardPayload(filters = {}) {
  const reports = applyFilters(MOCK_REPORTS, filters)
  const risks = applyFilters(MOCK_RISK_ZONES, filters)

  const allReports = MOCK_REPORTS
  const severity = countBySeverity(risks)

  const stat = (current, baseline) => ({
    value: current,
    trend: percentChange(current, baseline),
    isUp: current >= baseline,
  })

  // Trend compares the filtered window with the whole dataset, which is a
  // stand-in for "previous period" until the API returns a real comparison.
  const previous = {
    reports: Math.max(1, Math.round(reports.length * 0.82)),
    pending: Math.max(0, reports.filter((report) => report.status === 'reported').length),
  }

  return {
    weather: clone(MOCK_WEATHER),
    stats: {
      highRiskZones: stat(severity.high, Math.round(severity.high * 1.15) || 1),
      mediumRiskZones: stat(severity.medium, Math.round(severity.medium * 0.9) || 1),
      lowRiskZones: stat(severity.low + severity.minimal, Math.round((severity.low + severity.minimal) * 0.95) || 1),
      totalReports: stat(reports.length, previous.reports),
      pendingVerification: stat(reports.filter((report) => report.status === 'reported').length, previous.pending),
      activeDepartments: stat(
        new Set(reports.filter((report) => report.department).map((report) => report.department.id)).size,
        MOCK_DEPARTMENTS.length,
      ),
    },
    recentReports: queryItems(allReports, {}).slice(0, 6),
    reportsByStatus: buildStatusDistribution(reports),
    topIssueTypes: buildTopIssueTypes(reports),
    issueTrends: buildReportsTrend(reports, Math.min(rangeToDays(filters.dateRange) ?? 14, 14)),
    wardRisk: buildWardRisk(risks, reports),
    activeAssignments: allReports.filter((report) => ['assigned', 'in_progress'].includes(report.status)).slice(0, 8),
    updatedAt: new Date().toISOString(),
  }
}

/** `GET /api/notifications` */
export async function fetchNotifications() {
  if (!USE_MOCK) return get('/api/notifications')

  await fakeLatency(200, 420)

  const now = Date.now()
  const source = [...MOCK_REPORTS]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8)

  return source.map((report, index) => {
    const read = index > 3
    const base = {
      id: `ntf-${report.id}`,
      reportId: report.id,
      trackingId: report.trackingId,
      read,
      createdAt: new Date(now - index * 47 * 60000).toISOString(),
    }

    if (report.status === 'reported') {
      return { ...base, type: 'authority_update', title: 'New report awaiting verification', body: `${report.trackingId} - ${report.issueLabel} in ${report.ward} needs field verification.`, severity: 'medium' }
    }
    if (report.status === 'resolved') {
      return { ...base, type: 'report_status_changed', title: 'Report resolved', body: `${report.trackingId} - ${report.issueLabel} was marked resolved by ${report.department?.shortName ?? 'the department'}.`, severity: 'low' }
    }
    if (report.status === 'assigned') {
      return { ...base, type: 'report_assigned', title: 'Report assigned', body: `${report.trackingId} was assigned to ${report.department?.shortName ?? 'a department'}.`, severity: 'info' }
    }
    if (report.priority === 'high') {
      return { ...base, type: 'risk_alert', title: 'High risk alert', body: `Risk score elevated in ${report.ward}. Immediate inspection recommended.`, severity: 'high' }
    }
    return { ...base, type: 'ai_prediction', title: 'AI prediction updated', body: `Forecast refreshed: ${report.ward} heat risk trending upward.`, severity: 'info' }
  })
}

/** `PATCH /api/notifications/:id/read` */
export async function markNotificationRead(id) {
  if (!USE_MOCK) return patch(`/api/notifications/${id}/read`)

  await fakeLatency(80, 160)
  return { id, read: true }
}

/** Reference data for the departments and assignment screens. */
export async function fetchDepartments() {
  if (!USE_MOCK) return get('/api/departments')

  await fakeLatency(200, 400)

  const reports = MOCK_REPORTS
  return MOCK_DEPARTMENTS.map((department) => {
    const owned = reports.filter((report) => report.department?.id === department.id)

    return {
      ...department,
      activeTasks: owned.filter((report) => ['assigned', 'in_progress'].includes(report.status)).length,
      resolvedThisMonth: owned.filter((report) => report.status === 'resolved').length,
      pendingVerification: owned.filter((report) => report.status === 'reported').length,
      completionRate: owned.length ? Math.round((owned.filter((r) => r.status === 'resolved').length / owned.length) * 100) : 0,
    }
  })
}
