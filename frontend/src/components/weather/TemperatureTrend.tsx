import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeatherDay } from '../../services/weatherService';

/** Min/max temperature trend across the 3-day window (real API data). */
export default function TemperatureTrend({ forecast }: { forecast: WeatherDay[] }) {
  const data = forecast.map((d) => ({
    day: d.label,
    Min: Math.round(d.min),
    Max: Math.round(d.max),
  }));

  return (
    <section className="bg-card border border-line rounded-2xl p-5 shadow-sm">
      <h2 className="font-extrabold">Temperature Trend</h2>
      <p className="text-xs text-mute mt-0.5 mb-4">
        Today → Next 2 days · °C
      </p>
      <div className="h-56 sm:h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="day" fontSize={11} tickMargin={6} interval={0} />
            <YAxis fontSize={11} width={40} unit="°" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Max"
              stroke="var(--brand)"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Min"
              stroke="var(--blue)"
              strokeWidth={2.5}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
