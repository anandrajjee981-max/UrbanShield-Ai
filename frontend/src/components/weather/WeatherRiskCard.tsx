import { Droplets, Thermometer, Umbrella, Wind } from 'lucide-react';
import type { WeatherDay } from '../../services/weatherService';
import { assessWeatherRisk, type RiskLevel } from './weatherRiskConfig';

const badge: Record<RiskLevel, string> = {
  Low: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  Moderate: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  High: 'bg-brand/10 text-brand border-brand/30',
};

function RiskRow({
  icon,
  label,
  value,
  level,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  level: RiskLevel;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-canvas border border-line rounded-xl px-4 py-3">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="text-mute shrink-0">{icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-ink">{label}</span>
          <span className="block text-[11px] font-semibold text-mute">{value}</span>
        </span>
      </span>
      <span
        className={`text-xs font-extrabold px-3 py-1 rounded-full border shrink-0 ${badge[level]}`}
      >
        {level}
      </span>
    </div>
  );
}

/** UrbanShieldAI risk summary derived from today's live weather values. */
export default function WeatherRiskCard({ today }: { today: WeatherDay }) {
  const risks = assessWeatherRisk(today);

  return (
    <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
      <h2 className="font-extrabold">Weather Risk</h2>
      <p className="text-xs text-mute mt-0.5">
        Assessed from today&apos;s live readings in {today.label.toLowerCase()} conditions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
        <RiskRow
          icon={<Thermometer size={16} />}
          label="Heat Risk"
          value={`${Math.round(Math.max(today.temperature, today.max))}°C observed`}
          level={risks.heat}
        />
        <RiskRow
          icon={<Umbrella size={16} />}
          label="Rain Risk"
          value={`${today.rainChance}% chance of rain`}
          level={risks.rain}
        />
        <RiskRow
          icon={<Wind size={16} />}
          label="Wind Risk"
          value={`${today.windSpeedKmh} km/h ${today.windDirection}`}
          level={risks.wind}
        />
        <RiskRow
          icon={<Droplets size={16} />}
          label="Humidity Level"
          value={`${today.humidity}% humidity`}
          level={risks.humidity}
        />
      </div>
    </section>
  );
}
