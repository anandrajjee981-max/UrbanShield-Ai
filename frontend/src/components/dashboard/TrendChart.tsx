import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';

export default function TrendChart({ data }: { data: { date: string; incidents: number; resolved: number; reports: number }[] }) {
  return (
    <Card className="gs-in p-5">
      <h3 className="font-bold mb-1">Incident Trends (7 days)</h3>
      <p className="text-xs text-mute mb-4">Incidents vs resolved vs citizen reports</p>
      <div className="h-56 sm:h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
            <XAxis dataKey="date" fontSize={11} interval="preserveStartEnd" tickMargin={6} />
            <YAxis fontSize={11} width={36} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="incidents" stroke="var(--brand)" strokeWidth={2.5} />
            <Line type="monotone" dataKey="resolved" stroke="var(--green)" strokeWidth={2.5} />
            <Line type="monotone" dataKey="reports" stroke="var(--amber)" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
