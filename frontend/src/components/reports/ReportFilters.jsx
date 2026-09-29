import { Filter, RotateCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDebounce } from '../../hooks/useDebounce.js'
import { DATE_RANGES, ISSUE_CATEGORIES, REPORT_STATUS_LABELS, RISK_LEVELS, WARDS } from '../../utils/constants.js'
import Button from '../common/Button.jsx'
import { useSelector } from 'react-redux'
import { selectFiltersActive } from '../../redux/slices/uiSlice.js'

/**
 * Report filter bar.
 *
 * The control set is defined by props, so the verification queue, the
 * assignments board and the citizen list reuse the same bar with only the
 * fields they actually support.
 */

const DEFAULT_FIELDS = ['search', 'dateRange', 'ward', 'issueCategory', 'status', 'priority', 'riskLevel', 'sort']

export default function ReportFilters({
  filters,
  onChange,
  onClear,
  fields = DEFAULT_FIELDS,
  total,
  right,
  className = '',
}) {
  const globalActive = useSelector(selectFiltersActive)
  const hasSearchField = fields.includes('search')
  const [search, setSearch] = useState(filters.search ?? '')
  const [syncedSearch, setSyncedSearch] = useState(filters.search ?? '')
  const debouncedSearch = useDebounce(search, 350)

  // Clear-from-elsewhere (the "Clear" button, a role switch) has to pull the
  // input back in step. Adjusting during render rather than in an effect avoids
  // the extra paint and the cascading render.
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search ?? '')
    setSearch(filters.search ?? '')
  }

  useEffect(() => {
    if (!hasSearchField) return
    if ((filters.search ?? '') === debouncedSearch) return
    onChange({ search: debouncedSearch })
    // `onChange` is recreated by the caller on every filter change; depending on
    // it here would loop, so the debounced term is the only trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, hasSearchField])

  const hasFilters =
    Boolean(filters.ward && filters.ward !== 'all') ||
    Boolean(filters.issueCategory && filters.issueCategory !== 'all') ||
    Boolean(filters.status && filters.status !== 'all') ||
    Boolean(filters.priority && filters.priority !== 'all') ||
    Boolean(filters.riskLevel && filters.riskLevel !== 'all') ||
    Boolean(filters.search) ||
    filters.dateRange !== '30d'

  const fieldClass = 'input h-9 py-1.5 text-[12px]'

  return (
    <div className={`card p-3.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-body">
          <Filter size={12} aria-hidden="true" />
          Filters
        </span>

        {hasSearchField ? (
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ID, title, address…"
              aria-label="Search reports"
              className={`${fieldClass} w-full pl-8`}
            />
          </div>
        ) : null}

        {fields.includes('dateRange') ? (
          <select
            value={filters.dateRange}
            onChange={(event) => onChange({ dateRange: event.target.value })}
            aria-label="Date range"
            className={fieldClass}
          >
            {DATE_RANGES.filter((range) => range.value !== 'custom').map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        ) : null}

        {fields.includes('ward') ? (
          <select value={filters.ward} onChange={(event) => onChange({ ward: event.target.value })} aria-label="Ward" className={fieldClass}>
            <option value="all">All wards</option>
            {WARDS.map((ward) => (
              <option key={ward} value={ward}>
                {ward}
              </option>
            ))}
          </select>
        ) : null}

        {fields.includes('issueCategory') ? (
          <select
            value={filters.issueCategory}
            onChange={(event) => onChange({ issueCategory: event.target.value })}
            aria-label="Issue category"
            className={fieldClass}
          >
            <option value="all">All categories</option>
            {ISSUE_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        ) : null}

        {fields.includes('status') ? (
          <select value={filters.status} onChange={(event) => onChange({ status: event.target.value })} aria-label="Status" className={fieldClass}>
            <option value="all">All statuses</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        ) : null}

        {fields.includes('priority') ? (
          <select
            value={filters.priority}
            onChange={(event) => onChange({ priority: event.target.value })}
            aria-label="Priority"
            className={fieldClass}
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        ) : null}

        {fields.includes('riskLevel') ? (
          <select
            value={filters.riskLevel}
            onChange={(event) => onChange({ riskLevel: event.target.value })}
            aria-label="Risk level"
            className={fieldClass}
          >
            <option value="all">All risk levels</option>
            {RISK_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        ) : null}

        {fields.includes('sort') ? (
          <select value={filters.sort} onChange={(event) => onChange({ sort: event.target.value })} aria-label="Sort by" className={fieldClass}>
            <option value="latest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="priority">Priority</option>
            <option value="ward">Ward</option>
          </select>
        ) : null}

        <div className="ml-auto flex items-center gap-2.5">
          {typeof total === 'number' ? <span className="text-[11px] text-muted">{total} results</span> : null}
          {right}
          {hasFilters ? (
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                setSearch('')
                onClear()
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {globalActive && !hasFilters ? (
        <p className="mt-2.5 text-[11px] text-muted">Global date or ward filters from another page are also applied.</p>
      ) : null}
    </div>
  )
}
