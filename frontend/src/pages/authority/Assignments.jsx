import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, ClipboardList, MapPin } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ReportFilters from '../../components/reports/ReportFilters.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import { TableSkeleton } from '../../components/common/Skeleton.jsx'
import Badge from '../../components/common/Badge.jsx'
import { PriorityBadge, StatusBadge } from '../../components/reports/ReportStatusBadge.jsx'
import { StatBar } from '../../components/dashboard/StatCard.jsx'
import { useReports } from '../../hooks/useReports.js'
import { MOCK_DEPARTMENTS } from '../../mock/users.js'
import { formatRelativeTime } from '../../utils/formatDate.js'

/**
 * Assignments board.
 *
 * A kanban-style view of every assigned or in-progress case, grouped by
 * department, with the SLA clock on each card and a workload summary above it.
 */
export default function Assignments() {
  const { reports, filters, loading, error, setFilters, clearFilters } = useReports({ limit: 50, auto: true })

  useEffect(() => {
    document.title = 'Assignments · UbranShieldAI'
  }, [])

  useEffect(() => {
    setFilters({ status: 'active' })
    // Set once when the board mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = useMemo(() => reports.filter((report) => ['assigned', 'in_progress'].includes(report.status)), [reports])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const report of active) {
      const key = report.department?.name ?? 'Unassigned'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(report)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [active])

  const maxLoad = Math.max(1, ...MOCK_DEPARTMENTS.map((department) => active.filter((report) => report.department?.id === department.id).length))

  return (
    <PageShell>
      <PageHeader
        eyebrow="Operations"
        title="Assignments"
        subtitle="Every case that has been routed to a department, with the SLA clock running."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700">
            <ClipboardList size={13} aria-hidden="true" />
            {active.length} active
          </span>
        }
      />

      <ReportFilters
        filters={filters}
        onChange={setFilters}
        onClear={clearFilters}
        fields={['search', 'dateRange', 'ward', 'issueCategory', 'priority', 'sort']}
      />

      {/* Workload summary */}
      <Panel title="Department workload" description="Open cases per department right now">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_DEPARTMENTS.map((department) => {
            const load = active.filter((report) => report.department?.id === department.id).length
            return (
              <StatBar
                key={department.id}
                label={department.shortName}
                value={load}
                max={maxLoad}
                trailing={String(load)}
              />
            )
          })}
        </div>
      </Panel>

      {/* Board */}
      {loading && !active.length ? (
        <TableSkeleton rows={5} columns={4} />
      ) : error ? (
        <Panel title="Assignments">
          <p className="py-6 text-center text-sm text-risk-high">{error}</p>
        </Panel>
      ) : !grouped.length ? (
        <EmptyState
          title="No active assignments"
          message="Once a verified report is assigned to a department it appears here with its SLA clock."
          icon={ClipboardList}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {grouped.map(([departmentName, items]) => {
            const breaching = items.filter((report) => new Date(report.dueDate) < new Date()).length
            return (
              <section key={departmentName} className="card flex flex-col">
                <header className="flex items-center justify-between gap-2 border-b border-line px-5 py-3.5">
                  <h2 className="truncate text-sm font-semibold text-ink">{departmentName}</h2>
                  <div className="flex items-center gap-1.5">
                    {breaching ? (
                      <Badge tone="danger" size="sm" icon={CalendarClock}>
                        {breaching} overdue
                      </Badge>
                    ) : null}
                    <Badge tone="info" size="sm">
                      {items.length}
                    </Badge>
                  </div>
                </header>

                <ul className="scroll-area max-h-[420px] flex-1 divide-y divide-line overflow-y-auto">
                  {items.map((report) => {
                    const overdue = new Date(report.dueDate) < new Date()
                    return (
                      <li key={report.id}>
                        <Link to={`/authority/reports/${report.id}`} className="block px-5 py-3.5 transition hover:bg-slate-50">
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{report.issueLabel}</p>
                            <StatusBadge status={report.status} />
                          </div>

                          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
                            <MapPin size={10} aria-hidden="true" />
                            {report.ward} · {report.trackingId}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <PriorityBadge priority={report.priority} />
                            <span className={`text-[10px] ${overdue ? 'font-semibold text-risk-high' : 'text-muted'}`}>
                              due {formatRelativeTime(report.dueDate)}
                            </span>
                            {report.assignee ? <span className="text-[10px] text-muted">· {report.assignee.name}</span> : null}
                          </div>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-muted">Refreshing automatically when a report is assigned or resolved.</p>
    </PageShell>
  )
}
