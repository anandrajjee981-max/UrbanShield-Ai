/**
 * Map legend.
 *
 * Counts come straight from the loaded layers, so the numbers move with the
 * filters rather than being written into the component.
 */

const SEVERITY_ROWS = [
  { key: 'high', label: 'High Risk', color: '#EF4444', range: '70 – 100' },
  { key: 'medium', label: 'Medium Risk', color: '#F59E0B', range: '40 – 69' },
  { key: 'low', label: 'Low Risk', color: '#22C55E', range: '20 – 39' },
  { key: 'minimal', label: 'Minimal Risk', color: '#10B981', range: '0 – 19' },
]

const CATEGORY_ROWS = [
  { label: 'Heat', color: '#EF4444' },
  { label: 'Water', color: '#3B82F6' },
  { label: 'Garbage', color: '#10B981' },
  { label: 'Road', color: '#F59E0B' },
  { label: 'Infrastructure', color: '#8B5CF6' },
  { label: 'Environment', color: '#14B8A6' },
]

const STATUS_ROWS = [
  { label: 'Reported', color: '#EF4444' },
  { label: 'Verified', color: '#F59E0B' },
  { label: 'Assigned', color: '#3B82F6' },
  { label: 'In Progress', color: '#8B5CF6' },
  { label: 'Resolved', color: '#10B981' },
]

export default function MapLegend({ severityCounts, reports = [], show = 'severity', className = '' }) {
  return (
    <div className={`rounded-xl border border-line bg-white/95 p-3.5 shadow-raised backdrop-blur ${className}`}>
      {show === 'severity' ? (
        <>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-body">Risk Severity</p>
          <ul className="space-y-1.5">
            {SEVERITY_ROWS.map((row) => (
              <li key={row.key} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="flex-1 text-body">{row.label}</span>
                <span className="text-[10px] text-muted">{row.range}</span>
                <span className="w-6 text-right font-semibold text-ink">{severityCounts?.[row.key] ?? 0}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {show === 'category' ? (
        <>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-body">Categories</p>
          <ul className="space-y-1.5">
            {CATEGORY_ROWS.map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="text-body">{row.label}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {show === 'status' ? (
        <>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-body">Report Status</p>
          <ul className="space-y-1.5">
            {STATUS_ROWS.map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                <span className="flex-1 text-body">{row.label}</span>
                <span className="w-6 text-right font-semibold text-ink">
                  {reports.filter((report) => report.status === row.label.toLowerCase().replace(' ', '_')).length}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
