import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarClock, MapPin, ShieldCheck } from 'lucide-react'
import Badge from '../common/Badge.jsx'
import { formatDateTime } from '../../utils/formatDate.js'
import { REPORT_STATUS_LABELS } from '../../utils/constants.js'

/**
 * Map popup body.
 *
 * Spec fields: Risk Type, Ward, Risk Score, Status, Last Updated, Related
 * Reports and a View Details action. Works for both risk zones and reports -
 * the shape of the popup adapts to what was clicked.
 */

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right text-[11px] font-semibold text-slate-700">{children}</dd>
    </div>
  )
}

export function RiskPopup({ zone, authority = true }) {
  const level = zone.score >= 70 ? 'high' : zone.score >= 40 ? 'medium' : zone.score >= 20 ? 'low' : 'minimal'

  return (
    <div className="min-w-[240px]">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
          {zone.type}
        </span>
        <Badge tone={level} size="sm" dot>
          {level} risk
        </Badge>
      </div>

      {zone.title ? <p className="mb-2 text-sm font-semibold text-slate-900">{zone.title}</p> : null}
      {zone.impact ? <p className="mb-2.5 text-[11px] leading-relaxed text-slate-500">{zone.impact}</p> : null}

      <dl>
        <Row label="Ward">{zone.ward}</Row>
        <Row label="Risk score">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
              <span className="block h-full rounded-full bg-brand-500" style={{ width: `${zone.score}%` }} />
            </span>
            {zone.score}
          </span>
        </Row>
        <Row label="Status">
          <Badge tone={zone.status === 'critical' ? 'danger' : zone.status === 'watch' ? 'warning' : 'success'} size="sm">
            {zone.status}
          </Badge>
        </Row>
        <Row label="Confidence">{Math.round((zone.confidence ?? 0) * 100)}%</Row>
        <Row label="Last updated">{formatDateTime(zone.updatedAt)}</Row>
      </dl>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
        <ShieldCheck size={12} aria-hidden="true" />
        {zone.source}
      </div>

      {/* Focus is a URL parameter, so a citizen stays on their own map. */}
      <Link
        to={`${authority ? '/authority' : '/citizen'}/map?focus=${zone.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-50"
      >
        View details <ArrowUpRight size={12} />
      </Link>
    </div>
  )
}

export function ReportPopup({ report, authority = true }) {
  return (
    <div className="min-w-[240px]">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={report.priority} size="sm" dot>
          {report.priority} priority
        </Badge>
        <Badge tone={report.status === 'resolved' ? 'success' : 'info'} size="sm">
          {REPORT_STATUS_LABELS[report.status] ?? report.status}
        </Badge>
      </div>

      <p className="text-sm font-semibold text-slate-900">{report.issueLabel}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{report.trackingId}</p>

      {report.photos?.[0] ? (
        <img
          src={report.photos[0].url}
          alt=""
          className="mt-2.5 h-24 w-full rounded-lg object-cover"
          loading="lazy"
        />
      ) : null}

      <dl className="mt-2.5">
        <Row label="Ward">{report.ward}</Row>
        <Row label="Location">
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} className="text-slate-400" />
            {report.address?.split(',')[0] ?? '—'}
          </span>
        </Row>
        <Row label="Reported by">{report.reporter?.name ?? 'Citizen'}</Row>
        <Row label="Department">{report.department?.shortName ?? 'Unassigned'}</Row>
        <Row label="Last updated">
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={10} className="text-slate-400" />
            {formatDateTime(report.updatedAt)}
          </span>
        </Row>
      </dl>

      <Link
        to={authority ? `/authority/reports/${report.id}` : `/citizen/reports/${report.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-[11px] font-semibold text-navy-900 transition hover:bg-brand-600"
      >
        View details <ArrowUpRight size={12} />
      </Link>
    </div>
  )
}

export default function MapPopup({ data, kind = 'risk', authority = true }) {
  if (!data) return null
  return kind === 'report' ? (
    <ReportPopup report={data} authority={authority} />
  ) : (
    <RiskPopup zone={data} authority={authority} />
  )
}
