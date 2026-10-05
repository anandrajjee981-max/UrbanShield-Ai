import { useEffect, useMemo, useState } from 'react';
import { LocateFixed, MapPin, RefreshCw, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLiveAnalytics } from '../store/slices/analyticsSlice';
import { fetchReports } from '../store/slices/reportsSlice';
import { fetchBrowseReports } from '../store/slices/workflowSlice';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { searchLocation } from '../services/mapService';
import AnalyticsCharts from '../components/analytics/AnalyticsCharts';
import BrandLoader from '../components/common/BrandLoader';

export default function Analytics() {
  const dispatch = useAppDispatch();
  const { loading, error, locationLabel, source } = useAppSelector((s) => s.analytics);
  const hasData = useAppSelector((s) => s.analytics.trend.length > 0);
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const loc = useLiveLocation();
  const myReports = useAppSelector((s) => s.reports.items);
  const browse = useAppSelector((s) => s.workflow.browse);
  // Manual city fallback — replaces the Default location when GPS is blocked.
  const [city, setCity] = useState('');
  const [citySearching, setCitySearching] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);

  const applyCity = async () => {
    if (!city.trim() || citySearching) return;
    setCitySearching(true);
    setCityError(null);
    try {
      const r = await searchLocation(city.trim());
      if (r[0]) {
        loc.applyManual(parseFloat(r[0].lat), parseFloat(r[0].lon), r[0].display_name.split(',').slice(0, 2).join(','));
        setCity('');
      } else {
        setCityError(`No place found for “${city.trim()}” — try a city name.`);
      }
    } catch {
      setCityError('Place search is unreachable — check your connection and retry.');
    } finally {
      setCitySearching(false);
    }
  };

  // Real issues visible to this role feed the 7-day trend.
  useEffect(() => {
    if (role === 'CITIZEN') dispatch(fetchReports());
    else dispatch(fetchBrowseReports());
  }, [dispatch, role]);

  const issues = useMemo(
    () =>
      role === 'CITIZEN'
        ? myReports.map((r) => ({
            createdAt: r.createdAt,
            status: r.rawStatus ?? 'REPORTED',
            resolvedAt: null as string | null,
          }))
        : browse.map((b) => ({ createdAt: b.createdAt, status: b.status, resolvedAt: b.resolvedAt })),
    [role, myReports, browse],
  );

  useEffect(() => {
    dispatch(
      fetchLiveAnalytics({ lat: loc.lat, lon: loc.lon, label: loc.label, source: loc.source, issues }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, loc.lat, loc.lon, loc.source, issues]);

  const refresh = () =>
    dispatch(
      fetchLiveAnalytics({ lat: loc.lat, lon: loc.lon, label: loc.label, source: loc.source, issues }),
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold">Risk Analytics</h1>
          <p className="text-xs sm:text-sm text-mute flex items-center gap-1.5 mt-1 flex-wrap">
            <MapPin size={13} className="text-brand shrink-0" />
            {loc.locating && !locationLabel ? (
              'Locating you…'
            ) : (
              <>
                <span className="font-semibold">Live for {locationLabel ?? loc.label}</span>
                {source && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wide">
                    {source === 'gps' ? 'GPS live' : source === 'ip' ? 'IP location' : source === 'city' ? 'City' : 'Default'}
                  </span>
                )}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={loc.retryGps}
            disabled={loc.locating}
            title="Use my live GPS location"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-60"
          >
            <LocateFixed size={14} className={loc.locating ? 'animate-pulse' : ''} />
            {loc.locating ? 'Locating…' : 'Use my location'}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            title="Reload live analytics"
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-60"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* GPS blocked/failed → loud banner + type-your-city fallback that
          replaces the Default location with the real one. */}
      {loc.error && (
        <div className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
          {loc.error}
        </div>
      )}
      {(loc.error || loc.source !== 'gps') && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void applyCity(); }}
                placeholder="Type your city instead — e.g. Ranchi"
                aria-label="Set location by city name"
                className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-line bg-card outline-none focus:border-brand"
              />
            </div>
            <button
              onClick={() => void applyCity()}
              disabled={citySearching || !city.trim()}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-50 shrink-0"
            >
              {citySearching ? 'Finding…' : 'Set location'}
            </button>
          </div>
          {cityError && <p className="text-[11px] font-semibold text-brand">{cityError}</p>}
        </div>
      )}

      {loading && !hasData && <BrandLoader fullScreen={false} />}
      {error && !hasData && (
        <div className="flex items-center justify-between gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
          <span className="whitespace-pre-line">{error}</span>
          <button onClick={refresh} className="shrink-0 underline">
            Retry
          </button>
        </div>
      )}
      {hasData && (
        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
          <AnalyticsCharts />
        </div>
      )}
    </div>
  );
}
