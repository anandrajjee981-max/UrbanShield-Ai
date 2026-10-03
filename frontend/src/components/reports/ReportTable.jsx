import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, MapPin, MoreHorizontal } from 'lucide-react'
import { StatusBadge, PriorityBadge } from './ReportStatusBadge.jsx'
import Badge from '../common/Badge.jsx'
import EmptyState from '../common/EmptyState.jsx'
import { TableSkeleton } from '../common/Skeleton.jsx'
import { formatRelativeTime } from '../../utils/formatDate.js'
import { useState } from 'react'

/**
 * Report table.
 *
 * Responsive by construction: a real `<table>` from `md` up, and stacked
 * cards on phones so a 360px screen never gets a horizontal scrollbar.
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

export default function ReportTable({
  reports = [],
  loading = false,
  error = null,
  onRetry,
  pagination,
  onPageChange,
  authority = true,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  emptyTitle = 'No reports found',
  emptyMessage = 'Adjust your filters or try a different date range.',
  columns = ['report', 'issue', 'ward', 'status', 'priority', 'department', 'updated', 'actions'],
  onDelete,
}) {
  const [openMenu, setOpenMenu] = useState(null)

  if (loading && !reports.length) return <TableSkeleton rows={6} columns={columns.length} />

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm font-semibold text-risk-high">{error}</p>
        {onRetry ? (
          <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold text-brand-600 hover:underline">
            Retry
          </button>
        ) : null}
      </div>
    )
  }

  if (!reports.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} icon={MapPin} />
  }

  const basePath = authority ? '/authority/reports' : '/citizen/reports'
  const allSelected = reports.length > 0 && reports.every((report) => selectedIds.includes(report.id))

  return (
    <div className="card overflow-hidden">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-muted">
              {selectable ? (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onToggleAll?.(reports.map((report) => report.id))}
                    aria-label="Select all reports"
                    className="h-3.5 w-3.5 rounded border-line text-brand-500 focus:ring-brand-300"
                  />
                </th>
              ) : null}

              {columns.includes('report') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Report
                </th>
              ) : null}
              {columns.includes('issue') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Issue type
                </th>
              ) : null}
              {columns.includes('ward') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Ward
                </th>
              ) : null}
              {columns.includes('status') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Status
                </th>
              ) : null}
              {columns.includes('priority') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Priority
                </th>
              ) : null}
              {columns.includes('department') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Department
                </th>
              ) : null}
              {columns.includes('updated') ? (
                <th scope="col" className="px-4 py-3 font-bold">
                  Updated
                </th>
              ) : null}
              {columns.includes('actions') ? (
                <th scope="col" className="px-4 py-3 text-right font-bold">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {reports.map((report) => (
              <tr key={report.id} className="group transition hover:bg-slate-50">
                {selectable ? (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(report.id)}
                      onChange={() => onToggleSelect?.(report.id)}
                      aria-label={`Select ${report.trackingId}`}
                      className="h-3.5 w-3.5 rounded border-line text-brand-500 focus:ring-brand-300"
                    />
                  </td>
                ) : null}

                {columns.includes('report') ? (
                  <td className="px-4 py-3">
                    <Link to={`${basePath}/${report.id}`} className="block">
                      <span className="block text-[13px] font-semibold text-ink group-hover:text-brand-700">{report.trackingId}</span>
                      <span className="mt-0.5 block max-w-[240px] truncate text-[11px] text-muted">{report.title}</span>
                    </Link>
                  </td>
                ) : null}

                {columns.includes('issue') ? (
                  <td className="px-4 py-3">
                    <Badge tone={CATEGORY_TONE[report.category] ?? 'neutral'} size="sm">
                      {report.issueLabel}
                    </Badge>
                  </td>
                ) : null}

                {columns.includes('ward') ? <td className="px-4 py-3 text-[13px] text-body">{report.ward}</td> : null}
                {columns.includes('status') ? (
                  <td className="px-4 py-3">
                    <StatusBadge status={report.status} />
                  </td>
                ) : null}
                {columns.includes('priority') ? (
                  <td className="px-4 py-3">
                    <PriorityBadge priority={report.priority} />
                  </td>
                ) : null}
                {columns.includes('department') ? (
                  <td className="px-4 py-3 text-[13px] text-body">{report.department?.shortName ?? '—'}</td>
                ) : null}
                {columns.includes('updated') ? (
                  <td className="whitespace-nowrap px-4 py-3 text-[12px] text-muted">{formatRelativeTime(report.updatedAt)}</td>
                ) : null}
                {columns.includes('actions') ? (
                  <td className="relative px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === report.id ? null : report.id)}
                      aria-label={`Actions for ${report.trackingId}`}
                      aria-expanded={openMenu === report.id}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-slate-100 hover:text-ink"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenu === report.id ? (
                      <div className="absolute right-4 z-30 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 text-left shadow-raised">
                        <Link to={`${basePath}/${report.id}`} className="block px-3.5 py-2 text-xs text-body transition hover:bg-slate-50">
                          View details
                        </Link>
                        <Link
                          to={`${authority ? '/authority' : '/citizen'}/map?focus=${report.id}`}
                          className="block px-3.5 py-2 text-xs text-body transition hover:bg-slate-50"
                        >
                          Show on map
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(report.trackingId)
                            setOpenMenu(null)
                          }}
                          className="block w-full px-3.5 py-2 text-left text-xs text-body transition hover:bg-slate-50"
                        >
                          Copy tracking ID
                        </button>
                        {authority && (
                          <button
                            type="button"
                            onClick={() => onDelete?.(report.id)}
                            className="block w-full px-3.5 py-2 text-left text-xs text-red-600 font-medium transition hover:bg-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {reports.map((report) => (
          <li key={report.id}>
            <Link to={`${basePath}/${report.id}`} className="block px-4 py-3.5 transition hover:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{report.issueLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {report.trackingId} · {report.ward}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <PriorityBadge priority={report.priority} />
                {report.department ? <Badge tone="neutral" size="sm">{report.department.shortName}</Badge> : null}
                <span className="text-[10px] text-muted">{formatRelativeTime(report.updatedAt)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Pagination */}
      {pagination && pagination.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[11px] text-muted">
            Showing <span className="font-semibold text-ink">{pagination.from}</span>–
            <span className="font-semibold text-ink">{pagination.to}</span> of{' '}
            <span className="font-semibold text-ink">{pagination.total}</span>
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Previous page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-2 text-xs font-semibold text-ink">
              {pagination.page} / {pagination.pageCount}
            </span>
            <button
              type="button"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pageCount}
              aria-label="Next page"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}