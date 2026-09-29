import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { ArrowLeft, ShieldCheck, Target, Users, Workflow } from 'lucide-react'
import { ButtonLink } from '../../components/common/Button.jsx'
import { APP_NAME, APP_SUBTITLE, BRAND_MESSAGE, CITY } from '../../utils/constants.js'

/**
 * About page - the "what is this product and who is it for" screen, reachable
 * from the public nav, the footer and the citizen nav.
 */

const PILLARS = [
  {
    icon: Target,
    title: 'Our mission',
    body: `Make every urban risk visible early enough to fix, and accountable enough to verify. ${APP_NAME} exists so that a resident's report and a ward's safety figure are the same number.`,
  },
  {
    icon: Users,
    title: 'Who it serves',
    body: 'Citizens who need a working channel, field officers who need the right case in the right ward, department heads who need workload visibility, and administrators who need the audit trail.',
  },
  {
    icon: Workflow,
    title: 'How it is built',
    body: 'An API-first React platform on a Redux data layer, with a geospatial engine, an AI risk model and a verified workflow from submission to closure.',
  },
]

const STACK = [
  { label: 'Frontend', value: 'React · Vite · Redux Toolkit · React Router' },
  { label: 'Mapping', value: 'Leaflet · OpenStreetMap · GeoJSON ward layers' },
  { label: 'Analytics', value: 'Recharts · Derived aggregations · Prediction series' },
  { label: 'Realtime', value: 'WebSocket transport for live reports and risk alerts' },
  { label: 'Data', value: 'Mock-first API layer, switchable to a live backend' },
  { label: 'Accessibility', value: 'Keyboard navigable, ARIA labelled, responsive to 360px' },
]

export default function About() {
  useEffect(() => {
    document.title = `About · ${APP_NAME}`
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-navy-900">
              <ShieldCheck size={19} aria-hidden="true" />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">{APP_NAME}</span>
          </Link>
          <ButtonLink to="/" variant="ghost" size="sm" icon={ArrowLeft}>
            Back to home
          </ButtonLink>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">About the platform</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{APP_NAME}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-body">{APP_SUBTITLE}</p>
        <p className="mt-6 max-w-2xl border-l-4 border-brand-500 pl-4 text-lg font-semibold text-ink">{BRAND_MESSAGE}</p>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon
            return (
              <article key={pillar.title} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-base font-semibold text-ink">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-body">{pillar.body}</p>
              </article>
            )
          })}
        </div>

        <section className="mt-16">
          <h2 className="text-xl font-bold tracking-tight text-ink">Platform stack</h2>
          <dl className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line">
            {STACK.map((row) => (
              <div key={row.label} className="flex flex-col gap-1 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
                <dd className="text-sm font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-16 rounded-2xl bg-navy-900 p-8 text-center">
          <h2 className="text-xl font-bold text-white">Ready to see it with real data?</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
            Open the citizen view to report an issue, or switch to the officer role to work the verification and
            assignment queues in {CITY.name}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink to="/citizen" variant="primary" size="md">
              Open the platform
            </ButtonLink>
            <ButtonLink
              to="/citizen/how-it-works"
              variant="outlineMuted"
              size="md"
              className="border-white/25 text-white hover:bg-white/10"
            >
              How it works
            </ButtonLink>
          </div>
        </section>
      </main>
    </div>
  )
}
