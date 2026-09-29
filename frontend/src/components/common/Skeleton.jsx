/**
 * Skeleton primitives.
 *
 * Every API-driven surface has a matching skeleton so a slow request never
 * collapses the layout or shows a bare spinner in the middle of the page.
 */

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />
}

/** A stat tile with the same anatomy as `dashboard/StatCard`. */
export function StatCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 220 }) {
  return (
    <div className="card p-5">
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 space-y-3" style={{ height }}>
        {[70, 45, 60, 30, 55, 40].map((width, index) => (
          <Skeleton key={index} className="h-6" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-slate-50 px-5 py-3">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((__, columnIndex) => (
              <Skeleton key={columnIndex} className="h-3.5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardGridSkeleton({ count = 6, className = '' }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card space-y-3 p-5">
          <Skeleton className="h-36 w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}

export function MapSkeleton({ className = '' }) {
  return (
    <div className={`card relative overflow-hidden ${className}`} aria-hidden="true">
      <div className="skeleton h-full min-h-[320px] w-full rounded-none" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-xl bg-white/90 px-4 py-3 text-center shadow-raised">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <p className="mt-2 text-xs text-body">Loading live layers…</p>
        </div>
      </div>
    </div>
  )
}

export function InsightsSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-4 w-4/5" />
          <Skeleton className="mt-2 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
