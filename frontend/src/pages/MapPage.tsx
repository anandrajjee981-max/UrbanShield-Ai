import { useEffect, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import CityMap from '../components/map/CityMap';
import NearbyPanel from '../components/map/NearbyPanel';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchMapData, fetchRealMapReports } from '../store/slices/mapSlice';
import { useLiveLocation } from '../hooks/useLiveLocation';

export default function MapPage() {
  const dispatch = useAppDispatch();
  const liveCount = useAppSelector((s) => s.map.realIncidents.length);
  const weatherLoc = useAppSelector((s) => s.weather.location);
  const weatherCity = weatherLoc
    ? (weatherLoc.country ? `${weatherLoc.city}, ${weatherLoc.country}` : weatherLoc.city)
    : null;
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const loc = useLiveLocation();
  // Bumped by the Live Location button → CityMap recenters on fresh GPS.
  const [recenterKey, setRecenterKey] = useState(0);
  useEffect(() => {
    dispatch(fetchMapData());
    // Live backend markers: citizens see their own reports. Staff see the
    // same on their role screens (no city-wide browse endpoint exists yet).
    if (role === 'CITIZEN') dispatch(fetchRealMapReports());
  }, [dispatch, role]);

  const goLive = () => {
    loc.retryGps();
    setRecenterKey((k) => k + 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold">Live City Map</h1>
          <p className="text-xs sm:text-sm text-mute flex items-center gap-1.5 flex-wrap">
            <MapPin size={13} className="text-brand shrink-0" />
            <span className="font-bold text-soft">{weatherCity ?? loc.label}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wide">
              {loc.source === 'gps' ? 'GPS live' : loc.source === 'ip' ? 'IP location' : loc.source === 'city' ? 'City' : 'Default'}
            </span>
            {liveCount > 0 && <span>· {liveCount} live reports</span>}
          </p>
        </div>
        <button
          onClick={goLive}
          disabled={loc.locating}
          title="Re-fetch GPS and center the map on your live location"
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60 shrink-0"
        >
          <LocateFixed size={14} className={loc.locating ? 'animate-pulse' : ''} />
          {loc.locating ? 'Locating…' : 'Live Location'}
        </button>
      </div>
      <CityMap live={loc} recenterKey={recenterKey} />
      <NearbyPanel lat={loc.lat} lon={loc.lon} label={loc.locating ? 'Locating you…' : loc.label} />
    </div>
  );
}
