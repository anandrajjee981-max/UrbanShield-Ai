import { Check, Circle, Clock } from 'lucide-react'
import { REPORT_STATUS_FLOW, REPORT_STATUS_LABELS } from '../../utils/constants.js'
import { formatDateTime, formatRelativeTime } from '../../utils/formatDate.js'

/**
 * Report lifecycle timeline.
 *
 * Renders the full five-step flow from `REPORT_STATUS_FLOW` and marks which
 * steps this particular report has actually reached, so a reader can see both
 * where it is and how much is left.
 */

const STEP_TONE = {
  reported: 'bg-red-50 text-risk-high',
  verified: 'bg-amber-50 text-risk-medium',
  assigned: 'bg-blue-50 text-blue-600',
  in_progress: 'bg-violet-50 text-violet-600',
  resolved: 'bg-brand-50 text-brand-600',
}

export default function ReportTimeline({ timeline = [], status }) {
  const reached = new Map(timeline.map((entry) => [entry.status, entry]))
  const currentIndex = REPORT_STATUS_FLOW.indexOf(status)
  const isRejected = status === 'rejected'

  return (
    <div>
      <ol className="relative space-y-0">
        {REPORT_STATUS_FLOW.map((step, index) => {
          const entry = reached.get(step)
          const done = Boolean(entry)
          const active = index === currentIndex && !isRejected
          const isLast = index === REPORT_STATUS_FLOW.length - 1

          return (
            <li key={step} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Connector */}
              {!isLast ? (
                <span
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${done && reached.has(REPORT_STATUS_FLOW[index + 1]) ? 'bg-brand-300' : 'bg-slate-200'}`}
                  aria-hidden="true"
                />
              ) : null}

              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  done ? STEP_TONE[step] : 'bg-slate-100 text-slate-300'
                } ${active ? 'ring-4 ring-brand-100' : ''}`}
              >
                {done ? <Check size={15} aria-hidden="true" /> : active ? <Clock size={15} aria-hidden="true" /> : <Circle size={12} aria-hidden="true" />}
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${done ? 'text-ink' : 'text-muted'}`}>
                    {REPORT_STATUS_LABELS[step]}
                  </p>
                  {active ? (
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
                      Current
                    </span>
                  ) : null}
                </div>

                {entry ? (
                  <>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {formatDateTime(entry.at)} · {entry.by} · {formatRelativeTime(entry.at)}
                    </p>
                    {entry.note ? <p className="mt-1.5 text-[13px] leading-relaxed text-body">{entry.note}</p> : null}
                  </>
                ) : (
                  <p className="mt-0.5 text-[11px] text-muted">Pending</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {isRejected ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-body">
          This report was rejected during verification and is closed. The rejection reason is recorded in the notes below.
        </p>
      ) : null}
    </div>
  )
}
