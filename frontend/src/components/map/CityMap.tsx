import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, searchLocation, getCurrentPosition } from '../../services/mapService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleRiskLayers, toggleIncidents, setCategory, setCenter } from '../../store/slices/mapSlice';
import type { LiveLocation } from '../../hooks/useLiveLocation';
import { useMapIncidents } from '../../hooks/useMapIncidents';
import { severityColor } from '../../utils/format';
import { Search, LocateFixed, Layers, ChevronUp, ChevronDown } from 'lucide-react';

const CATEGORIES = ['flood', 'heat', 'fire', 'air', 'infrastructure', 'medical'] as const;

// Fix default marker icons for Vite
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
}

export default function CityMap({ live, recenterKey }: { live: LiveLocation; recenterKey: number }) {
  const dispatch = useAppDispatch();
  const { zones, showRiskLayers, showIncidents, activeCategory, center } = useAppSelector((s) => s.map);
  const { allIncidents, liveIds } = useMapIncidents();
  const centeredOnce = useRef(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  // Collapsible category row: only the ALL pill shows at first; tapping it
  // expands all options, tapping again collapses back.
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Center the map on the user's live location on load (GPS preferred, city
  // fallback) and whenever the page's Live Location button is pressed.
  // Afterwards the user can pan freely.
  useEffect(() => {
    if (live.locating) return;
    if (recenterKey > 0 || !centeredOnce.current) {
      centeredOnce.current = true;
      dispatch(setCenter([live.lat, live.lon]));
    }
  }, [dispatch, live.lat, live.lon, live.locating, recenterKey]);

  const filtered = allIncidents.filter((i) => activeCategory === 'all' || i.category === activeCategory);
  const visibleZones = zones.filter((z) => activeCategory === 'all' || z.riskType === activeCategory);
  const countFor = (c: string) =>
    c === 'all' ? allIncidents.length : allIncidents.filter((i) => i.category === c).length;

  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const doSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(null);
    try {
      const r = await searchLocation(query.trim());
      setResults(r);
      if (r[0]) {
        dispatch(setCenter([parseFloat(r[0].lat), parseFloat(r[0].lon)]));
      } else {
        setSearchError(`No places found for “${query.trim()}” — try a city or landmark name.`);
      }
    } catch {
      setSearchError('Place search is unreachable right now — check your connection and retry.');
    } finally {
      setSearching(false);
    }
  };

  const [locatingMe, setLocatingMe] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const locate = async () => {
    if (locatingMe) return;
    setLocatingMe(true);
    setLocateError(null);
    try {
      const pos = await getCurrentPosition();
      dispatch(setCenter(pos));
    } catch {
      setLocateError('Could not get your location — allow GPS permission (needs HTTPS or localhost) and retry.');
      window.setTimeout(() => setLocateError(null), 5000);
    } finally {
      setLocatingMe(false);
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line bg-card">
      <div className="absolute z-[1000] top-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-card rounded-xl shadow pl-3 pr-1.5 py-1.5 border border-line min-w-0">
          <Search size={16} className="text-mute shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search location…" className="outline-none text-sm w-full min-w-0" />
          <button onClick={doSearch} title="Search location" disabled={searching || !query.trim()}
            className="shrink-0 w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand-warm transition-all duration-150 active:scale-90 disabled:opacity-50">
            <Search size={15} className={searching ? 'animate-pulse' : ''} />
          </button>
        </div>
        {searchError && (
          <div className="pointer-events-auto bg-card border border-brand/40 text-brand rounded-xl shadow px-3 py-2 text-[11px] font-semibold">
            {searchError}
          </div>
        )}
        <div className="pointer-events-auto flex gap-2 flex-wrap">
          <button onClick={locate} disabled={locatingMe}
            className="flex items-center gap-1.5 bg-card rounded-xl shadow px-3 py-2 border border-line text-xs font-semibold whitespace-nowrap disabled:opacity-60">
            <LocateFixed size={14} className={locatingMe ? 'animate-pulse' : ''} /> {locatingMe ? 'Locating…' : 'Locate me'}
          </button>
          <button onClick={() => dispatch(toggleRiskLayers())}
            className={`flex items-center gap-1.5 rounded-xl shadow px-3 py-2 border text-xs font-semibold whitespace-nowrap ${showRiskLayers ? 'bg-brand text-white border-brand' : 'bg-card border-line text-soft'}`}>
            <Layers size={14} /> Risk: {showRiskLayers ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => dispatch(toggleIncidents())}
            className={`rounded-xl shadow px-3 py-2 border text-xs font-semibold whitespace-nowrap ${showIncidents ? 'bg-brand text-white border-brand' : 'bg-card border-line text-soft'}`}>
            Incidents: {showIncidents ? 'ON' : 'OFF'}
          </button>
        </div>
        {locateError && (
          <div className="pointer-events-auto bg-card border border-brand/40 text-brand rounded-xl shadow px-3 py-2 text-[11px] font-semibold">
            {locateError}
          </div>
        )}
      </div>
      {results.length > 0 && (
        <div className="absolute z-[1000] top-32 sm:top-24 left-3 right-3 sm:right-auto bg-card rounded-xl shadow-lg border border-line text-sm sm:max-w-xs max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button key={i} className="block w-full text-left px-3 py-2 hover:bg-cream text-xs"
              onClick={() => { dispatch(setCenter([parseFloat(r.lat), parseFloat(r.lon)])); setResults([]); }}>
              {r.display_name.slice(0, 80)}…
            </button>
          ))}
        </div>
      )}
      <div className="absolute z-[1000] bottom-3 left-3">
        {filtersOpen && (
          <button aria-label="Close filters" onClick={() => setFiltersOpen(false)}
            className="fixed inset-0 cursor-default bg-transparent" />
        )}
        <div className="relative">
          {filtersOpen && (
            <div className="absolute bottom-full mb-2 left-0 bg-card border border-line rounded-2xl shadow-xl p-1.5 min-w-48 flex flex-col gap-1">
              <button
                onClick={() => { dispatch(setCategory('all')); setFiltersOpen(false); }}
                className={`flex items-center justify-between gap-3 w-full text-[11px] font-bold px-3 py-2 rounded-xl ${activeCategory === 'all' ? 'bg-brand text-white' : 'text-soft hover:bg-canvas'}`}>
                <span>ALL</span><span>{countFor('all')}</span>
              </button>
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => { dispatch(setCategory(c)); setFiltersOpen(false); }}
                  className={`flex items-center justify-between gap-3 w-full text-[11px] font-bold px-3 py-2 rounded-xl ${activeCategory === c ? 'bg-brand text-white' : 'text-soft hover:bg-canvas'}`}>
                  <span>{c.toUpperCase()}</span><span>{countFor(c)}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            title={filtersOpen ? 'Close filters' : 'Open filters'}
            className="flex items-center gap-1 text-[11px] font-bold px-3 py-2 rounded-full border shadow bg-brand text-white border-brand">
            {activeCategory.toUpperCase()} · {countFor(activeCategory)}
            {filtersOpen ? <ChevronDown size={13} className="shrink-0" /> : <ChevronUp size={13} className="shrink-0" />}
          </button>
        </div>
      </div>
      {filtered.length === 0 && visibleZones.length === 0 && (
        <div className="absolute z-[1000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-line rounded-xl shadow-lg px-4 py-3 text-xs font-semibold text-soft text-center max-w-[80%]">
          No {activeCategory.toUpperCase()} activity on the map right now — try ALL or another category.
        </div>
      )}
      <MapContainer center={center} zoom={12} className="h-[420px] md:h-[560px] xl:h-[640px] w-full" style={{ width: '100%' }}>
        <Recenter center={center} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {showRiskLayers && visibleZones.map((z) => (
          <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radiusKm * 1000}
            pathOptions={{ color: severityColor[z.riskLevel], fillColor: severityColor[z.riskLevel], fillOpacity: 0.18, weight: 2 }}>
            <Popup><b>{z.name}</b><br />Type: {z.riskType} · Score: {z.score}<br />Population: {z.population.toLocaleString()}</Popup>
          </Circle>
        ))}
        {showIncidents && filtered.map((i) => (
          <Marker key={i.id} position={[i.lat, i.lng]}>
            <Popup><b>{i.title}</b><br />{i.address}<br /><span style={{ color: severityColor[i.severity], fontWeight: 700 }}>{i.severity.toUpperCase()}</span> · {i.status}<br />{i.reporter}{liveIds.has(i.id) && ' · ● LIVE'}</Popup>
          </Marker>
        ))}
        {/* You-are-here marker at the live location */}
        <CircleMarker center={[live.lat, live.lon]} radius={9}
          pathOptions={{ color: '#fff', weight: 3, fillColor: 'var(--brand)', fillOpacity: 1 }}>
          <Popup><b>You are here</b><br />{live.label}{live.source === 'gps' ? ' · ● GPS live' : ''}</Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
