import { useMemo } from 'react';
import { MapContainer, CircleMarker, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { ChartCard } from './badges';
import { EmptyState } from '../ui';
import type { AdminMonitoredIssue } from '../../../services/admin.service';

const STATUS_COLOR: Record<string, string> = {
  REPORTED: '#f7b907',
  VERIFIED: '#51933a',
  REJECTED: '#f84424',
};

/** Leaflet map of GPS-located issues (MANUAL reports have no coords — counted, not faked). */
export function IssuesOverviewMap({ issues }: { issues: AdminMonitoredIssue[] }) {
  const points = useMemo(
    () =>
      issues.filter((i) => i.locationType === 'GPS' && i.latitude != null && i.longitude != null),
    [issues],
  );
  const skipped = issues.length - points.length;
  const center: [number, number] =
    points.length > 0
      ? [
          points.reduce((n, p) => n + (p.latitude ?? 0), 0) / points.length,
          points.reduce((n, p) => n + (p.longitude ?? 0), 0) / points.length,
        ]
      : [22.7196, 75.8577]; // fallback: Indore (project city)

  return (
    <ChartCard
      title="Issue Locations"
      sub={skipped > 0 ? `${points.length} GPS-pinned · ${skipped} manual (no coords).` : `${points.length} GPS-pinned reports.`}
      action={
        <Link to="/admin/issues" className="text-xs font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded">
          Open map →
        </Link>
      }
    >
      {points.length === 0 ? (
        <EmptyState title="No mappable issues." hint="GPS reports will appear here once filed." />
      ) : (
        <div className="h-56 rounded-xl overflow-hidden border border-line">
          <MapContainer center={center} zoom={11} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {points.slice(0, 100).map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.latitude as number, p.longitude as number]}
                radius={7}
                pathOptions={{
                  color: STATUS_COLOR[p.status.toUpperCase()] ?? '#f84424',
                  fillColor: STATUS_COLOR[p.status.toUpperCase()] ?? '#f84424',
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Tooltip>{p.description.slice(0, 80)}</Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}
    </ChartCard>
  );
}
