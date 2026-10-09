import { CloudRain, Droplets, ShieldAlert, Thermometer, Wind } from 'lucide-react';
import type { AiForecastConfidence, AiForecastDay } from '../../services/aiAssistant';

const CONFIDENCE_BADGE: Record<AiForecastConfidence, string> = {
  HIGH: 'bg-brand-soft text-brand',
  MEDIUM: 'bg-canvas text-soft',
  LOW: 'bg-canvas text-mute',
  UNAVAILABLE: 'bg-canvas text-mute',
};

const formatDay = (date: string): string => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string | null;
}) {
  if (value === null) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-soft" title={label}>
      <Icon size={12} className="text-brand" aria-hidden />
      {value}
    </span>
  );
}

/** One day of the assistant's 3-day civic forecast. Reads existing design tokens only. */
function ForecastDayCard({ day }: { day: AiForecastDay }) {
  const weather = day.weather;
  const tempRange =
    weather && weather.temperatureMinC !== null && weather.temperatureMaxC !== null
      ? `${Math.round(weather.temperatureMinC)}–${Math.round(weather.temperatureMaxC)}°C`
      : null;

  return (
    <article className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-extrabold text-ink">{formatDay(day.date)}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${CONFIDENCE_BADGE[day.confidence]}`}
        >
          {day.confidence}
        </span>
      </div>

      {weather && (
        <p className="mt-1 text-[12px] font-semibold text-soft">{weather.condition}</p>
      )}

      {weather && (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          <Stat icon={Thermometer} label="Temperature range" value={tempRange} />
          <Stat
            icon={Droplets}
            label="Chance of precipitation"
            value={weather.precipitationChance !== null ? `${weather.precipitationChance}%` : null}
          />
          <Stat
            icon={Wind}
            label="Max wind"
            value={weather.windMaxKph !== null ? `${Math.round(weather.windMaxKph)} km/h` : null}
          />
        </div>
      )}

      {day.summary && <p className="mt-2 text-[12px] text-soft">{day.summary}</p>}

      {day.risks.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-mute">
            <ShieldAlert size={11} className="text-brand" aria-hidden />
            Risks
          </p>
          <ul className="flex flex-wrap gap-1">
            {day.risks.map((risk) => (
              <li key={risk} className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand">
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {day.precautions.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {day.precautions.map((item) => (
            <li key={item} className="flex gap-1.5 text-[11px] text-soft">
              <span className="text-brand">•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

/** The 3-day forecast block rendered inside an assistant message. */
export default function AISearchForecast({ days, location }: { days: AiForecastDay[]; location: string | null }) {
  if (days.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-mute">
        <CloudRain size={12} className="text-brand" aria-hidden />
        3-day civic forecast{location ? ` · ${location}` : ''}
      </p>
      {days.map((day) => (
        <ForecastDayCard key={day.date} day={day} />
      ))}
    </div>
  );
}
