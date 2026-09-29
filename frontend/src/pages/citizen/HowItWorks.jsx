import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BellRing,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  Send,
  Siren,
  Truck,
  Users,
} from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import { ButtonLink } from '../../components/common/Button.jsx'
import { APP_NAME, BRAND_MESSAGE, REPORT_STATUS_FLOW, REPORT_STATUS_LABELS, STATUS_ACTIONS } from '../../utils/constants.js'
import { ISSUE_CATEGORIES } from '../../utils/constants.js'
import { MOCK_DEPARTMENTS } from '../../mock/users.js'

/**
 * How it works.
 *
 * The public explainer for the reporting lifecycle. Static on purpose: this is
 * product documentation, not operational data, so it must not disappear when an
 * API call fails.
 */

const STEPS = [
  {
    icon: Siren,
    title: 'You report the issue',
    body: 'Pick the issue type, pin the exact location on the map and add a photo or two. A tracking id is issued immediately.',
  },
  {
    icon: ClipboardCheck,
    title: 'An officer verifies it',
    body: 'The verification queue is worked by the city team. They confirm the issue is real, set the true priority and rule out duplicates.',
  },
  {
    icon: Users,
    title: 'It is assigned to a department',
    body: 'Ownership goes to the department responsible for that issue type, with an officer named and a response deadline set from their SLA.',
  },
  {
    icon: Truck,
    title: 'A field team is dispatched',
    body: 'The department moves the report through in-progress and posts notes as work happens, so you can see the effort in real time.',
  },
  {
    icon: CheckCircle2,
    title: 'It is resolved',
    body: 'The team closes the report with an outcome note. Every step stays on the report timeline, visible to you and to the officer.',
  },
]

const AI_POINTS = [
  'Classifies the issue type and detects duplicates of reports already filed nearby.',
  'Scores the risk using heat, water, infrastructure and report load signals for that ward.',
  'Predicts the next seven days of risk with a published confidence band.',
  'Recommends the department and the action most likely to reduce that risk.',
]

export default function HowItWorks() {
  useEffect(() => {
    document.title = 'How It Works · UbranShieldAI'
  }, [])

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen guide"
        title="How It Works"
        subtitle="From a two-minute report to a resolved issue, here is the full path your report takes."
        actions={
          <ButtonLink to="/citizen/report" variant="primary" size="md" icon={Siren}>
            Report an issue
          </ButtonLink>
        }
      />

      {/* Lifecycle rail */}
      <section className="card p-5">
        <h2 className="text-base font-semibold text-ink">The report lifecycle</h2>
        <p className="mt-1 text-[12px] text-muted">Every report follows these stages in order.</p>

        <ol className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
          {REPORT_STATUS_FLOW.map((status, index) => (
            <li key={status} className="flex items-center gap-2">
              <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-[12px] font-semibold text-brand-700">
                {REPORT_STATUS_LABELS[status]}
              </span>
              {index < REPORT_STATUS_FLOW.length - 1 ? (
                <span className="text-muted" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-muted" title="Off the main path">
              Rejected
            </span>
          </li>
        </ol>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(STATUS_ACTIONS)
            .filter(([, action]) => action.next)
            .map(([from, action]) => (
              <div key={from} className="rounded-xl border border-line p-3.5">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  From {REPORT_STATUS_LABELS[from] ?? from}
                </dt>
                <dd className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-ink">
                    {action.label}
                  </span>
                  <span className="text-[11px] text-muted" aria-hidden="true">
                    →
                  </span>
                  <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    {REPORT_STATUS_LABELS[action.next] ?? action.next}
                  </span>
                </dd>
              </div>
            ))}
        </dl>
      </section>

      {/* Steps */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">What actually happens</h2>
        <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li key={step.title} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-[11px] font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <h3 className="mt-3.5 text-[14px] font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-body">{step.body}</p>
              </li>
            )
          })}

          <li className="card flex flex-col justify-between border-dashed p-5">
            <div>
              <h3 className="text-[14px] font-semibold text-ink">And it can be rejected</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-body">
                If an officer cannot verify the issue, or it duplicates an existing report, it is rejected with a
                reason. You see that reason, and you can always submit a fresh report.
              </p>
            </div>
            <p className="mt-4 text-[11px] text-muted">Rejection is a decision, not a dead end.</p>
          </li>
        </ol>
      </section>

      {/* What we cover */}
      <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <MapPin size={16} className="text-brand-600" aria-hidden="true" />
            What you can report
          </h2>
          <p className="mt-1 text-[12px] text-muted">{BRAND_MESSAGE}</p>

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {ISSUE_CATEGORIES.map((category) => {
              const owners = MOCK_DEPARTMENTS.filter((department) => department.categories.includes(category.value))
              return (
                <li key={category.value} className="rounded-xl border border-line p-3.5">
                  <p className="text-[13px] font-semibold text-ink">{category.label}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {owners.length ? `Handled by ${owners.map((department) => department.shortName).join(', ')}.` : 'Reviewed by the city desk.'}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Bot size={16} className="text-violet-600" aria-hidden="true" />
            Where the AI fits in
          </h2>
          <p className="mt-1 text-[12px] text-muted">
            The model assists the officers; it never acts on its own.
          </p>

          <ul className="mt-4 space-y-2.5">
            {AI_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[12px] leading-relaxed text-body">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>

          <p className="mt-4 rounded-xl border border-line bg-slate-50 p-3 text-[11px] leading-relaxed text-body">
            Every AI recommendation is advisory and always shown with its confidence, so a human can weigh it before
            anything is dispatched.
          </p>
        </div>
      </section>

      {/* Notifications */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <BellRing size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-ink">You will know the whole way through</h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-body">
              Every status change on your report raises a notification, and the report timeline shows exactly who did
              what and when.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/citizen/notifications"
            className="text-[12px] font-semibold text-brand-600 hover:underline"
          >
            See the notification centre
          </Link>
          <ButtonLink to="/citizen/report" variant="primary" size="sm" icon={Send}>
            Start a report
          </ButtonLink>
        </div>
      </section>

      <p className="text-center text-[11px] text-muted">
        {APP_NAME} · This guide describes the standard workflow. Emergency services are never routed through this
        platform.
      </p>
    </PageShell>
  )
}
