import { CalendarRange, Filter, RotateCcw } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { resetFilters, selectFiltersActive, selectGlobalFilters, setFilters } from '../../redux/slices/uiSlice.js'
import { DATE_RANGES, ISSUE_CATEGORIES, RISK_LEVELS, WARDS } from '../../utils/constants.js'
import { formatDateRangeLabel } from '../../utils/formatDate.js'

/**
 * The global filter bar.
 *
 * Every data-driven page - dashboard, map, analytics - renders this exact
 * component. It writes to `ui.filters`, which is the single filter source the
 * analytics, map and dashboard hooks all subscribe to, so changing a filter
 * updates the map, the charts, the cards and the tables at once.
 */

const FIELD_CLASS =
  'h-9 rounded-lg border border-line bg-white px-3 pr-8 text-sm text-ink transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200'

function Field({ id, label, value, onChange, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children ?? (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={FIELD_CLASS}>
          {value}
        </select>
      )}
    </div>
  )
}

export default function FilterBar({ showIssue = true, showRisk = true, showWard = true, showDate = true, className = '' }) {
  const dispatch = useDispatch()
  const filters = useSelector(selectGlobalFilters)
  const isActive = useSelector(selectFiltersActive)

  const update = (patch) => dispatch(setFilters(patch))
  const isCustom = filters.dateRange === 'custom'

  return (
    <div className={`card flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between ${className}`}>
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:flex xl:items-end xl:gap-4">
        {showDate ? (
          <Field id="filter-date" label="Date range" value={filters.dateRange} onChange={(value) => update({ dateRange: value })}>
            <select
              id="filter-date"
              value={filters.dateRange}
              onChange={(event) => update({ dateRange: event.target.value })}
              className={FIELD_CLASS}
            >
              {DATE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
              <option value="all">All Time</option>
            </select>
          </Field>
        ) : null}

        {showDate && isCustom ? (
          <>
            <Field id="filter-from" label="From" value={filters.customRange?.from ?? ''} onChange={() => {}}>
              <input
                id="filter-from"
                type="date"
                value={filters.customRange?.from ? filters.customRange.from.slice(0, 10) : ''}
                onChange={(event) => update({ customRange: { ...filters.customRange, from: event.target.value } })}
                className={FIELD_CLASS}
              />
            </Field>
            <Field id="filter-to" label="To" value={filters.customRange?.to ?? ''} onChange={() => {}}>
              <input
                id="filter-to"
                type="date"
                value={filters.customRange?.to ? filters.customRange.to.slice(0, 10) : ''}
                onChange={(event) => update({ customRange: { ...filters.customRange, to: event.target.value } })}
                className={FIELD_CLASS}
              />
            </Field>
          </>
        ) : null}

        {showWard ? (
          <Field id="filter-ward" label="Ward" value={filters.ward} onChange={(value) => update({ ward: value })}>
            <select id="filter-ward" value={filters.ward} onChange={(event) => update({ ward: event.target.value })} className={FIELD_CLASS}>
              <option value="all">All Wards</option>
              {WARDS.map((ward) => (
                <option key={ward} value={ward}>
                  {ward}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {showIssue ? (
          <Field
            id="filter-issue"
            label="Issue type"
            value={filters.issueCategory}
            onChange={(value) => update({ issueCategory: value })}
          >
            <select
              id="filter-issue"
              value={filters.issueCategory}
              onChange={(event) => update({ issueCategory: event.target.value })}
              className={FIELD_CLASS}
            >
              <option value="all">All Issues</option>
              {ISSUE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        {showRisk ? (
          <Field
            id="filter-risk"
            label="Risk level"
            value={filters.riskLevel}
            onChange={(value) => update({ riskLevel: value })}
          >
            <select
              id="filter-risk"
              value={filters.riskLevel}
              onChange={(event) => update({ riskLevel: event.target.value })}
              className={FIELD_CLASS}
            >
              <option value="all">All Risk Levels</option>
              {RISK_LEVELS.filter((level) => level.value !== 'minimal').map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-body">
          <CalendarRange size={14} className="text-brand-500" aria-hidden="true" />
          <span className="hidden sm:inline">{formatDateRangeLabel(filters.dateRange, filters.customRange)}</span>
          <span className="sm:hidden">Filtered</span>
        </div>

        <button
          type="button"
          onClick={() => dispatch(resetFilters())}
          disabled={!isActive}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-body transition hover:bg-slate-50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isActive ? <RotateCcw size={14} aria-hidden="true" /> : <Filter size={14} aria-hidden="true" />}
          Clear
        </button>
      </div>
    </div>
  )
}
