import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';
import WeatherIcon from './WeatherIcon';

/** Compact live-weather card for the Home page. Links to /weather. */
export default function WeatherPreviewCard() {
  const navigate = useNavigate();
  const { location, forecast, loading, error } = useWeather();

  const today = forecast[0];

  return (
    <section className="gs-in mt-4 bg-card border border-line rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {today ? (
            <WeatherIcon icon={today.icon} condition={today.condition} size={52} />
          ) : (
            <div className="h-[52px] w-[52px] rounded-full bg-canvas border border-line animate-pulse" />
          )}
          <div className="min-w-0">
            {loading && !today ? (
              <>
                <div className="h-7 w-24 rounded bg-line animate-pulse" />
                <div className="h-3 w-32 rounded bg-line animate-pulse mt-2" />
              </>
            ) : today && location ? (
              <>
                <p className="text-2xl font-extrabold leading-none">
                  {Math.round(today.temperature)}°C
                </p>
                <p className="text-xs font-semibold text-soft mt-1 truncate">
                  {today.condition} · Min {Math.round(today.min)}° / Max {Math.round(today.max)}°
                </p>
              </>
            ) : (
              <p className="text-sm font-bold text-soft">
                {error ?? 'Weather unavailable'}
              </p>
            )}
            <p className="text-[11px] font-bold text-mute mt-1 flex items-center gap-1">
              <MapPin size={12} />
              {location ? `${location.city}${location.country ? `, ${location.country}` : ''}` : 'Locating…'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/weather')}
          className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm shrink-0"
        >
          View Full Forecast <ArrowRight size={15} />
        </button>
      </div>

      {forecast.length === 3 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {forecast.map((d) => (
            <button
              key={`${d.label}-${d.date}`}
              onClick={() => navigate('/weather')}
              className="bg-canvas border border-line rounded-xl px-2 py-2.5 text-center hover:border-brand transition-colors"
            >
              <p className="text-[11px] font-extrabold text-soft truncate">{d.label}</p>
              <div className="flex justify-center -my-1">
                <WeatherIcon icon={d.icon} condition={d.condition} size={40} />
              </div>
              <p className="text-sm font-extrabold leading-none">{Math.round(d.temperature)}°</p>
              <p className="text-[10px] font-semibold text-mute mt-1">
                {Math.round(d.min)}° / {Math.round(d.max)}°
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
