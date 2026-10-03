import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Card from '../common/Card';
import { useAppSelector } from '../../store/hooks';

export default function AnalyticsCharts() {
  const { water, heat, trend } = useAppSelector((s) => s.analytics);
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="gs-in p-4 sm:p-5 min-w-0 overflow-hidden">
        <h3 className="font-bold mb-4">Water / Flood Risk by Area</h3>
        <div className="h-52 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={water} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis type="number" fontSize={11} />
              <YAxis type="category" dataKey="area" fontSize={11} width={80} tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 10)}…` : v)} />
              <Tooltip />
              <Bar dataKey="level" fill="var(--blue)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="gs-in p-4 sm:p-5 min-w-0 overflow-hidden">
        <h3 className="font-bold mb-4">Heat Risk (24h curve)</h3>
        <div className="h-52 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={heat}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="hour" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="temp" stroke="var(--brand-warm)" fill="var(--brand-warm)" fillOpacity={0.25} strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="gs-in p-4 sm:p-5 md:col-span-2 min-w-0 overflow-hidden">
        <h3 className="font-bold mb-4">Resolution Performance</h3>
        <div className="h-52 sm:h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar dataKey="incidents" fill="var(--brand)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="resolved" fill="var(--green)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
