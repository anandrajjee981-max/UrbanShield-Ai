import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, Flame, ListChecks, MapPin, MessageSquare, Siren, Sparkles, TrendingDown, Waves } from 'lucide-react'
import PageShell, { Panel } from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/dashboard/StatCard.jsx'
import RecentReports from '../../components/dashboard/RecentReports.jsx'
import { ButtonLink } from '../../components/common/Button.jsx'
import Badge from '../../components/common/Badge.jsx'
import { AiInsightList } from '../../components/ai/AiInsightCard.jsx'
import { DonutChart, ReportsTrendChart } from '../../components/analytics/Charts.jsx'
import DashboardMap from '../../components/dashboard/DashboardMap.jsx'
import { useReports } from '../../hooks/useReports.js'
import { useAnalytics } from '../../hooks/useAnalytics.js'
import { useMapData } from '../../hooks/useMapData.js'
import { selectCurrentUser } from '../../redux/selectors.js'
import { selectUnreadNotifications } from '../../redux/slices/notificationSlice.js'
import { CITY } from '../../utils/constants.js'
import { formatRelativeTime } from '../../utils/formatDate.js'

/**
 * Citizen home.
 *
 * A resident's view of the city and of their own cases: what is happening near
 * them, what they have reported and what needs their attention.
 */
export default function Home() {
  const user = useSelector(selectCurrentUser)
  const unread = useSelector(selectUnreadNotifications)

  const { reports, loading } = useReports({ scope: 'mine', limit: 5 })
  const analytics = useAnalytics()
  const map = useMapData()

  useEffect(() => {
    document.title = `Home · UbranShieldAI`
  }, [])

  const open = reports.filter((report) => report.status !== 'resolved')
  const resolved = reports.filter((report) => report.status === 'resolved')
  const highRiskZones = map.riskZones.filter((zone) => zone.score >= 70)

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${CITY.name} · ${CITY.state}`}
        title={`Hello, ${user?.name?.split(' ')[0] ?? 'neighbour'}`}
        subtitle="Here is what is happening in your city, and where your own reports stand."
        actions={
          <ButtonLink to="/citizen/live-report" variant="primary" size="md" icon={Siren}>
            Live report
          </ButtonLink>
        }
      />

      {/* Personal summary */}
      <section aria-label="Your reports" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My reports" value={reports.length} icon={ListChecks} tone="info" footer="all time" />
        <StatCard label="Open" value={open.length} icon={Bell} tone="warning" footer="awaiting action" />
        <StatCard label="Resolved" value={resolved.length} icon={TrendingDown} tone="success" footer="closed" />
        <StatCard
          label="Unread alerts"
          value={unread.length}
          icon={MessageSquare}
          tone="medium"
          footer="in your area"
        />
      </section>

      {/* City picture */}
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="card overflow-hidden">
          <DashboardMap
            height="h-[360px]"
            title="Live risk map"
            mapPath="/citizen/map"
            authority={false}
          />
        </div>

        <Panel title="What the model is seeing" description="City wide signals" bodyClassName="px-4 pb-4">
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <Flame size={12} className="text-risk-heat" aria-hidden="true" />
                High risk zones
              </p>
              <p className="mt-1.5 text-xl font-bold text-ink">{highRiskZones.length}</p>
            </div>
            <div className="rounded-xl border border-line p-3.5">
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <Waves size={12} className="text-risk-water" aria-hidden="true" />
                Active reports
              </p>
              <p className="mt-1.5 text-xl font-bold text-ink">{map.reports.length}</p>
            </div>
          </div>

          <AiInsightList insights={analytics.insights.slice(0, 2)} />
        </Panel>
      </section>

      {/* My reports */}
      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Panel
          title="My reports"
          description="Everything you have submitted"
          actions={
            <Link to="/citizen/reports" className="text-[11px] font-semibold text-brand-600 hover:underline">
              See all
            </Link>
          }
          bodyClassName=""
        >
          <RecentReports
            reports={reports}
            loading={loading}
            limit={5}
            authority={false}
            emptyMessage="You have not reported anything yet. Use the button above to submit your first report."
          />
        </Panel>

        <div className="space-y-5">
          <DonutChart
            data={analytics.byStatus}
            loading={analytics.loading}
            title="City issue mix"
            description="What residents are reporting"
            centerLabel="Reports"
          />
          <ReportsTrendChart data={analytics.reportsTrend} loading={analytics.loading} />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { to: '/citizen/report', icon: Siren, title: 'Report an issue', body: 'Photos, location and a description take two minutes.' },
          { to: '/citizen/map', icon: MapPin, title: 'Explore the map', body: 'See what is happening in any ward.' },
          { to: '/citizen/analytics', icon: Sparkles, title: 'City analytics', body: 'Trends, forecasts and AI predictions.' },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.to} to={action.to} className="card card-interactive group flex items-start gap-3.5 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">{action.title}</span>
                <span className="mt-1 block text-[12px] leading-relaxed text-body">{action.body}</span>
              </span>
              <ArrowRight size={15} className="mt-1 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
            </Link>
          )
        })}
      </section>

      {/* Recent alerts */}
      {unread.length ? (
        <Panel
          title="Latest alerts"
          description="Updates in your area"
          actions={
            <Link to="/citizen/notifications" className="text-[11px] font-semibold text-brand-600 hover:underline">
              All notifications
            </Link>
          }
          bodyClassName="p-5 pt-0"
        >
          <ul className="space-y-2.5">
            {unread.slice(0, 3).map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
                <Badge tone={item.severity ?? 'info'} size="sm" dot>
                  {item.severity ?? 'info'}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-body">{item.body}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted">{formatRelativeTime(item.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </PageShell>
  )
}
