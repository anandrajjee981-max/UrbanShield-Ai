import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Eye, MapPin, Navigation, Siren, X } from 'lucide-react';
import Badge from '../common/Badge';
import type { Incident } from '../../types';
import { severityColor, timeAgo } from '../../utils/format';

function fullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STAGES = ['Reported', 'Verified', 'Assigned', 'Responding', 'Resolved'] as const;

/**
 * Lifecycle position derived from the incident's ACTUAL status —
 * no invented progress values. Resolved = complete, active = responding,
 * monitoring = verified and under watch.
 */
function stageIndex(status: Incident['status']): number {
  if (status === 'resolved') return 4;
  if (status === 'active') return 3;
  return 1;
}

function StatusDot({ status }: { status: Incident['status'] }) {
  if (status === 'resolved') return <CheckCircle2 size={14} className="text-civic-green shrink-0" />;
  if (status === 'monitoring') return <Eye size={14} className="text-civic-amber-dark shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />;
}

/**
 * Single reusable incident detail view (no detail route exists, so the
 * command-center cards and dashboard cards share this modal).
 */
export default function IncidentDetailsModal({
  incident,
  onClose,
  onViewOnMap,
}: {
  incident: Incident;
  onClose: () => void;
  onViewOnMap: (incident: Incident) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = stageIndex(incident.status);
  const riskColor = severityColor[incident.severity] ?? 'var(--brand)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Incident details: ${incident.title}`}
    >
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full sm:max-w-lg bg-card border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Risk accent edge */}
        <div className="h-1.5 rounded-t-3xl" style={{ background: riskColor }} />
        <div className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ background: riskColor }}
              >
                {incident.severity === 'critical' ? <Siren size={18} /> : <AlertTriangle size={18} />}
              </span>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <Badge level={incident.severity} />
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-soft">
                  <StatusDot status={incident.status} /> {incident.status}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close incident details"
              autoFocus
              className="p-2 rounded-xl hover:bg-canvas text-mute shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-lg md:text-xl font-extrabold mt-3 leading-snug">{incident.title}</h2>
          <p className="text-xs font-mono text-mute mt-1">{incident.id}</p>
          <p className="text-sm text-soft mt-2 leading-relaxed">{incident.description}</p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs">
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px] flex items-center gap-1">
                <MapPin size={11} /> Location
              </dt>
              <dd className="font-bold mt-1">{incident.address}</dd>
              <dd className="text-mute mt-0.5">
                {incident.lat !== null && incident.lng !== null
                  ? `GPS-pinned · ±${incident.affectedRadiusKm} km`
                  : 'Manual address — no GPS pin'}
              </dd>
            </div>
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px] flex items-center gap-1">
                <Clock size={11} /> Reported
              </dt>
              <dd className="font-bold mt-1">{fullDate(incident.reportedAt)}</dd>
              <dd className="text-mute mt-0.5">
                {timeAgo(incident.reportedAt)} · by {incident.reporter}
              </dd>
            </div>
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Category</dt>
              <dd className="font-bold mt-1 uppercase">{incident.category}</dd>
            </div>
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Risk level</dt>
              <dd className="font-bold mt-1 uppercase" style={{ color: riskColor }}>
                {incident.severity}
              </dd>
            </div>
          </dl>

          {/* Response lifecycle — position comes from real status only. */}
          <div className="mt-4">
            <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide">
              Response progress
            </p>
            <ol className="flex items-center gap-1 mt-2 list-none p-0 m-0" aria-label="Response lifecycle">
              {STAGES.map((stage, i) => {
                const done = i < current;
                const isCurrent = i === current;
                return (
                  <li key={stage} className="flex-1 min-w-0">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        background: done || isCurrent ? riskColor : 'var(--line)',
                        opacity: done ? 0.85 : isCurrent ? 1 : 1,
                      }}
                    />
                    <p
                      className={`text-[9px] font-bold mt-1 truncate ${
                        isCurrent ? 'text-ink' : done ? 'text-soft' : 'text-mute'
                      }`}
                      title={stage}
                    >
                      {stage}
                    </p>
                  </li>
                );
              })}
            </ol>
            <p className="text-[11px] text-mute mt-1.5">
              {incident.status === 'resolved'
                ? 'Incident resolved — response complete.'
                : `Currently: ${STAGES[current]} (derived from live status).`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            {incident.lat !== null && incident.lng !== null ? (
              <button
                type="button"
                onClick={() => onViewOnMap(incident)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm"
            >
              <Navigation size={15} /> View on Map
              </button>
            ) : (
              <p className="flex-1 text-xs text-mute font-semibold px-4 py-3 rounded-xl border border-line bg-canvas text-center">
                Manual address — no map pin available
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl border border-line bg-canvas hover:border-brand"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
