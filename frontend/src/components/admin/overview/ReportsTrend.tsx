import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard } from './badges';
import { EmptyState } from '../ui';
import { bucketByDay } from './overviewStats';
import { overviewTokens } from './tokens';
import type { AdminMonitoredIssue } from '../../../services/admin.service';

/** Line chart: reports per day over the selected range (live data only). */
export function ReportsTrend({
  issues,
  range,
  onRange,
}: {
  issues: AdminMonitoredIssue[];
  range: 7 | 30;
  onRange: (r: 7 | 30) => void;
}) {
  const data = useMemo(() => {
    const buckets = bucketByDay(
      issues.map((i) => i.createdAt),
      range,
    );
    // Downsample 30-day view to ~15 points so labels stay readable.
    const step = buckets.length > 20 ? Math.ceil(buckets.length / 15) : 1;
    return buckets
      .filter((_, idx) => idx % step === 0)
      .map((b) => ({ date: b.label, reports: b.count }));
  }, [issues, range]);

  const total = data.reduce((n, d) => n + d.reports, 0);

  return (
    <ChartCard
      title="Reports Over Time"
      sub={`${total} reports in the last ${range} days.`}
      action={
        <div className="flex gap-1 p-0.5 rounded-xl bg-canvas border border-line" role="group" aria-label="Date range">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRange(r)}
              aria-pressed={range === r}
              className={`text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                range === r ? 'bg-brand text-white' : 'text-soft hover:text-ink'
              }`}
            >
              {r}D
            </button>
          ))}
        </div>
      }
    >
      {total === 0 ? (
        <EmptyState title="No reports in this range." hint="Try the 30-day view." />
      ) : (
        <div className="h-56" role="img" aria-label={`Reports per day, ${total} total in last ${range} days`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={overviewTokens.chart.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="reports"
                stroke={overviewTokens.chart.trendStroke}
                strokeWidth={2.5}
                dot={false}
                fill={overviewTokens.chart.trendFill}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
