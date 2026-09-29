import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Building2, CheckCircle2, Clock, MapPin, Phone, Users } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Badge from '../../components/common/Badge.jsx'
import { StatBar } from '../../components/dashboard/StatCard.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { CardGridSkeleton } from '../../components/common/Skeleton.jsx'
import {
  loadDepartments,
  selectDepartments,
  selectDepartmentsLoading,
  selectDashboardError,
} from '../../redux/slices/dashboardSlice.js'

/**
 * Departments.
 *
 * Reference data for the whole platform - who owns which category, their SLA,
 * their current load and their contact details.
 */
export default function Departments() {
  const dispatch = useDispatch()
  const departments = useSelector(selectDepartments)
  const loading = useSelector(selectDepartmentsLoading)
  const error = useSelector(selectDashboardError)

  useEffect(() => {
    document.title = 'Departments · UbranShieldAI'
    dispatch(loadDepartments())
  }, [dispatch])

  const maxLoad = Math.max(1, ...departments.map((department) => department.activeTasks))

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Departments" subtitle="Who owns which category, and how they are performing." />
        <ErrorState title="Departments unavailable" message={error} onRetry={() => dispatch(loadDepartments())} />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Directory"
        title="Departments"
        subtitle="Ownership, response windows and current workload for every team that can receive an assignment."
      />

      {loading && !departments.length ? (
        <CardGridSkeleton count={6} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <article key={department.id} className="card card-interactive flex flex-col p-5">
              <header className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Building2 size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-ink">{department.name}</h2>
                    <p className="mt-0.5 truncate text-[11px] text-muted">{department.shortName}</p>
                  </div>
                </div>
                <Badge tone={department.activeTasks > 5 ? 'warning' : 'success'} size="sm">
                  {department.activeTasks} active
                </Badge>
              </header>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {department.categories.map((category) => (
                  <li key={category}>
                    <Badge tone="neutral" size="sm" className="normal-case">
                      {category}
                    </Badge>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-2 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted">
                    <Clock size={12} aria-hidden="true" />
                    Response SLA
                  </dt>
                  <dd className="font-semibold text-ink">{department.responseSlaHours}h</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted">
                    <CheckCircle2 size={12} aria-hidden="true" />
                    Completion rate
                  </dt>
                  <dd className="font-semibold text-ink">{department.completionRate}%</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted">
                    <MapPin size={12} aria-hidden="true" />
                    Location
                  </dt>
                  <dd className="truncate font-semibold text-ink">{department.ward}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="flex items-center gap-1.5 text-muted">
                    <Phone size={12} aria-hidden="true" />
                    Control room
                  </dt>
                  <dd className="font-semibold text-ink">{department.phone}</dd>
                </div>
              </dl>

              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <StatBar label="Active tasks" value={department.activeTasks} max={maxLoad} />
                <StatBar
                  label="Resolved this month"
                  value={department.resolvedThisMonth}
                  max={Math.max(1, maxLoad)}
                  color="#10B981"
                />
              </div>

              <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                <Users size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
                Head: {department.head}
              </p>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  )
}
