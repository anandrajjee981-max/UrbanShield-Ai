import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { ChartCard } from './badges';
import { EmptyState } from '../ui';
import { overviewTokens } from './tokens';
import type { AdminMonitoredIssue } from '../../../services/admin.service';

/** Donut: live issues grouped by category. */
export function CategoryDonut({ issues }: { issues: AdminMonitoredIssue[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => map.set(i.issueType, (map.get(i.issueType) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [issues]);

  return (
    <ChartCard
      title="Issues by Category"
      sub="Live counts from the monitoring queue."
      action={
        <Link to="/admin/issues" className="text-xs font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded">
          View all →
        </Link>
      }
    >
      {data.length === 0 ? (
        <EmptyState title="No issues yet." hint="Category breakdown appears once reports arrive." />
      ) : (
        <div className="h-56" role="img" aria-label={`Issues by category: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={overviewTokens.chart.categories[i % overviewTokens.chart.categories.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
