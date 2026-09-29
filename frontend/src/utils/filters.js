import { isWithinDays, resolveDateRange } from './formatDate.js'
import { scoreToLevel } from './riskCalculator.js'
import { DATE_RANGES } from './constants.js'

/**
 * Shared filter + sort pipeline.
 *
 * The same function is used by the mock API and by the client-side selectors,
 * so a list of reports, a chart series and a map layer can never disagree about
 * what "Ward 12 + Heat + last 7 days" means.
 */

/** Days covered by a date-range key, or `null` for "all time". */
export function rangeToDays(dateRange) {
  if (!dateRange || dateRange === 'all') return null
  return DATE_RANGES.find((range) => range.value === dateRange)?.days ?? 30
}

/** Case-insensitive substring match across the supplied fields. */
function matchesSearch(item, query, fields) {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  return fields.some((field) => {
    const value = typeof field === 'function' ? field(item) : item[field]
    return String(value ?? '').toLowerCase().includes(needle)
  })
}

/** Multi-value filters accept `'all'`, a single value or an array. */
function matchesMulti(value, filterValue) {
  if (filterValue === undefined || filterValue === null || filterValue === 'all' || filterValue === '') return true
  if (Array.isArray(filterValue)) return filterValue.length === 0 || filterValue.includes(value)
  return filterValue === value
}

/**
 * Status groups. Queues ask for a slice of the lifecycle rather than one state,
 * so `'active'` and `'open'` are first-class filter values.
 */
const STATUS_GROUPS = {
  active: ['assigned', 'in_progress'],
  open: ['reported', 'verified', 'assigned', 'in_progress'],
  pending: ['reported', 'verified'],
  closed: ['resolved', 'rejected'],
}

function matchesStatus(status, filterValue) {
  if (!filterValue || filterValue === 'all') return true
  const group = STATUS_GROUPS[filterValue]
  if (group) return group.includes(status)
  return status === filterValue
}

/**
 * Reports carry no numeric score, so the severity level used by the `riskLevel`
 * filter is derived from the priority the triage stage assigned.
 */
const PRIORITY_SCORE = { high: 78, medium: 55, low: 30 }

export function riskLevelOf(item) {
  if (item.score !== undefined) return scoreToLevel(item.score)
  if (item.riskScore !== undefined) return scoreToLevel(item.riskScore)
  if (item.priority) return scoreToLevel(PRIORITY_SCORE[item.priority])
  return undefined
}

/**
 * Applies every active filter to an array.
 * `filters` keys: `dateRange`, `customRange`, `ward`, `issueCategory`,
 * `issueType`, `status`, `priority`, `riskLevel`, `search`.
 */
export function applyFilters(items, filters = {}) {
  const days = rangeToDays(filters.dateRange)
  const { from, to } = resolveDateRange(filters.dateRange, filters.customRange)
  const searchFields = [
    'trackingId',
    'id',
    'title',
    'issueLabel',
    'ward',
    'address',
    'description',
    (item) => item.reporter?.name,
    (item) => item.department?.name,
    (item) => item.assignee?.name,
  ]

  return items.filter((item) => {
    if (days !== null && filters.dateRange !== 'custom') {
      if (!isWithinDays(item.createdAt ?? item.updatedAt, days)) return false
    } else if (filters.dateRange === 'custom' && filters.customRange?.from) {
      const timestamp = new Date(item.createdAt ?? item.updatedAt).getTime()
      if (timestamp < from.getTime() || timestamp > to.getTime()) return false
    }

    if (filters.ward && filters.ward !== 'all' && item.ward !== filters.ward) return false
    if (!matchesMulti(item.category, filters.issueCategory)) return false
    if (!matchesMulti(item.issueType, filters.issueType)) return false
    if (!matchesStatus(item.status, filters.status)) return false
    if (!matchesMulti(item.priority, filters.priority)) return false
    if (filters.riskLevel && filters.riskLevel !== 'all') {
      if (riskLevelOf(item) !== filters.riskLevel) return false
    }

    return matchesSearch(item, filters.search, searchFields)
  })
}

/** `latest` | `oldest` | `priority` | `status`. */
export function applySort(items, sort = 'latest') {
  const sorted = [...items]

  switch (sort) {
    case 'oldest':
      return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    case 'priority': {
      const weight = { high: 0, medium: 1, low: 2 }
      return sorted.sort((a, b) => (weight[a.priority] ?? 3) - (weight[b.priority] ?? 3))
    }
    case 'status':
      return sorted.sort((a, b) => a.status.localeCompare(b.status))
    case 'latest':
    default:
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }
}

/** Runs filters then sort - the standard pipeline for list views. */
export function queryItems(items, filters = {}) {
  return applySort(applyFilters(items, filters), filters.sort)
}

/** Slices an already-filtered list into a page envelope. */
export function paginate(items, page = 1, limit = 10) {
  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * limit

  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    pageCount,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + limit, total),
  }
}
