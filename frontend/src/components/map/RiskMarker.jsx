import { Marker, Popup } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { useMemo } from 'react'
import { formatRelativeTime } from '../../utils/formatDate.js'
import { scoreToLevel } from '../../utils/riskCalculator.js'
import { RISK_CATEGORY_COLORS } from '../../utils/colors.js'
import { REPORT_STATUS_LABELS } from '../../utils/constants.js'
import Badge from '../common/Badge.jsx'
import { Link } from 'react-router-dom'

/**
 * Point markers for reports, infrastructure and department sites.
 *
 * Built as a `divIcon` so the marker inherits theme colours and stays crisp at
 * any zoom - the default Leaflet PNG icon cannot.
 */

const TONE_BY_STATUS = {
  reported: '#EF4444',
  verified: '#F59E0B',
  assigned: '#3B82F6',
  in_progress: '#8B5CF6',
  resolved: '#10B981',
  rejected: '#94A3B8',
}

const TONE_BY_HEALTH = {
  operational: '#10B981',
  degraded: '#F59E0B',
  critical: '#EF4444',
}

function pinIcon(color, glyph, size = 30) {
  return divIcon({
    className: 'usai-marker',
    html: `<span style="
        display:flex;align-items:center;justify-content:center;
        width:${size}px;height:${size}px;border-radius:9999px;
        background:${color};color:#fff;font-size:11px;font-weight:700;
        border:2.5px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,0.35);
        font-family:Outfit,system-ui,sans-serif;">${glyph}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 4],
  })
}

const GLYPHS = { P: '📍', W: '💧', H: '🔥', G: '🗑️', R: '🛣️', E: '🌿', I: '⚙️' }

/** Citizen report marker with a severity-coloured pin. */
export function ReportMarker({ report, onSelect, isSelected, authority = true }) {
  const color = TONE_BY_STATUS[report.status] ?? '#64748B'
  const glyph = GLYPHS[report.issueType?.charAt(0).toUpperCase()] ?? '📍'
  const icon = useMemo(() => pinIcon(color, glyph, isSelected ? 36 : 30), [color, glyph, isSelected])

  return (
    <Marker
      position={[report.latitude, report.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect?.(report) }}
    >
      <Popup>
        <div className="min-w-[220px] space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{report.issueLabel}</p>
            <Badge tone={report.priority} size="sm" dot>
              {report.priority}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500">{report.trackingId}</p>
          <dl className="space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Ward</dt>
              <dd className="font-medium">{report.ward}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Status</dt>
              <dd className="font-medium">{REPORT_STATUS_LABELS[report.status] ?? report.status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Reported</dt>
              <dd className="font-medium">{formatRelativeTime(report.createdAt)}</dd>
            </div>
          </dl>
          {/* A citizen cannot open someone else's incident record, so their
              copy of the popup points at their own reports instead. */}
          <Link
            to={authority ? `/authority/reports/${report.id}` : '/citizen/reports'}
            className="block rounded-lg bg-brand-500 px-3 py-1.5 text-center text-xs font-semibold text-navy-900 transition hover:bg-brand-600"
          >
            {authority ? 'View details' : 'My reports'}
          </Link>
        </div>
      </Popup>
    </Marker>
  )
}

/** Risk-zone / infrastructure / department marker. */
export function RiskMarker({ zone, onSelect, kind = 'risk' }) {
  const level = scoreToLevel(zone.score ?? zone.healthScore)
  const color = kind === 'risk' ? RISK_CATEGORY_COLORS[zone.type] ?? '#64748B' : TONE_BY_HEALTH[zone.status] ?? '#64748B'
  const glyph = kind === 'risk' ? GLYPHS[zone.type?.charAt(0).toUpperCase()] ?? '⚠️' : kind === 'infrastructure' ? '🏗️' : '🏛️'
  const icon = useMemo(() => pinIcon(color, glyph, 28), [color, glyph])

  return (
    <Marker
      position={[zone.latitude, zone.longitude]}
      icon={icon}
      eventHandlers={{ click: () => onSelect?.(zone) }}
    >
      <Popup>
        <div className="min-w-[210px] space-y-2">
          <p className="text-sm font-semibold capitalize text-slate-900">{zone.type?.replace('_', ' ')}</p>
          {zone.title ? <p className="text-[11px] text-slate-600">{zone.title}</p> : null}
          <dl className="space-y-1 text-[11px] text-slate-600">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Ward</dt>
              <dd className="font-medium">{zone.ward}</dd>
            </div>
            {zone.score !== undefined ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Risk score</dt>
                <dd className="font-medium">
                  {zone.score}/100 · {level.toUpperCase()}
                </dd>
              </div>
            ) : null}
            {zone.healthScore !== undefined ? (
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Health</dt>
                <dd className="font-medium capitalize">{zone.status}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-slate-400">Updated</dt>
              <dd className="font-medium">{formatRelativeTime(zone.updatedAt ?? zone.lastInspectedAt)}</dd>
            </div>
          </dl>
        </div>
      </Popup>
    </Marker>
  )
}
