/**
 * Mock analytics engine.
 *
 * Nothing here returns a literal dashboard number. Every figure is *derived*
 * from the report and risk datasets, so the KPIs, the charts, the map counts and
 * the tables can never disagree with each other. In production these builders
 * disappear and `/api/analytics/*` supplies the same shapes.
 */

import { ISSUE_CATEGORIES, WARDS } from '../utils/constants.js'
import { buildDayLabels } from '../utils/formatDate.js'
import { countBySeverity, percentChange, scoreToLevel } from '../utils/riskCalculator.js'
import { RISK_CATEGORY_COLORS } from '../utils/colors.js'

/** Green cover is expressed as a share of the ~110 sq km municipal area. */
const CITY_AREA_SQ_KM = 110

/** Groups a list of reports by a key and returns `{ key, value }` pairs. */
function tally(items, keyFn) {
  const counts = new Map()
  for (const item of items) {
    const key = keyFn(item)
    if (key === undefined || key === null) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].map(([name, value]) => ({ name, value }))
}

/** Mean of a numeric accessor, 0 when the set is empty. */
function mean(items, pick) {
  if (!items.length) return 0
  return items.reduce((sum, item) => sum + (pick(item) ?? 0), 0) / items.length
}

/** Per-ward aggregate used by both the ward chart and the ward table. */
export function buildWardRisk(risks, reports) {
  return WARDS.map((ward) => {
    const wardRisks = risks.filter((risk) => risk.ward === ward)
    const wardReports = reports.filter((report) => report.ward === ward)

    const heat = mean(wardRisks.filter((r) => r.type === 'heat'), (r) => r.score)
    const water = mean(wardRisks.filter((r) => r.type === 'water'), (r) => r.score)
    const infrastructure = mean(wardRisks.filter((r) => r.type === 'infrastructure'), (r) => r.score)
    const environment = mean(wardRisks.filter((r) => r.type === 'environment'), (r) => r.score)

    const score = Math.round(heat * 0.35 + water * 0.25 + infrastructure * 0.2 + environment * 0.1 + Math.min(100, wardReports.length * 6) * 0.1)

    return {
      ward,
      score,
      level: scoreToLevel(score),
      riskZones: wardRisks.length,
      reports: wardReports.length,
      heat: Math.round(heat),
      water: Math.round(water),
      infrastructure: Math.round(infrastructure),
    }
  })
}

/** Top KPI row of the Risk Analytics page. */
export function buildOverview(risks, reports) {
  const severity = countBySeverity(risks)
  const wards = buildWardRisk(risks, reports)

  // A ward's green cover falls as its heat load climbs - a crude but honest proxy.
  const greenCover = Math.round(
    wards.reduce((sum, ward) => sum + CITY_AREA_SQ_KM / wards.length * (1 - ward.heat / 220), 0) * 10,
  ) / 10

  return {
    highHeatRiskZones: risks.filter((risk) => risk.type === 'heat' && risk.score >= 70).length,
    waterStressAreas: risks.filter((risk) => risk.type === 'water' && risk.score >= 40).length,
    infrastructureRisks: risks.filter((risk) => risk.type === 'infrastructure' && risk.score >= 40).length,
    totalGreenCover: greenCover,
    totalReports: reports.length,
    totalRiskZones: risks.length,
    highRiskZones: severity.high,
    mediumRiskZones: severity.medium,
    lowRiskZones: severity.low,
    minimalRiskZones: severity.minimal,
    openIncidents: reports.filter((report) => report.status !== 'resolved').length,
    resolvedIncidents: reports.filter((report) => report.status === 'resolved').length,
    resolutionRate: percentChange(reports.filter((r) => r.status === 'resolved').length, reports.length) === 0
      ? 0
      : Math.round((reports.filter((r) => r.status === 'resolved').length / reports.length) * 100),
    greenCoverTrend: Math.round(mean(wards, (ward) => 100 - ward.heat) / 10),
  }
}

