import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../common/Card';

export default function RiskPie({ data }: { data: { name: string; value: number; color: string }[] }) {
  return (
    <Card className="gs-in p-5">
      <h3 className="font-bold mb-4">Risk Distribution</h3>
      <div className="h-56 sm:h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius="80%" labelLine={false}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
