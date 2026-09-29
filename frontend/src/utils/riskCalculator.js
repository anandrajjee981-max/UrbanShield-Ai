import { RISK_LEVEL_COLORS } from './colors.js'
import { REPORT_STATUS_FLOW } from './constants.js'

/**
 * Risk scoring helpers.
 *
 * Nothing in the UI should hardcode "score > 70 is high" - severity always
 * comes from here so the map legend, badges, charts and filters agree.
 */

/** 0-100 score -> 'high' | 'medium' | 'low' | 'minimal'. */
export function scoreToLevel(score) {
  const value = Number(score) || 0
  if (value >= 70) return 'high'
  if (value >= 40) return 'medium'
  if (value >= 20) return 'low'
  return 'minimal'
}

/** Severity label for a score. */
export function scoreToLevelLabel(score) {
  const labels = { high: 'High Risk', medium: 'Medium Risk', low: 'Low Risk', minimal: 'Minimal Risk' }
  return labels[scoreToLevel(score)]
}

/** Colour for a score, taken from the shared token map. */
export function scoreToColor(score) {
  return RISK_LEVEL_COLORS[scoreToLevel(score)]
}

/** Accepts a risk object, a score, or a level string and returns a colour. */
export function levelToColor(levelOrScore) {
  if (typeof levelOrScore === 'string' && levelOrScore in RISK_LEVEL_COLORS) {
    return RISK_LEVEL_COLORS[levelOrScore]
  }
  return scoreToColor(levelOrScore)
}

/** CSS fill/stroke colour for a single Recharts datum. */
export function chartColorFor(levelOrScore, fallbackIndex = 0) {
  const resolved = levelToColor(levelOrScore)
  if (resolved) return resolved
  return ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444'][fallbackIndex % 5]
}

/**
 * Composite risk score for a ward, weighted from live signals.
 * Weights sum to 1 so the result stays inside 0-100.
 */
export function calculateRiskScore({ heat = 0, water = 0, infrastructure = 0, reports = 0, population = 0 }) {
  return Math.round(heat * 0.3 + water * 0.25 + infrastructure * 0.2 + reports * 0.15 + population * 0.1)
}

/** Index of `status` inside the lifecycle; -1 for unknown values. */
export function statusIndex(status) {
  return REPORT_STATUS_FLOW.indexOf(status)
}

/**
 * Timeline state for every lifecycle step.
 * Completed steps are 'done', the current step is 'current', the rest 'pending'.
 */
export function getTimelineState(status) {
  const current = statusIndex(status)

  return REPORT_STATUS_FLOW.map((step, index) => {
    if (current === -1) return { status: step, state: 'pending' }
    if (index < current) return { status: step, state: 'done' }
    if (index === current) return { status: step, state: 'current' }
    return { status: step, state: 'pending' }
  })
}

/** Count of reports per severity, the source for every "risk zones" stat. */
export function countBySeverity(items) {
  return items.reduce(
    (acc, item) => {
      const level = scoreToLevel(item.score ?? item.riskScore)
      acc[level] = (acc[level] ?? 0) + 1
      return acc
    },
    { high: 0, medium: 0, low: 0, minimal: 0 },
  )
}

/** Percentage change between two numbers, guarded against divide-by-zero. */
export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}
