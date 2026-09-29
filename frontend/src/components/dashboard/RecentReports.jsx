import { Link } from 'react-router-dom'
import { ArrowUpRight, Camera } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import EmptyState from '../common/EmptyState.jsx'
import { Skeleton } from '../common/Skeleton.jsx'
import { REPORT_STATUS_LABELS } from '../../utils/constants.js'
import { formatRelativeTime } from '../../utils/formatDate.js'

/**
 * Compact report feed for the dashboard rail.
 *
 * Data comes from `state.dashboard.recentReports`; the component only decides
 * how a row looks.
 */

const CATEGORY_TONE = {
  heat: 'high',
  water: 'water',
  garbage: 'minimal',
  road: 'medium',
  infrastructure: 'infrastructure',
  environment: 'environment',
  other: 'neutral',
}

const STATUS_TONE = {
  reported: 'danger',
  verified: 'warning',
  assigned: 'info',
  in_progress: 'infrastructure',
  resolved: 'success',
  rejected: 'neutral',
}

export default function RecentReports({ reports = [], loading = false, limit = 6, authority = true, emptyMessage }) {
  if (loading) {
    return (
      <ul className="divide-y divide-line">
        {Array.from({ length: limit }).map((_, index) => (
          <li key={index} className="flex gap-3 px-5 py-3.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (!reports.length) {
    return <EmptyState title="No recent reports" message={emptyMessage ?? 'New citizen reports will appear here as they arrive.'} icon={Camera} />
  }

  return (
    <ul className="divide-y divide-line">
      {reports.slice(0, limit).map((report) => (
        <li key={report.id}>
          <Link
            to={authority ? `/authority/reports/${report.id}` : `/citizen/reports/${report.id}`}
            className="group flex gap-3 px-5 py-3.5 transition hover:bg-slate-50"
          >
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {report.photos?.[0] ? (
                <img src={report.photos[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-muted">
                  <Camera size={16} aria-hidden="true" />
                </span>
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-ink group-hover:text-brand-700">{report.issueLabel}</span>
                <Badge tone={CATEGORY_TONE[report.category] ?? 'neutral'} size="sm">
                  {report.ward}
                </Badge>
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted">
                {report.trackingId} · {formatRelativeTime(report.createdAt)}
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge tone={STATUS_TONE[report.status] ?? 'neutral'} size="sm" dot>
                  {REPORT_STATUS_LABELS[report.status] ?? report.status}
                </Badge>
                <Badge tone={report.priority} size="sm">
                  {report.priority}
                </Badge>
              </span>
            </span>

            <ArrowUpRight
              size={15}
              className="mt-1 shrink-0 text-muted opacity-0 transition group-hover:opacity-100"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
