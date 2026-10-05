import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchReports } from '../store/slices/reportsSlice';
import KpiCard from '../components/dashboard/KpiCard';
import WorkflowBanner from '../components/dashboard/WorkflowBanner';
import TrendChart from '../components/dashboard/TrendChart';
import RiskPie from '../components/dashboard/RiskPie';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { citizenReportFields, matchesQuery } from '../utils/issueSearch';
import type { DashboardKpi } from '../types';

const DAY = 86400000;
const CATEGORY_COLORS: Record<string, string> = {
  flood: '#4482ea',
  heat: '#f36d24',
  fire: '#f84424',
  air: '#8a7f63',
  infrastructure: '#fb9c47',
  medical: '#51933a',
};

function dayKey(t: number): string {
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** % change of this 7-day window vs the prior one — pure arithmetic on real data. */
function wowChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * Citizen overview computed entirely from the citizen's own backend issues
 * (GET /api/issues/my). No city-wide stats endpoint exists, so every number
 * here is personal-scope and labelled as such.
 */
export default function Dashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, loading } = useAppSelector((s) => s.reports);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  useGsapEntrance('.gs-in', [items.length]);

  useEffect(() => { dispatch(fetchReports()); }, [dispatch]);

  const stats = useMemo(() => {
    const now = Date.now();
    const inWin = (iso: string, from: number, to: number) => {
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t >= from && t < to;
    };
    const curr = items.filter((r) => inWin(r.createdAt, now - 7 * DAY, now)).length;
    const prev = items.filter((r) => inWin(r.createdAt, now - 14 * DAY, now - 7 * DAY)).length;
    const total = items.length;
    const pending = items.filter((r) => r.rawStatus === 'REPORTED').length;
    const inProgress = items.filter((r) => r.rawStatus === 'VERIFIED' || r.rawStatus === 'ASSIGNED' || r.rawStatus === 'IN_PROGRESS').length;
    const resolved = items.filter((r) => r.rawStatus === 'RESOLVED').length;
    const resCurr = items.filter((r) => r.resolvedAt && inWin(r.resolvedAt, now - 7 * DAY, now)).length;
    const resPrev = items.filter((r) => r.resolvedAt && inWin(r.resolvedAt, now - 14 * DAY, now - 7 * DAY)).length;

    const days = Array.from({ length: 7 }, (_, i) => {
      const start = new Date(now - (6 - i) * DAY);
      start.setHours(0, 0, 0, 0);
      const end = start.getTime() + DAY;
      const submitted = items.filter((r) => inWin(r.createdAt, start.getTime(), end)).length;
      const done = items.filter((r) => r.resolvedAt && inWin(r.resolvedAt, start.getTime(), end)).length;
      const cumulative = items.filter((r) => new Date(r.createdAt).getTime() < end).length;
      return { date: dayKey(start.getTime()), incidents: submitted, resolved: done, reports: cumulative };
    });

    const byCat = new Map<string, number>();
    items.forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + 1));
    const distribution = [...byCat.entries()].map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: CATEGORY_COLORS[name] ?? '#8a7f63',
    }));

    const kpis: (DashboardKpi & { hint: string })[] = [
      { id: 'total', label: 'My Reports', value: total, delta: wowChange(curr, prev), hint: 'vs prior 7 days' },
      { id: 'pending', label: 'Pending Review', value: pending, delta: 0, hint: 'current snapshot' },
      { id: 'progress', label: 'In Progress', value: inProgress, delta: 0, hint: 'current snapshot' },
      { id: 'resolved', label: 'Resolved', value: resolved, delta: wowChange(resCurr, resPrev), hint: 'vs prior 7 days' },
    ];
    return { kpis, trend: days, distribution };
  }, [items]);

  const q = globalSearch.trim();
  const visible = items.filter((r) => matchesQuery(globalSearch, citizenReportFields(r))).slice(0, 6);

  if (loading && items.length === 0) return <Loader label="Loading your overview…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">My Impact Overview</h1>
        <p className="text-xs sm:text-sm text-mute">Your reports, live from the backend · response progress as authorities act</p>
      </div>
      <WorkflowBanner role={role} />
      {items.length === 0 && !loading ? (
        <div className="border border-dashed border-line rounded-2xl p-8 md:p-12 text-center">
          <p className="text-base font-extrabold">No reports yet</p>
          <p className="text-sm text-soft mt-1.5">File your first issue to see live stats here.</p>
          <button onClick={() => navigate('/reports')} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
            Go to Reports <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {stats.kpis.map((k) => <KpiCard key={k.id} kpi={k} hint={k.hint} />)}
          </div>
          <div className="grid xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2"><TrendChart data={stats.trend} /></div>
            <RiskPie data={stats.distribution} />
          </div>
        </>
      )}
      <div>
        <h2 className="font-bold mb-2">Latest reports{q && ` — matching “${q}”`}</h2>
        {visible.length === 0 ? (
          <p className="text-sm text-mute">No reports match the current search.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map((r) => (
              <button key={r.id} onClick={() => navigate('/reports')}
                className="gs-in text-left bg-card border border-line rounded-2xl shadow-sm p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand/40">
                <p className="font-bold text-sm line-clamp-2 break-words">{r.title}</p>
                <p className="text-[11px] font-mono text-mute mt-0.5">#{r.id.slice(0, 8).toUpperCase()} · {r.rawStatus?.replace(/_/g, ' ') ?? r.status}</p>
                <span className="flex items-center gap-1.5 mt-2 text-[11px] text-mute min-w-0">
                  <MapPin size={12} className="shrink-0 text-brand" />
                  <span className="truncate font-semibold">{r.address}</span>
                </span>
                <span className="flex items-center gap-1.5 mt-1 text-[11px] text-mute">
                  <Clock size={12} className="shrink-0" />
                  <span className="font-semibold">{new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
