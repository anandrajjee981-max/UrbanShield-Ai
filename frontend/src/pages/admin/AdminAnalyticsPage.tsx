import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminIssues, fetchAuthorityApplications } from '../../store/slices/adminSlice';
import { ErrorState, PageHeader, SkeletonCard, inputCls } from '../../components/admin/ui';

const PIE_COLORS = ['#16a34a', '#f59e0b', '#ea580c', '#dc2626', '#2563eb', '#64748b'];

/** /admin/analytics — every chart is derived from live API data. */
export default function AdminAnalyticsPage() {
  const dispatch = useAppDispatch();
  const { issues, applications, issuesFetch, applicationsFetch } = useAppSelector((s) => s.admin);
  const [range, setRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    dispatch(fetchAdminIssues({ limit: 100 }));
    dispatch(fetchAuthorityApplications({ limit: 100 }));
  }, [dispatch]);

  const reload = () => {
    dispatch(fetchAdminIssues({ limit: 100 }));
    dispatch(fetchAuthorityApplications({ limit: 100 }));
  };

  const loading = (issuesFetch.loading && issues.length === 0) || (applicationsFetch.loading && applications.length === 0);
  const error = issuesFetch.error ?? applicationsFetch.error;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => map.set(i.issueType, (map.get(i.issueType) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [issues]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    issues.forEach((i) => map.set(i.status, (map.get(i.status) ?? 0) + 1));
    return [...map.entries()].map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [issues]);

  const overTime = useMemo(() => {
    const days = Number(range);
    const buckets = new Map<string, number>();
    const now = new Date();
    for (let d = days - 1; d >= 0; d--) {
      const dt = new Date(now);
      dt.setDate(now.getDate() - d);
      buckets.set(dt.toISOString().slice(0, 10), 0);
    }
    issues.forEach((i) => {
      const day = new Date(i.createdAt).toISOString().slice(0, 10);
      if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
    });
    // Downsample to ~14 points for the 90-day view.
    const entries = [...buckets.entries()];
    const step = entries.length > 20 ? Math.ceil(entries.length / 14) : 1;
    return entries
      .filter((_, idx) => idx % step === 0)
      .map(([date, count]) => ({ date: date.slice(5), issues: count }));
  }, [issues, range]);

  const appByStatus = useMemo(() => {
    const counts = { PENDING: 0, VERIFIED: 0, REJECTED: 0 };
    applications.forEach((a) => {
      counts[a.verificationStatus] = (counts[a.verificationStatus] ?? 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applications]);

  const card = 'bg-card border border-line rounded-2xl p-4';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Analytics"
        subtitle="Operational trends computed from live monitoring data."
        actions={
          <select value={range} onChange={(e) => setRange(e.target.value as typeof range)} className={`${inputCls} !w-auto`} aria-label="Date range">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        }
      />

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} lines={6} />
          ))}
        </div>
      ) : error && issues.length === 0 ? (
        <ErrorState title="Unable to load analytics." onRetry={reload} />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className={card}>
            <h2 className="font-extrabold text-sm text-ink mb-1">Issues by Category</h2>
            <p className="text-[11px] text-mute mb-3">Live counts from the monitoring queue.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory} margin={{ top: 4, right: 8, left: -12, bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d9b5" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f84424" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={card}>
            <h2 className="font-extrabold text-sm text-ink mb-1">Issues by Status</h2>
            <p className="text-[11px] text-mute mb-3">Lifecycle distribution across the city.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={52} outerRadius={88} paddingAngle={2}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${card} md:col-span-2`}>
            <h2 className="font-extrabold text-sm text-ink mb-1">Issues Over Time</h2>
            <p className="text-[11px] text-mute mb-3">Reported issues per day in the selected range.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overTime} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d9b5" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="issues" stroke="#f84424" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${card} md:col-span-2`}>
            <h2 className="font-extrabold text-sm text-ink mb-1">Authority Applications</h2>
            <p className="text-[11px] text-mute mb-3">Pending, verified and rejected outcomes.</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appByStatus} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8d9b5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {appByStatus.map((e) => (
                      <Cell
                        key={e.name}
                        fill={e.name === 'VERIFIED' ? '#51933a' : e.name === 'PENDING' ? '#f7b907' : '#f84424'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
