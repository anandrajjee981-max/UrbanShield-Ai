import { useMemo } from 'react';
import { Flame, MapPin, Waves, Wind, Zap, HeartPulse, Building2 } from 'lucide-react';
import Card from '../common/Card';
import { useAppSelector } from '../../store/hooks';
import { useMapIncidents } from '../../hooks/useMapIncidents';
import { formatKm, kmBetween } from '../../utils/distance';
import { severityColor } from '../../utils/format';

const CATEGORY_META = [
  { key: 'flood', label: 'Flood', icon: Waves, color: 'var(--blue)' },
  { key: 'heat', label: 'Heat', icon: Flame, color: 'var(--brand-warm)' },
  { key: 'fire', label: 'Fire', icon: Zap, color: 'var(--brand)' },
  { key: 'air', label: 'Air', icon: Wind, color: 'var(--mute)' },
  { key: 'infrastructure', label: 'Infrastructure', icon: Building2, color: 'var(--tag)' },
  { key: 'medical', label: 'Medical', icon: HeartPulse, color: 'var(--green)' },
] as const;

/** "What's around the user's live location" — counts + nearest issues/zones. */
export default function NearbyPanel({ lat, lon, label }: { lat: number; lon: number; label: string }) {
  const zones = useAppSelector((s) => s.map.zones);
  const { allIncidents } = useMapIncidents();

  const nearby = useMemo(() => {
    const RADIUS_KM = 15;
    const incidents = allIncidents
      .filter((i) => i.lat !== null && i.lng !== null)
      .map((i) => ({ ...i, km: kmBetween(lat, lon, i.lat as number, i.lng as number) }))
      .filter((i) => i.km <= RADIUS_KM)
      .sort((a, b) => a.km - b.km);
    const zoneList = zones
      .map((z) => ({ ...z, km: kmBetween(lat, lon, z.lat, z.lng) }))
      .filter((z) => z.km <= RADIUS_KM + z.radiusKm)
      .sort((a, b) => b.score - a.score);
    return { incidents, zoneList };
  }, [allIncidents, zones, lat, lon]);

  const countFor = (key: string) => nearby.incidents.filter((i) => i.category === key).length;

  return (
    <Card className="gs-in p-4 sm:p-5">
      <h3 className="font-bold flex items-center gap-1.5 flex-wrap">
        <MapPin size={16} className="text-brand shrink-0" />
        Near you — {label}
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wide">
          Live location
        </span>
      </h3>

      {/* Per-category counts around the user */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {CATEGORY_META.map((c) => (
          <div key={c.key} className="bg-canvas border border-line rounded-xl px-2 py-2.5 text-center">
            <c.icon size={16} className="mx-auto" style={{ color: c.color }} />
            <p className="text-lg font-extrabold leading-tight mt-1">{countFor(c.key)}</p>
            <p className="text-[10px] font-bold text-mute uppercase tracking-wide truncate">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Nearest issues */}
      {nearby.incidents.length === 0 ? (
        <p className="text-xs text-mute mt-3">No reported issues within 15 km of you right now.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-1.5">
          {nearby.incidents.slice(0, 6).map((i) => (
            <li key={i.id} className="flex items-center gap-2 text-xs bg-canvas border border-line rounded-xl px-3 py-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: severityColor[i.severity] }} />
              <span className="font-bold truncate flex-1 min-w-0">{i.title}</span>
              <span className="text-mute font-semibold shrink-0 uppercase">{i.category}</span>
              <span className="font-bold text-soft shrink-0">{formatKm(i.km)}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Nearby risk zones */}
      {nearby.zoneList.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-mute">Risk zones around you</p>
          <ul className="mt-1.5 space-y-1.5">
            {nearby.zoneList.slice(0, 3).map((z) => (
              <li key={z.id} className="flex items-center gap-2 text-xs bg-canvas border border-line rounded-xl px-3 py-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: severityColor[z.riskLevel] }} />
                <span className="font-bold truncate flex-1 min-w-0">{z.name}</span>
                <span className="text-mute font-semibold shrink-0">Score {z.score}</span>
                <span className="font-bold text-soft shrink-0">{formatKm(z.km)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