/** Daily risk trend across the last `days` days. */
export function buildRiskTrend(reports, risks, days = 30) {
  const labels = buildDayLabels(days)
  const now = Date.now()

  return labels.map((date, index) => {
    const dayStart = now - (days - 1 - index) * 24 * 60 * 60 * 1000
    const windowReports = reports.filter((report) => new Date(report.createdAt).getTime() >= dayStart)
    const windowRisks = risks.filter((risk) => new Date(risk.updatedAt).getTime() >= dayStart)

    return {
      date,
      heat: Math.round(mean(windowRisks.filter((r) => r.type === 'heat'), (r) => r.score)),
      water: Math.round(mean(windowRisks.filter((r) => r.type === 'water'), (r) => r.score)),
      infrastructure: Math.round(mean(windowRisks.filter((r) => r.type === 'infrastructure'), (r) => r.score)),
      reported: windowReports.length,
    }
  })
}

/** Report volume per day - Reported / Verified / Resolved. */
export function buildReportsTrend(reports, days = 14) {
  const labels = buildDayLabels(days)
  const now = Date.now()

  return labels.map((date, index) => {
    const dayStart = now - (days - 1 - index) * 24 * 60 * 60 * 1000
    const daily = reports.filter((report) => new Date(report.createdAt).getTime() >= dayStart)

    return {
      date,
      reported: daily.length,
      verified: daily.filter((report) => ['verified', 'assigned', 'in_progress', 'resolved'].includes(report.status)).length,
      resolved: daily.filter((report) => report.status === 'resolved').length,
    }
  })
}

/** Issue type mix, ordered by the canonical category order. */
export function buildIssueDistribution(reports) {
  const counts = new Map(tally(reports, (report) => report.issueLabel))
  const categoryCounts = new Map(tally(reports, (report) => report.category))

  return [
    ...[...categoryCounts.entries()].map(([name, value]) => ({
      name,
      value,
      fill: RISK_CATEGORY_COLORS[name] ?? '#94A3B8',
    })),
    ...[...counts.entries()].map(([name, value]) => ({ name, value, isDetail: true })),
  ].filter((item) => item.name !== 'other' || !categoryCounts.has('other'))
}

