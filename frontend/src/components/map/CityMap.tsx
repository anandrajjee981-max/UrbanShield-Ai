import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TILE_URL, TILE_ATTRIBUTION, searchLocation, getCurrentPosition } from '../../services/mapService';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleRiskLayers, toggleIncidents, setCategory, setCenter } from '../../store/slices/mapSlice';
import { severityColor } from '../../utils/format';
import { Search, LocateFixed, Layers } from 'lucide-react';

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
  map.setView(center, map.getZoom());
  return null;
}

export default function CityMap() {
  const dispatch = useAppDispatch();
  const { zones, incidents, showRiskLayers, showIncidents, activeCategory, center } = useAppSelector((s) => s.map);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);

  const filtered = incidents.filter((i) => activeCategory === 'all' || i.category === activeCategory);

  const doSearch = async () => {
    const r = await searchLocation(query);
    setResults(r);
    if (r[0]) dispatch(setCenter([parseFloat(r[0].lat), parseFloat(r[0].lon)]));
  };

  const locate = async () => {
    try {
      const pos = await getCurrentPosition();
      dispatch(setCenter(pos));
    } catch { alert('Could not get current location'); }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-line bg-card">
      <div className="absolute z-[1000] top-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-card rounded-xl shadow px-3 py-2 border border-line min-w-0">
          <Search size={16} className="text-mute shrink-0" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search location…" className="outline-none text-sm w-full min-w-0" />
          <button onClick={doSearch} className="text-xs font-bold text-brand shrink-0">GO</button>
        </div>
        <div className="pointer-events-auto flex gap-2 flex-wrap">
          <button onClick={locate} className="flex items-center gap-1.5 bg-card rounded-xl shadow px-3 py-2 border border-line text-xs font-semibold whitespace-nowrap"><LocateFixed size={14} /> Locate me</button>
          <button onClick={() => dispatch(toggleRiskLayers())} className="flex items-center gap-1.5 bg-card rounded-xl shadow px-3 py-2 border border-line text-xs font-semibold whitespace-nowrap"><Layers size={14} /> Risk: {showRiskLayers ? 'ON' : 'OFF'}</button>
          <button onClick={() => dispatch(toggleIncidents())} className="bg-card rounded-xl shadow px-3 py-2 border border-line text-xs font-semibold whitespace-nowrap">Incidents: {showIncidents ? 'ON' : 'OFF'}</button>
        </div>
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
      <div className="absolute z-[1000] bottom-3 left-3 right-3 flex gap-1.5 flex-nowrap overflow-x-auto pb-1 pr-3">
        {['all', 'flood', 'heat', 'fire', 'air', 'infrastructure', 'medical'].map((c) => (
          <button key={c} onClick={() => dispatch(setCategory(c))}
            className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-full border shadow ${activeCategory === c ? 'bg-brand text-white border-brand' : 'bg-card text-soft border-line'}`}>
            {c.toUpperCase()}
          </button>
        ))}
      </div>
      <MapContainer center={center} zoom={12} className="h-[420px] md:h-[560px] xl:h-[640px] w-full" style={{ width: '100%' }}>
        <Recenter center={center} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {showRiskLayers && zones.map((z) => (
          <Circle key={z.id} center={[z.lat, z.lng]} radius={z.radiusKm * 1000}
            pathOptions={{ color: severityColor[z.riskLevel], fillColor: severityColor[z.riskLevel], fillOpacity: 0.18, weight: 2 }}>
            <Popup><b>{z.name}</b><br />Type: {z.riskType} · Score: {z.score}<br />Population: {z.population.toLocaleString()}</Popup>
          </Circle>
        ))}
        {showIncidents && filtered.map((i) => (
          <Marker key={i.id} position={[i.lat, i.lng]}>
            <Popup><b>{i.title}</b><br />{i.address}<br /><span style={{ color: severityColor[i.severity], fontWeight: 700 }}>{i.severity.toUpperCase()}</span> · {i.status}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
