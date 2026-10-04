import { useEffect, useMemo } from 'react';
import { LocateFixed, MapPin, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchLiveAnalytics } from '../store/slices/analyticsSlice';
import { fetchReports } from '../store/slices/reportsSlice';
import { fetchBrowseReports } from '../store/slices/workflowSlice';
import { useLiveLocation } from '../hooks/useLiveLocation';
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
                    {source === 'gps' ? 'GPS live' : source === 'city' ? 'City' : 'Default'}
                  </span>
                )}
              </>
            )}
          </p>
          {loc.error && <p className="text-[11px] text-mute mt-1">{loc.error}</p>}
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
