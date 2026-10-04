import {
  Droplets,
  Eye,
  Gauge,
  Navigation,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
} from 'lucide-react';
import type { WeatherDay } from '../../services/weatherService';
import WeatherIcon from './WeatherIcon';

/** HH:MM local time for a unix timestamp + location timezone offset. */
function sunTime(unix: number, tzOffset: number): string {
  return new Date((unix + tzOffset) * 1000).toISOString().slice(11, 16);
}

/** "2026-10-04" -> "4 Oct 2026" (falls back to the raw value if invalid). */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 bg-canvas border border-line rounded-xl px-3 py-2">
      <span className="text-mute shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-mute leading-none">{label}</span>
        <span className="block text-sm font-bold text-ink mt-1 leading-none truncate">{value}</span>
      </span>
    </div>
  );
}

export default function ForecastCard({
  day,
  timezoneOffset,
  highlight = false,
}: {
  day: WeatherDay;
  timezoneOffset: number;
  highlight?: boolean;
}) {
  return (
    <article
      className={`bg-card border rounded-2xl p-5 shadow-sm flex flex-col ${
        highlight ? 'border-brand ring-1 ring-brand/30' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-extrabold text-base flex items-center gap-2">
            {day.label}
            {highlight && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand uppercase tracking-wide">
                Live
              </span>
            )}
          </p>
          <p className="text-xs font-semibold text-mute mt-0.5">
            {day.weekday} · {formatDate(day.date)}
          </p>
        </div>
        <WeatherIcon icon={day.icon} condition={day.condition} size={64} />
      </div>

      <p className="text-sm font-bold text-soft mt-1">{day.condition}</p>
      <p className="text-4xl font-extrabold mt-1 tracking-tight">
        {Math.round(day.temperature)}°C
      </p>
      <p className="text-xs font-semibold text-soft mt-1">
        Feels like {Math.round(day.feelsLike)}°C · Min {Math.round(day.min)}°C / Max{' '}
        {Math.round(day.max)}°C
      </p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Detail icon={<Droplets size={15} />} label="Humidity" value={`${day.humidity}%`} />
        <Detail
          icon={<Wind size={15} />}
          label="Wind"
          value={`${day.windSpeedKmh} km/h ${day.windDirection}`}
        />
        <Detail icon={<Gauge size={15} />} label="Pressure" value={`${day.pressure} hPa`} />
        <Detail
          icon={<Eye size={15} />}
          label="Visibility"
          value={`${(day.visibility / 1000).toFixed(1)} km`}
        />
        <Detail icon={<Umbrella size={15} />} label="Rain chance" value={`${day.rainChance}%`} />
        <Detail
          icon={<Navigation size={15} />}
          label="Wind direction"
          value={`${day.windDirection} · ${day.windDeg}°`}
        />
        <Detail
          icon={<Thermometer size={15} />}
          label="Feels like"
          value={`${Math.round(day.feelsLike)}°C`}
        />
        {day.sunrise !== null && day.sunset !== null ? (
          <Detail
            icon={
              <span className="flex gap-1">
                <Sunrise size={15} />
                <Sunset size={15} />
              </span>
            }
            label="Sunrise / Sunset"
            value={`${sunTime(day.sunrise, timezoneOffset)} / ${sunTime(day.sunset, timezoneOffset)}`}
          />
        ) : (
          <Detail icon={<Sunrise size={15} />} label="Range" value={`${Math.round(day.min)}° / ${Math.round(day.max)}°`} />
        )}
      </div>
    </article>
  );
}

export function ThreeDayForecast({
  forecast,
  timezoneOffset,
}: {
  forecast: WeatherDay[];
  timezoneOffset: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {forecast.map((day) => (
        <ForecastCard
          key={`${day.label}-${day.date}`}
          day={day}
          timezoneOffset={timezoneOffset}
          highlight={day.label === 'Today'}
        />
      ))}
    </div>
  );
}
