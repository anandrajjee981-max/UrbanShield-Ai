import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Eye, MapPin, Navigation, Siren } from 'lucide-react';
import Badge from '../common/Badge';
import Card from '../common/Card';
import IncidentDetailsModal from './IncidentDetailsModal';
import type { Incident } from '../../types';
import { severityColor, timeAgo } from '../../utils/format';
import { useAppDispatch } from '../../store/hooks';
import { setCenter } from '../../store/slices/mapSlice';

function StatusPill({ status }: { status: Incident['status'] }) {
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-civic-green">
        <CheckCircle2 size={13} /> Resolved
      </span>
    );
  }
  if (status === 'monitoring') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-civic-amber-dark">
        <Eye size={13} /> Monitoring
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand">
      <span className="w-2 h-2 rounded-full bg-brand animate-pulse" /> Active
    </span>
  );
}

/**
 * Command-center incident card. Self-contained: "View Details" opens the
 * shared IncidentDetailsModal and "View on Map" focuses the existing city
 * map — so dashboard + incidents page both get the full flow with zero
 * extra wiring.
 */
export default function IncidentCard({ incident }: { incident: Incident }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isCritical = incident.severity === 'critical';
  const isHigh = incident.severity === 'high';
  const isResolved = incident.status === 'resolved';
  const riskColor = severityColor[incident.severity] ?? 'var(--brand)';

  const viewOnMap = (inc: Incident) => {
    if (inc.lat === null || inc.lng === null) return;
    setDetailsOpen(false);
    dispatch(setCenter([inc.lat, inc.lng]));
    navigate('/map');
  };
  const hasCoords = incident.lat !== null && incident.lng !== null;

  return (
    <>
      <Card
        className={`gs-in group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
          isResolved
            ? 'opacity-90 hover:border-line'
            : isCritical
              ? 'border-brand/60 hover:border-brand hover:shadow-brand/10'
              : isHigh
                ? 'hover:border-brand-warm/70'
                : 'hover:border-brand/40'
        }`}
      >
        {/* Risk accent edge */}
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: riskColor, opacity: isResolved ? 0.45 : 1 }}
        />
        <div className="pl-2">
          {/* 1 · Risk + status */}
          <div className="flex items-start justify-between gap-2">
            <span
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white"
              style={{ background: riskColor }}
              title={`${incident.severity} risk`}
            >
              {isCritical ? <Siren size={17} /> : <AlertTriangle size={17} />}
            </span>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge level={incident.severity} />
              <StatusPill status={incident.status} />
            </div>
          </div>

          {/* 2 · Title */}
          <h4 className="font-extrabold text-[15px] leading-snug mt-2.5 break-words">
            {incident.title}
          </h4>

          {/* 6 · Description */}
          <p className="text-xs text-soft mt-1 line-clamp-2 leading-relaxed break-words">
            {incident.description}
          </p>

          {/* 4 · Location + 5 · Time */}
          <div className="flex flex-col gap-1 mt-3 text-[11px] text-mute">
            <span className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="shrink-0 text-brand" />
              <span className="truncate font-semibold">{incident.address}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Clock size={12} className="shrink-0" />
              <span className="font-semibold">{timeAgo(incident.reportedAt)}</span>
              <span aria-hidden className="text-line">·</span>
              <span className="truncate">{incident.id}</span>
            </span>
          </div>

          {/* 3 + 7 · Status + actions */}
          <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-line">
            <StatusPill status={incident.status} />
            <div className="ml-auto flex items-center gap-1.5">
              {hasCoords ? (
                <button
                  type="button"
                  onClick={() => viewOnMap(incident)}
                  title={`View ${incident.title} on the city map`}
                  aria-label={`View ${incident.title} on the city map`}
                  className="p-2 rounded-lg border border-line text-soft hover:border-brand hover:text-brand transition-colors"
                >
                  <Navigation size={14} />
                </button>
              ) : (
                <span title="Manual address — no GPS pin" className="text-[10px] font-bold text-mute px-2 py-1 rounded-lg border border-line">
                  Manual address
                </span>
              )}
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-extrabold px-3 py-2 rounded-lg bg-brand-soft text-brand border border-brand/20 hover:bg-brand hover:text-white transition-colors sm:opacity-80 sm:group-hover:opacity-100"
              >
                View Details <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {detailsOpen && (
        <IncidentDetailsModal
          incident={incident}
          onClose={() => setDetailsOpen(false)}
          onViewOnMap={viewOnMap}
        />
      )}
    </>
  );
}