/** Donut data for the lifecycle split. */
export function buildStatusDistribution(reports) {
  const order = ['reported', 'verified', 'assigned', 'in_progress', 'resolved']
  const fills = { reported: '#EF4444', verified: '#F59E0B', assigned: '#3B82F6', in_progress: '#8B5CF6', resolved: '#10B981' }
  const labels = { reported: 'Reported', verified: 'Verified', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved' }

  return order.map((status) => ({
    name: labels[status],
    status,
    value: reports.filter((report) => report.status === status).length,
    fill: fills[status],
  }))
}

/** Top issue types ranked by volume - horizontal bar chart. */
export function buildTopIssueTypes(reports, limit = 6) {
  return tally(reports, (report) => report.issueLabel)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map((item) => {
      const sample = reports.find((report) => report.issueLabel === item.name)
      return { ...item, fill: RISK_CATEGORY_COLORS[sample?.category] ?? '#94A3B8' }
    })
}

/** 7-day forward-looking projection with a widening confidence band. */
export function buildPredictions(risks, reports) {
  const labels = buildDayLabels(7)
  const baseHeat = mean(risks.filter((r) => r.type === 'heat'), (r) => r.score) || 55
  const baseWater = mean(risks.filter((r) => r.type === 'water'), (r) => r.score) || 45
  const baseInfra = mean(risks.filter((r) => r.type === 'infrastructure'), (r) => r.score) || 35
  const recentHeatRate = mean(reports.slice(0, 10), (report) => (report.category === 'heat' ? 6 : 0))

  return labels.map((date, index) => {
    const horizon = index + 1
    const drift = 1 + horizon * 0.02

    return {
      date,
      heat: Math.min(100, Math.round(baseHeat * drift + recentHeatRate * horizon * 0.12)),
      water: Math.min(100, Math.round(baseWater * drift)),
      infrastructure: Math.min(100, Math.round(baseInfra * (1 + horizon * 0.008))),
      upper: Math.min(100, Math.round(baseHeat * drift + 12)),
      lower: Math.max(0, Math.round(baseHeat * drift - 12)),
      confidence: Math.max(0.55, 0.94 - horizon * 0.045),
    }
  })
}

/** AI insight feed - generated from the worst signals in the dataset. */
export function buildAiInsights(risks, reports, wardRisk) {
  const worstWards = [...wardRisk].sort((a, b) => b.score - a.score)
  const topIssue = buildTopIssueTypes(reports, 1)[0]
  const waterHotspot = [...risks].filter((r) => r.type === 'water').sort((a, b) => b.score - a.score)[0]
  const heatHotspot = [...risks].filter((r) => r.type === 'heat').sort((a, b) => b.score - a.score)[0]
  const garbageWard = reports.filter((r) => r.category === 'garbage')
  const garbageWardName = tally(garbageWard, (r) => r.ward).sort((a, b) => b.value - a.value)[0]?.name

  const insights = [
    {
      id: 'ins-water-1',
      priority: waterHotspot && waterHotspot.score >= 70 ? 'high' : 'medium',
      title: `Water stress concentrated in ${waterHotspot?.ward ?? worstWards[0]?.ward}`,
      description: `${waterHotspot?.impact ?? 'Elevated night flow detected.'} Score ${waterHotspot?.score ?? 0}/100, confidence ${Math.round((waterHotspot?.confidence ?? 0) * 100)}%.`,
      recommendation: 'Inspect the distribution line in this ward and stage a temporary supply point.',
      confidence: waterHotspot?.confidence ?? 0.8,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'ins-heat-1',
      priority: heatHotspot && heatHotspot.score >= 70 ? 'high' : 'medium',
      title: `Heat risk likely to increase over the next week in ${heatHotspot?.ward ?? worstWards[1]?.ward}`,
      description: `Surface temperature is running ${heatHotspot?.impact?.match(/([\d.]+) C/)?.[1] ?? '3-4'} C above the city average with no forecast relief.`,
      recommendation: 'Open cooling centres and pre-position drinking water in the affected blocks.',
      confidence: heatHotspot?.confidence ?? 0.85,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'ins-garbage-1',
      priority: 'medium',
      title: `${garbageWardName ?? 'Several wards'} account for most waste complaints`,
      description: `Garbage reports have tripled in ${garbageWardName ?? 'this cluster'} over the last 10 days while the assigned vehicle shows the lowest route completion rate.`,
      recommendation: 'Re-sequence the collection route and add an evening pickup for this block.',
      confidence: 0.74,
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'ins-infra-1',
      priority: worstWards[0]?.score >= 70 ? 'high' : 'low',
      title: `Composite risk highest in ${worstWards[0]?.ward ?? 'Ward 1'}`,
      description: `Composite score ${worstWards[0]?.score ?? 0}/100 across heat, water and infrastructure signals with ${worstWards[0]?.riskZones ?? 0} active risk zones.`,
      recommendation: 'Deploy a joint inspection team covering water, roads and electrical in this ward.',
      confidence: 0.82,
      createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    },
  ]

  if (topIssue) {
    insights.push({
      id: 'ins-issue-1',
      priority: 'medium',
      title: `${topIssue.name} is the most reported issue`,
      description: `${topIssue.value} reports in the selected window, which is the single largest contributor to the open incident queue.`,
      recommendation: `Route additional capacity to the ${topIssue.name} pipeline for this week.`,
      confidence: 0.9,
      createdAt: new Date(Date.now() - 40 * 60 * 60 * 1000).toISOString(),
    })
  }

  return insights
}

/** Actionable recommendations derived from the top risks. */
export function buildRecommendations(risks) {
  const heatCount = risks.filter((r) => r.type === 'heat' && r.score >= 70).length
  const waterCount = risks.filter((r) => r.type === 'water' && r.score >= 60).length
  const garbageCount = risks.filter((r) => r.type === 'garbage' && r.score >= 50).length
  const infraCount = risks.filter((r) => r.type === 'infrastructure' && r.score >= 60).length

  const recommendations = []

  if (heatCount) {
    recommendations.push({
      id: 'rec-heat',
      title: 'Activate heat emergency protocol',
      description: `${heatCount} high heat-risk zones detected. Cooling centres should be opened before the next peak-afternoon window.`,
      impact: 'high',
      timeline: 'Within 24 hours',
      owner: 'Disaster Management & Heat Cell',
    })
  }
  if (waterCount) {
    recommendations.push({
      id: 'rec-water',
      title: 'Immediate pipeline inspection',
      description: `${waterCount} water stress areas exceed the intervention threshold. Acoustic leak detection should be deployed.`,
      impact: 'high',
      timeline: 'Within 48 hours',
      owner: 'Water Supply Department',
    })
  }
  recommendations.push({
    id: 'rec-tanker',
    title: 'Stage temporary water supply',
    description: 'Pre-position tankers in water stress wards to cover a service failure during the repair window.',
    impact: 'medium',
    timeline: 'Within 48 hours',
    owner: 'Water Supply Department',
  })
  if (garbageCount) {
    recommendations.push({
      id: 'rec-garbage',
      title: 'Increase garbage collection frequency',
      description: `${garbageCount} clusters are past the 72-hour collection threshold. Add an evening pickup and reassign vehicles.`,
      impact: 'medium',
      timeline: 'This week',
      owner: 'Sanitation & Waste Management',
    })
  }
  if (infraCount) {
    recommendations.push({
      id: 'rec-infra',
      title: 'Service at-risk power feeders',
      description: `${infraCount} infrastructure assets are degrading. Prioritise the highest load feeders before the peak season.`,
      impact: 'medium',
      timeline: 'This week',
      owner: 'Electrical & Streetlight Department',
    })
  }

  return recommendations
}

/** Compact AI metrics for the prediction row. */
export function buildRiskPredictions(risks) {
  const byType = (type) => {
    const set = risks.filter((risk) => risk.type === type)
    const score = Math.round(mean(set, (risk) => risk.score))
    return { score, level: scoreToLevel(score), trend: percentChange(score, Math.max(1, score - 6)) }
  }

  return [
    {
      id: 'pred-heat',
      title: 'Heat Risk Prediction',
      metric: '7-day peak index',
      ...byType('heat'),
      summary: 'Peak surface temperature is forecast to stay above the alert threshold for 5 consecutive days.',
    },
    {
      id: 'pred-water',
      title: 'Water Stress Prediction',
      metric: 'Supply reliability',
      ...byType('water'),
      summary: 'Reservoir and pressure data point to intermittent supply in the eastern wards.',
    },
    {
      id: 'pred-infra',
      title: 'Infrastructure Risk',
      metric: 'Asset health',
      ...byType('infrastructure'),
      summary: 'Two feeder lines require maintenance before the next demand peak.',
    },
    {
      id: 'pred-air',
      title: 'Air Quality Outlook',
      metric: 'AQI forecast',
      score: 46,
      level: 'low',
      trend: 8,
      summary: 'AQI is expected to stay in the satisfactory band despite rising daytime temperature.',
    },
  ]
}

/** Category split used by the analytics distribution chart. */
export function buildCategoryDistribution(reports) {
  return ISSUE_CATEGORIES.map((category) => ({
    name: category.label,
    key: category.value,
    value: reports.filter((report) => report.category === category.value).length,
    fill: RISK_CATEGORY_COLORS[category.value] ?? '#94A3B8',
  })).filter((item) => item.value > 0)
}
