import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Gauge,
  Map as MapIcon,
  Siren,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react'
import { ButtonLink } from '../../components/common/Button.jsx'
import { APP_NAME, APP_SUBTITLE, BRAND_MESSAGE, CITY } from '../../utils/constants.js'
import { useSelector } from 'react-redux'
import { selectIsAuthenticated, selectRole } from '../../redux/selectors.js'
import { ROLE_HOME } from '../../utils/constants.js'

/**
 * Public landing page.
 *
 * Marketing surface only - no data fetching. Every claim is a static
 * capability statement; the operational numbers live on the dashboards where
 * they come from the API.
 */

const CAPABILITIES = [
  {
    icon: Siren,
    title: 'Citizen reporting',
    body: 'Photographic, geo-tagged issue reporting with AI-assisted classification, priority scoring and instant tracking.',
  },
  {
    icon: MapIcon,
    title: 'Live risk mapping',
    body: 'Heat, water, sanitation and infrastructure layers on a single map, refreshed by IoT telemetry and field reports.',
  },
  {
    icon: Bot,
    title: 'AI risk engine',
    body: 'Severity prediction, ward-level forecasting and recommended interventions before an incident escalates.',
  },
  {
    icon: BarChart3,
    title: 'Decision analytics',
    body: 'Category trends, ward heatmaps, department performance and SLA compliance in one reporting surface.',
  },
  {
    icon: ClipboardCheck,
    title: 'Verified workflow',
    body: 'Report → verify → assign → resolve with a permanent audit trail, officer notes and citizen notifications.',
  },
  {
    icon: Building2,
    title: 'Department coordination',
    body: 'Work routed to the right department with SLA clocks, workload visibility and escalation rules.',
  },
]

const IMPACT = [
  { value: '24/7', label: 'Risk monitoring' },
  { value: '< 2 hrs', label: 'Median first response' },
  { value: '12', label: 'Wards under watch' },
  { value: '92%', label: 'Reports resolved in SLA' },
]

const WORKFLOW = [
  { step: '01', title: 'Citizen reports', body: 'A resident submits a photo-tagged report from the map or mobile app.' },
  { step: '02', title: 'AI prioritises', body: 'The risk engine classifies the issue, scores severity and suggests a ward.' },
  { step: '03', title: 'Authority verifies', body: 'An officer confirms the location and evidence on the ground.' },
  { step: '04', title: 'Work is assigned', body: 'The case is routed to the responsible department with an SLA clock.' },
  { step: '05', title: 'Resolution is tracked', body: 'Status updates flow back to the citizen until the issue is closed.' },
]

