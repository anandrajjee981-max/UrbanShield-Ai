import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CheckSquare,
  ClipboardList,
  FileText,
  Flame,
  Sparkles,
  Thermometer,
  Timer,
  Waves,
} from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import DashboardMap from '../../components/dashboard/DashboardMap.jsx'
import RecentReports from '../../components/dashboard/RecentReports.jsx'
import FilterBar from '../../components/common/FilterBar.jsx'
import { ButtonLink } from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { StatCardSkeleton } from '../../components/common/Skeleton.jsx'
import { DonutChart, ReportsTrendChart, WardRiskChart } from '../../components/analytics/Charts.jsx'
import { AiInsightList } from '../../components/ai/AiInsightCard.jsx'
import { loadDashboard } from '../../redux/slices/dashboardSlice.js'
import {
  selectDashboardError,
  selectDashboardKpis,
  selectDashboardLoading,
  selectIssueTrends,
  selectRecentReports,
  selectReportsByStatus,
  selectTopIssueTypes,
} from '../../redux/slices/dashboardSlice.js'
import { selectApiFilters, selectCurrentUser } from '../../redux/selectors.js'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { ROLE_LABELS } from '../../utils/constants.js'

/**
 * Authority dashboard.
 *
 * Assembles the platform's KPI row, the live map, the report queue, the status
 * split and the AI insight rail. Every value comes from the dashboard and
 * analytics bundles - nothing here is a literal.
 */

const KPI_ICONS = {
  highRiskZones: Flame,
  mediumRiskZones: Thermometer,
  lowRiskZones: Waves,
  totalReports: FileText,
  pendingVerification: CheckSquare,
  activeDepartments: Building2,
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const filters = useSelector(selectApiFilters)
  const user = useSelector(selectCurrentUser)

  const kpis = useSelector(selectDashboardKpis)
  const loading = useSelector(selectDashboardLoading)
  const error = useSelector(selectDashboardError)
  const recentReports = useSelector(selectRecentReports)
  const byStatus = useSelector(selectReportsByStatus)
  const topIssues = useSelector(selectTopIssueTypes)
  const issueTrends = useSelector(selectIssueTrends)

  const analytics = useAnalytics()
  const insights = useMemo(() => analytics.insights.slice(0, 3), [analytics.insights])

  useEffect(() => {
    dispatch(loadDashboard(filters))
  }, [dispatch, filters])

  if (error) {
    return (
      <PageShell>
        <PageHeader title="Dashboard" subtitle="Live operational picture for the city." />
        <ErrorState title="Dashboard unavailable" message={error} onRetry={() => dispatch(loadDashboard(filters))} />
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={ROLE_LABELS[user?.role] ?? 'Authority'}
        title={`Good to see you, ${user?.name?.split(' ')[0] ?? 'Officer'}`}
        subtitle="Here is the live risk and incident picture across the city right now."
        actions={
          <>
            <ButtonLink to="/authority/analytics" variant="secondary" size="sm" icon={BarChart3}>
              Full analytics
            </ButtonLink>
            <ButtonLink to="/authority/reports" variant="primary" size="sm" icon={FileText}>
              View all reports
            </ButtonLink>
          </>
        }
      />

      <FilterBar className="card px-4 py-3" />

      {/* KPI row */}
      <section aria-label="Key metrics">
        {loading && !kpis.some((card) => card.value) ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((card) => (
              <StatCard
                key={card.key}
                label={card.label}
                value={card.value}
                trend={card.trend}
                isUp={card.isUp}
                tone={card.tone}
                icon={KPI_ICONS[card.key] ?? FileText}
                footer={card.key === 'totalReports' ? 'selected window' : 'vs previous'}
              />
            ))}
          </div>
        )}
      </section>

      {/* Map + queue */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="card overflow-hidden">
          <DashboardMap />
        </div>

        <Panel
          title="Recent Reports"
          description="Latest citizen submissions across all wards"
          actions={
            <Link to="/authority/reports" className="text-[11px] font-semibold text-brand-600 hover:underline">
              See all
            </Link>
          }
          bodyClassName=""
        >
          <RecentReports reports={recentReports} loading={loading} limit={6} />
        </Panel>
      </section>

      {/* Charts */}
      <section className="grid gap-5 lg:grid-cols-2">
        <DonutChart
          data={byStatus}
          loading={loading}
          title="Incidents by Status"
          description="Lifecycle split of reports in the selected window"
          centerLabel="Incidents"
        />

        <ReportsTrendChart data={issueTrends} loading={loading} />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <WardRiskChart data={analytics.wardRisk} loading={analytics.loading} />

        <div className="space-y-5">
          <Panel title="Top Issue Types" description="Ranked by volume" bodyClassName="px-5 pb-5">
            <ul className="space-y-2.5">
              {topIssues.slice(0, 5).map((issue) => (
                <li key={issue.name} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: issue.fill }} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-body">{issue.name}</span>
                  <span className="text-[13px] font-semibold text-ink">{issue.value}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="AI Insights"
            description="Generated from the current risk signals"
            actions={
              <Link to="/authority/ai" className="text-[11px] font-semibold text-brand-600 hover:underline">
                Assistant
              </Link>
            }
            bodyClassName="px-4 pb-4"
          >
            <AiInsightList insights={insights} />
          </Panel>
        </div>
      </section>

      {/* Queues */}
      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            to: '/authority/verification',
            icon: CheckSquare,
            title: 'Verification queue',
            body: 'Confirm location and evidence before a report is assigned.',
            tone: 'warning',
          },
          {
            to: '/authority/assignments',
            icon: ClipboardList,
            title: 'Active assignments',
            body: 'Track every case that is assigned or in progress.',
            tone: 'info',
          },
          {
            to: '/authority/ai',
            icon: Sparkles,
            title: 'AI assistant',
            body: 'Ask about wards, categories and what to prioritise next.',
            tone: 'ai',
          },
        ].map((queue) => {
          const Icon = queue.icon
          return (
            <Link key={queue.to} to={queue.to} className="card card-interactive group flex items-start gap-3.5 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-body transition group-hover:bg-brand-50 group-hover:text-brand-600">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{queue.title}</span>
                  <Badge tone={queue.tone} size="sm">
                    Open
                  </Badge>
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-body">{queue.body}</span>
              </span>
              <ArrowUpRight size={15} className="mt-1 shrink-0 text-muted transition group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          )
        })}
      </section>

      <p className="flex items-center gap-1.5 text-[11px] text-muted">
        <Timer size={12} aria-hidden="true" />
        {analytics.overview?.totalReports
          ? `${analytics.overview.totalReports} reports in the selected window · refreshes on every filter change and realtime event`
          : 'Data refreshes on every filter change and on realtime events'}
      </p>
    </PageShell>
  )
}
