import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LocateFixed, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { ThreeDayForecast } from '../components/weather/ForecastCard';
import TemperatureTrend from '../components/weather/TemperatureTrend';
import { WeatherError, WeatherSkeleton } from '../components/weather/WeatherStates';
import WeatherRiskCard from '../components/weather/WeatherRiskCard';
import WeatherSearch from '../components/weather/WeatherSearch';
import { useWeather } from '../hooks/useWeather';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { useAppDispatch } from '../store/hooks';
import { fetchWeather } from '../store/slices/weatherSlice';

function lastUpdatedLabel(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WeatherPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    location,
    timezoneOffset,
    forecast,
    loading,
    error,
    lastUpdated,
    searchCity,
    refresh,
  } = useWeather();
  const loc = useLiveLocation();
  // Manual city search wins — stop auto-applying live coords after it.
  const userSearched = useRef(false);
  // Set on explicit "Live Location" taps so the next GPS/IP fix forces a
  // weather fetch even when it is within ~5km of the displayed city.
  const liveRequested = useRef(false);

  // Dynamic weather: when live GPS/IP coords arrive, load weather for them
  // instead of staying stuck on the default city. Runs once per fix —
  // no interval, no focus listener (auto-refresh was removed on purpose).
  useEffect(() => {
    if (loc.locating || loading) return;
    if (loc.source !== 'gps' && loc.source !== 'ip') return;
    if (userSearched.current && !liveRequested.current) return;
    const cur = location;
    const close =
      !!cur &&
      Math.abs(cur.latitude - loc.lat) < 0.05 &&
      Math.abs(cur.longitude - loc.lon) < 0.05;
    // Skip silent near-identical fixes, but always honour an explicit tap.
    if (close && !liveRequested.current) return;
    liveRequested.current = false;
    dispatch(fetchWeather({ lat: loc.lat, lon: loc.lon, refresh: close }));
  }, [dispatch, loc.lat, loc.lon, loc.source, loc.locating, loading, location]);

  const handleSearch = (city: string) => {
    userSearched.current = true;
    searchCity(city);
  };

  const goLive = () => {
    userSearched.current = false;
    liveRequested.current = true;
    loc.retryGps();
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between px-3 sm:px-5 md:px-10 h-16 border-b border-line bg-cream sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 min-w-0 text-left"
          title="Back to Home"
        >
          <ShieldCheck size={26} className="text-brand shrink-0" />
          <span className="min-w-0">
            <span className="block font-extrabold leading-none truncate">UrbanShieldAI</span>
            <span className="block text-[11px] text-mute">3-Day Weather</span>
          </span>
        </button>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand"
        >
          <ArrowLeft size={15} /> Home
        </button>
      </header>

      <main className="px-5 md:px-10 py-8 md:py-12 max-w-5xl mx-auto">
        {/* Location header + actions */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-extrabold flex items-center gap-2 flex-wrap">
                <MapPin size={24} className="text-brand shrink-0" />
                {location ? (
                  <span className="truncate">
                    {location.city}
                    {location.country && (
                      <span className="text-soft font-bold">, {location.country}</span>
                    )}
                  </span>
                ) : (
                  'Weather Forecast'
                )}
              </h1>
              <p className="text-xs font-semibold text-mute mt-1 flex items-center gap-1.5 flex-wrap">
                {location ? (
                  <span>{`Lat ${location.latitude} · Lon ${location.longitude}`}</span>
                ) : (
                  <span>Live 3-day outlook powered by OpenWeatherMap</span>
                )}
                {(loc.source === 'gps' || loc.source === 'ip') && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wide">
                    {loc.source === 'gps' ? 'GPS live' : 'IP location'}
                  </span>
                )}
                {(loc.source === 'default' || loc.source === 'city') && location && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-canvas border border-line text-mute uppercase tracking-wide">
                    Default city — tap Live Location or search your city
                  </span>
                )}
                {lastUpdated && <span>· Last updated {lastUpdatedLabel(lastUpdated)}</span>}
              </p>
              {loc.error && (
                <p className="text-[11px] font-semibold text-brand mt-1">{loc.error}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <WeatherSearch loading={loading} onSearch={handleSearch} />
              <button
                onClick={goLive}
                disabled={loc.locating}
                title="Load weather for my live location"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-50 shrink-0"
              >
                <LocateFixed size={15} className={loc.locating ? 'animate-pulse' : ''} />
                {loc.locating ? 'Locating…' : 'Live Location'}
              </button>
              <button
                onClick={refresh}
                disabled={loading}
                title="Refresh weather"
                className="inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-50 shrink-0"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                Refresh Weather
              </button>
            </div>
          </div>
        </div>

        {/* Content states */}
        <div className="mt-6">
          {loading && forecast.length === 0 && <WeatherSkeleton />}
          {error && forecast.length === 0 && (
            <WeatherError message={error} onRetry={refresh} loading={loading} />
          )}
          {forecast.length > 0 && (
            <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
              <ThreeDayForecast forecast={forecast} timezoneOffset={timezoneOffset} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <WeatherRiskCard today={forecast[forecast.length - 1]!} />
                <TemperatureTrend forecast={forecast} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
