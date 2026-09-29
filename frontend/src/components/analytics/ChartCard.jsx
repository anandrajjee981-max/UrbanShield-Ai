import { ChartSkeleton } from '../common/Skeleton.jsx'

/**
 * Recharts frame.
 *
 * Owns the shared tooltip and the panel chrome so every chart in the product is
 * visually identical and only the data differs. Axis and grid tokens live in
 * `chartTheme.js`.
 */

export function ChartTooltip({ active, payload, label, unit = '', formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 shadow-pop">
      {label ? <p className="mb-1 text-[11px] font-semibold text-ink">{label}</p> : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li key={entry.dataKey ?? entry.name} className="flex items-center gap-2 text-[11px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color ?? entry.fill }} aria-hidden="true" />
            <span className="text-body">{entry.name}</span>
            <span className="ml-auto font-semibold text-ink">
              {formatter ? formatter(entry.value, entry) : `${entry.value}${unit}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Panel with a title, an optional legend and a loading skeleton. */
export default function ChartCard({ title, description, actions, legend, loading, height = 260, children, className = '' }) {
  if (loading) return <ChartSkeleton height={height} />

  return (
    <section className={`card flex flex-col ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-body">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      {legend?.length ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 pt-3.5">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5 text-[11px] text-body">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex-1 px-2 pb-3 pt-4" style={{ minHeight: height }}>
        {children}
      </div>
    </section>
  )
}