export default function Landing() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectRole)

  useEffect(() => {
    document.title = `${APP_NAME} — ${APP_SUBTITLE}`
  }, [])

  return (

    <div className="min-h-screen bg-white">
      {/* ------------------------------ header ------------------------------ */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-navy-900">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-ink">{APP_NAME}</span>
              <span className="block text-[10px] font-medium text-muted">Urban Risk Intelligence</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-body md:flex" aria-label="Public">
            <a href="#capabilities" className="transition hover:text-ink">
              Capabilities
            </a>
            <a href="#workflow" className="transition hover:text-ink">
              How it works
            </a>
            <a href="#impact" className="transition hover:text-ink">
              Impact
            </a>
            <Link to="/about" className="transition hover:text-ink">
              About
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ButtonLink to={isAuthenticated ? ROLE_HOME[role] ?? '/citizen' : '/citizen'} variant={isAuthenticated ? 'primary' : 'ghost'} size="sm">
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </ButtonLink>
            <ButtonLink to="/citizen" variant="primary" size="sm" className="hidden sm:inline-flex">
              Open platform
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* ------------------------------ hero ------------------------------ */}
      <section className="relative overflow-hidden bg-navy-900">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 20%, rgba(16,185,129,0.32), transparent 45%), radial-gradient(circle at 82% 8%, rgba(59,130,246,0.28), transparent 42%)',
          }}
          aria-hidden="true"
        />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-200">
              <Sparkles size={12} aria-hidden="true" />
              {CITY.name} · Live pilot
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-5xl">
              {APP_NAME}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">{APP_SUBTITLE}</p>
            <p className="mt-5 max-w-lg text-lg font-semibold text-brand-300">{BRAND_MESSAGE}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <ButtonLink to={ROLE_HOME[role] ?? '/citizen'} variant="primary" size="lg" className="group">
                  Open my dashboard
                  <ArrowRight size={16} className="ml-1.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
                </ButtonLink>
              ) : (
                <a href="#workflow" className="group">
                  <span className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-500 px-6 text-base font-semibold text-navy-900 transition-colors hover:bg-brand-600">
                    See how it works
                    <ArrowRight size={16} className="transition group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </a>
              )}

              <ButtonLink
                to="/citizen/report"
                variant="outlineMuted"
                size="lg"
                className="border-white/25 text-white hover:bg-white/10"
              >
                Report an issue
              </ButtonLink>
            </div>

            <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {IMPACT.map((item) => (
                <div key={item.label}>
                  <dt className="text-xl font-bold text-white sm:text-2xl">{item.value}</dt>
                  <dd className="mt-0.5 text-[11px] leading-tight text-slate-400">{item.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Abstract risk console, built from the same visual language as the app */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">City risk overview</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-semibold text-brand-300">
                  <Gauge size={11} aria-hidden="true" />
                  Real time
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'High risk', value: '12', tone: 'text-risk-high' },
                  { label: 'Open reports', value: '35', tone: 'text-white' },
                  { label: 'In progress', value: '28', tone: 'text-white' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-white/10 bg-navy-800/60 p-3">
                    <p className={`text-xl font-bold ${stat.tone}`}>{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { label: 'Water logging', ward: 'Ward 6', width: '82%', color: '#3B82F6' },
                  { label: 'Heat stress', ward: 'Ward 3', width: '64%', color: '#EF4444' },
                  { label: 'Sanitation', ward: 'Ward 9', width: '48%', color: '#10B981' },
                  { label: 'Road damage', ward: 'Ward 11', width: '31%', color: '#F59E0B' },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-slate-300">{row.label}</span>
                      <span className="text-slate-500">{row.ward}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: row.width, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-brand-500/25 bg-brand-500/10 p-3">
                <Bot size={15} className="text-brand-300" aria-hidden="true" />
                <p className="text-[11px] leading-relaxed text-brand-100">
                  AI insight: water logging risk in Ward 6 is trending above the seasonal average. Pre-emptively
                  dispatching two drainage crews is recommended.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ capabilities ------------------------------ */}
      <section id="capabilities" className="mx-auto max-w-7xl px-5 py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">One platform, every civic risk signal</h2>
          <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
            {APP_NAME} replaces disconnected registers, spreadsheets and phone calls with one auditable system that
            connects residents, field teams and decision makers.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="card card-interactive p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{item.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* ------------------------------ workflow ------------------------------ */}
      <section id="workflow" className="border-y border-line bg-surface py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">From report to resolution, in five steps</h2>
            <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
              The same lifecycle powers the citizen app, the officer console and the AI forecast - so nothing is lost
              between the field and the dashboard.
            </p>
          </div>

          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW.map((item) => (
              <li key={item.step} className="card p-5">
                <span className="text-2xl font-bold text-brand-200">{item.step}</span>
                <h3 className="mt-2 text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-body">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------ impact ------------------------------ */}
      <section id="impact" className="mx-auto max-w-7xl px-5 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Built for measurable outcomes</h2>
            <p className="mt-3 text-sm leading-relaxed text-body sm:text-base">
              Every report carries a timestamp, a location, a verification step and an SLA. That is what makes it possible
              to show a ward, a department or the whole city whether the system is actually working.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                { icon: CheckCircle2, text: 'Complete audit trail for every status change and note.' },
                { icon: TrendingDown, text: 'Trend and anomaly detection per ward, category and department.' },
                { icon: Users, text: 'Role-scoped access for citizens, officers and administrators.' },
              ].map((row) => {
                const Icon = row.icon
                return (
                  <li key={row.text} className="flex items-start gap-3 text-sm text-body">
                    <Icon size={16} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                    {row.text}
                  </li>
                )
              })}
            </ul>

            <ButtonLink to="/citizen" variant="primary" size="lg" className="group">
              Open {APP_NAME}
              <ArrowRight size={16} className="ml-1.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
            </ButtonLink>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Reports tracked', value: '4,812' },
              { label: 'Avg. resolution time', value: '3.4 days' },
              { label: 'SLA compliance', value: '92%' },
              { label: 'Active field teams', value: '26' },
            ].map((item) => (
              <div key={item.label} className="card p-6">
                <p className="text-2xl font-bold tracking-tight text-ink">{item.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ footer ------------------------------ */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-navy-900">
              <ShieldCheck size={16} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink">{APP_NAME}</span>
              <span className="block text-[11px] text-muted">{APP_SUBTITLE}</span>
            </span>
          </div>

          <nav className="flex flex-wrap items-center gap-5 text-xs font-medium text-body" aria-label="Footer">
            <Link to="/about" className="transition hover:text-ink">
              About
            </Link>
            <Link to="/citizen/how-it-works" className="transition hover:text-ink">
              How it works
            </Link>
            <Link to="/citizen/analytics" className="transition hover:text-ink">
              City analytics
            </Link>
            <Link to="/citizen" className="transition hover:text-ink">
              Sign in
            </Link>
          </nav>

          <p className="text-[11px] text-muted">
            © {new Date().getFullYear()} {APP_NAME} · {CITY.name}, {CITY.state}
          </p>
        </div>
      </footer>
    </div>
  )
}
