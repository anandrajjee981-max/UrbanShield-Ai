import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { ThreeDayForecast } from '../components/weather/ForecastCard';
import TemperatureTrend from '../components/weather/TemperatureTrend';
import { WeatherError, WeatherSkeleton } from '../components/weather/WeatherStates';
import WeatherRiskCard from '../components/weather/WeatherRiskCard';
import WeatherSearch from '../components/weather/WeatherSearch';
import { useWeather } from '../hooks/useWeather';

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
              <p className="text-xs font-semibold text-mute mt-1">
                {location
                  ? `Lat ${location.latitude} · Lon ${location.longitude}`
                  : 'Live 3-day outlook powered by OpenWeatherMap'}
                {lastUpdated && ` · Last updated ${lastUpdatedLabel(lastUpdated)}`}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <WeatherSearch loading={loading} onSearch={searchCity} />
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
                <WeatherRiskCard today={forecast[0]!} />
                <TemperatureTrend forecast={forecast} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
