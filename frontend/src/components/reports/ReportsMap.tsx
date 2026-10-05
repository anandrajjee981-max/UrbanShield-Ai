import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { TILE_URL, TILE_ATTRIBUTION } from '../../services/mapService';
import type { CitizenReport } from '../../types';

const DEFAULT_CENTER: [number, number] = [23.34, 85.31];

const statusColor: Record<CitizenReport['status'], string> = {
  pending: '#f7b907',
  verified: '#4482ea',
  actioned: '#51933a',
  rejected: '#f84424',
};

/** Fits the view to all GPS pins whenever the report set changes. */
function FitPins({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(points, { padding: [28, 28] });
  }, [map, points]);
  return null;
}

/** Jumps to the report the user tapped in the list below. */
function RecenterOnSelect({ point }: { point: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.setView(point, 14, { animate: true });
  }, [map, point]);
  return null;
}

interface Props {
  reports: CitizenReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Phone-first preview map for the Reports page: your GPS-pinned reports as
 * status-colored dots, list stays below. Dragging is off so the page scrolls
 * smoothly on touch — pins are still tappable, zoom buttons work, and
 * "Full map" jumps to the interactive city map.
 */
export default function ReportsMap({ reports, selectedId, onSelect }: Props) {
  // Only reports that actually carry coordinates are pinned — MANUAL-address
  // reports have null lat/lng and stay in the list below, never faked.
  const gps = reports.filter((r) => r.locationType === 'GPS' && r.lat !== null && r.lng !== null);
  const manualCount = reports.length - gps.length;
  const points = gps.map((r) => [r.lat as number, r.lng as number] as [number, number]);
  const selected = gps.find((r) => r.id === selectedId) ?? null;
  // Remount (and refit) only when the pin set itself changes — never on selection.
  const pinsKey = gps.map((r) => r.id).join(',');

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line bg-card">
      <MapContainer
        key={pinsKey}
        center={points[0] ?? DEFAULT_CENTER}
        zoom={12}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        className="h-[280px] sm:h-[360px] w-full"
        style={{ width: '100%' }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <FitPins points={points} />
        <RecenterOnSelect point={selected && selected.lat !== null && selected.lng !== null ? [selected.lat, selected.lng] : null} />
        {gps.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat as number, r.lng as number]}
            radius={r.id === selectedId ? 12 : 8}
            pathOptions={{
              color: '#fff',
              weight: r.id === selectedId ? 3 : 2,
              fillColor: statusColor[r.status],
              fillOpacity: 0.95,
            }}
            eventHandlers={{ click: () => onSelect(r.id) }}
          >
            <Popup>
              <b>{r.title}</b>
              <br />
              {r.address}
              <br />
              <span style={{ color: statusColor[r.status], fontWeight: 700 }}>
                {r.status.toUpperCase()}
              </span>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Count badge */}
      <div className="absolute z-[1000] top-3 left-3 flex items-center gap-1.5 bg-card/95 rounded-full shadow border border-line text-[11px] font-bold px-3 py-1.5">
        <MapPin size={13} className="text-brand" />
        {gps.length} GPS pin{gps.length === 1 ? '' : 's'}
        {manualCount > 0 && <span className="text-mute">· {manualCount} manual</span>}
      </div>

      <Link
        to="/map"
        className="absolute z-[1000] top-3 right-3 bg-panel text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow"
      >
        Full map →
      </Link>

      {gps.length === 0 && (
        <div className="absolute z-[1000] bottom-3 left-3 right-3 bg-card/95 rounded-xl shadow border border-line px-3 py-2 text-center">
          <p className="text-[11px] font-semibold text-soft">
            No GPS-pinned reports yet — use the <span className="font-bold text-ink">GPS</span> button
            in “+ New Report” to drop pins here. Manual-address reports appear in the list below.
          </p>
        </div>
      )}
    </div>
  );
}
