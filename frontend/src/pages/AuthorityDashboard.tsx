import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Bot, Briefcase, CheckCircle2, FileText,
  MapPin, Navigation, RefreshCw,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBrowseReports, fetchMyTasks } from '../store/slices/workflowSlice';
import { setGlobalSearch } from '../store/slices/uiSlice';
import { backendIssueToIncident } from '../store/slices/incidentsSlice';
import { useWeather } from '../hooks/useWeather';
import { useLiveLocation } from '../hooks/useLiveLocation';
import { assessWeatherRisk, type RiskLevel } from '../components/weather/weatherRiskConfig';
import WeatherIcon from '../components/weather/WeatherIcon';
import AuthorityAnalytics from '../components/dashboard/AuthorityAnalytics';
import type { BackendAdminIssue, BackendSafeIssue } from '../services/api';
import type { Incident } from '../types';
import { timeAgo } from '../utils/format';

const CityMap = lazy(() => import('../components/map/CityMap'));

const riskBadge: Record<RiskLevel, string> = {
  Low: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  Moderate: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  High: 'bg-brand/10 text-brand border-brand/30',
};

const SEV_RANK: Record<Incident['severity'], number> = { critical: 3, high: 2, medium: 1, low: 0 };
const SEV_DOT: Record<Incident['severity'], string> = {
  critical: 'bg-brand', high: 'bg-brand-warm', medium: 'bg-civic-amber', low: 'bg-civic-green',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Section heading — typography + whitespace do the separation, not boxes. */
function SectionHead({ eyebrow, title, sub, action }: {
  eyebrow?: string; title: string; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
        )}
        <h2 className="text-lg sm:text-xl font-extrabold mt-1">{title}</h2>
        {sub && <p className="text-xs sm:text-sm text-mute mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 py-1" aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-line animate-pulse" style={{ width: `${94 - i * 14}%` }} />
      ))}
    </div>
  );
}

interface ActivityEvent { at: string; text: string; kind: 'report' | 'verify' | 'assign' | 'start' | 'resolve' | 'reject'; id: string; }

/** Real activity trail assembled from backend timestamps on city reports. */
function buildActivity(browse: BackendAdminIssue[]): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  const short = (d: string) => (d.length > 56 ? `${d.slice(0, 56)}…` : d);
  for (const b of browse) {
    events.push({ at: b.createdAt, text: `Citizen report submitted — ${short(b.description)}`, kind: 'report', id: b.id });
    if (b.verifiedAt) events.push({ at: b.verifiedAt, text: `Report accepted at review — ${short(b.description)}`, kind: 'verify', id: b.id });
    if (b.assignedAt) events.push({ at: b.assignedAt, text: `Task assigned${b.assignee ? ` to ${b.assignee.name}` : ''}`, kind: 'assign', id: b.id });
    if (b.startedAt) events.push({ at: b.startedAt, text: `Field work started — ${short(b.description)}`, kind: 'start', id: b.id });
    if (b.resolvedAt) events.push({ at: b.resolvedAt, text: `Incident resolved — ${short(b.description)}`, kind: 'resolve', id: b.id });
    if (b.rejectedAt) events.push({ at: b.rejectedAt, text: `Report rejected${b.rejectionReason ? ` — ${b.rejectionReason}` : ''}`, kind: 'reject', id: b.id });
  }
  return events
    .filter((e) => !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 7);
}

const activityIcon: Record<ActivityEvent['kind'], typeof FileText> = {
  report: FileText, verify: CheckCircle2, assign: Briefcase, start: Navigation, resolve: CheckCircle2, reject: AlertTriangle,
};

interface QueueItem {
  key: string;
  severity: Incident['severity'];
  at: string;
  title: string;
  sub: string;
  action: string;
  status: string;
  run: () => void;
  pulse: boolean;
}

/**
 * AUTHORITY home (/authority) — city operations command center.
 * One data story: hero status → prioritized queue → map → pipeline →
 * intelligence → activity. Every value is live backend state (assigned
 * tasks, all city reports, weather). No mock data anywhere on this page.
 */
export default function AuthorityDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { tasks, tasksLoading, browse, browseLoading, error: workflowError } = useAppSelector((s) => s.workflow);
  const user = useAppSelector((s) => s.auth.user);
  const firstName = (user?.name ?? 'Officer').split(' ')[0];
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loc = useLiveLocation();
  const [recenterKey] = useState(0);
  const { location: weatherLoc, forecast, loading: weatherLoading, error: weatherError, refresh: refreshWeather } = useWeather();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([dispatch(fetchMyTasks()), dispatch(fetchBrowseReports())]);
    setRefreshedAt(new Date().toISOString());
    setRefreshing(false);
  }, [dispatch]);

  useEffect(() => { void refresh(); }, [refresh]);

  // ── Live city picture (all real) ──
  const incidents = useMemo(
    () => browse.filter((b) => b.status !== 'REJECTED').map((b) => backendIssueToIncident(b, b.citizen.name)),
    [browse],
  );
  const byId = useMemo(() => new Map(browse.map((b) => [b.id, b])), [browse]);
  const active = useMemo(() => incidents.filter((i) => i.status !== 'resolved'), [incidents]);
  const criticalCount = active.filter((i) => i.severity === 'critical').length;
  const pendingCount = browse.filter((b) => b.status === 'REPORTED').length;
  const myActive = tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS');

  const cityState = criticalCount > 0
    ? { word: 'CRITICAL', cls: 'text-brand' }
    : active.length > 0
      ? { word: 'ELEVATED', cls: 'text-brand-warm' }
      : { word: 'STABLE', cls: 'text-civic-green' };

  // Unified queue: critical → assigned work → high → everything else actionable.
  const queue: QueueItem[] = useMemo(() => {
    const out: QueueItem[] = [];
    const sorted = [...active].sort(
      (a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || +new Date(b.reportedAt) - +new Date(a.reportedAt),
    );
    for (const inc of sorted.filter((i) => i.severity === 'critical').slice(0, 2)) {
      out.push({
        key: `q-${inc.id}`, severity: inc.severity, at: inc.reportedAt,
        title: inc.title, sub: `${inc.address} · ${timeAgo(inc.reportedAt)}`,
        action: 'View Incident', status: inc.status.toUpperCase(), pulse: true,
        run: () => { dispatch(setGlobalSearch(inc.title.slice(0, 24))); navigate('/incidents'); },
      });
    }
    const mine: BackendSafeIssue[] = tasks.filter((t) => t.status === 'ASSIGNED').slice(0, 2);
    for (const t of mine) {
      out.push({
        key: `q-${t.id}`, severity: 'high', at: t.createdAt,
        title: t.description.length > 64 ? `${t.description.slice(0, 64)}…` : t.description,
        sub: `${t.address ?? 'No address'} · assigned to you`,
        action: 'Open Task', status: 'ASSIGNED', pulse: false,
        run: () => navigate('/tasks'),
      });
    }
    for (const inc of sorted.filter((i) => i.severity !== 'critical').slice(0, 4 - Math.min(2, out.length))) {
      const src = byId.get(inc.id);
      const needsReview = src?.status === 'REPORTED';
      out.push({
        key: `q-${inc.id}`, severity: inc.severity, at: inc.reportedAt,
        title: inc.title, sub: `${inc.address} · ${timeAgo(inc.reportedAt)}`,
        action: needsReview ? 'Review Report' : 'View Incident',
        status: needsReview ? 'PENDING' : inc.status.toUpperCase(), pulse: inc.severity === 'high',
        run: () => {
          if (needsReview) navigate('/reports');
          else { dispatch(setGlobalSearch(inc.title.slice(0, 24))); navigate('/incidents'); }
        },
      });
    }
    return out.slice(0, 6);
  }, [active, tasks, byId, dispatch, navigate]);

  const liveFive = useMemo(
    () => [...active].sort(
      (a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || +new Date(b.reportedAt) - +new Date(a.reportedAt),
    ).slice(0, 5),
    [active],
  );

  const pipeline = useMemo(() => {
    const c = (s: string) => browse.filter((b) => b.status === s).length;
    return [
      { label: 'Reported', n: c('REPORTED') },
      { label: 'Verified', n: c('VERIFIED') },
      { label: 'Assigned', n: c('ASSIGNED') },
      { label: 'In Progress', n: c('IN_PROGRESS') },
      { label: 'Resolved', n: c('RESOLVED') },
      { label: 'Rejected', n: c('REJECTED') },
    ];
  }, [browse]);

  const activity = useMemo(() => buildActivity(browse), [browse]);

  const aiTop = useMemo(() => {
    const assessed = browse.filter((b) => b.complexity || b.skillRequired);
    assessed.sort((a, b) => {
      const rank = (c: string | null) => (c === 'HIGH' ? 3 : c === 'MEDIUM' ? 2 : c === 'LOW' ? 1 : 0);
      return rank(b.complexity) - rank(a.complexity);
    });
    return assessed[0] ?? null;
  }, [browse]);

  const today = forecast.length > 0 ? forecast[forecast.length - 1]! : null;
  const risks = today ? assessWeatherRisk(today) : null;
  const booting = (tasksLoading || browseLoading) && tasks.length === 0 && browse.length === 0;

  return (
    <div className="space-y-7 sm:space-y-8 min-w-0">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {greeting()}, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-mute mt-1">Here&apos;s the current situation across the city.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold text-mute">Last updated: {refreshedAt ? timeAgo(refreshedAt) : '—'}</span>
          <button onClick={() => void refresh()} disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-50">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {booting ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading command center">
          <div className="h-8 w-56 rounded bg-line animate-pulse" />
          <Skeleton lines={5} />
        </div>
      ) : (
        <>
          {/* ── Analytics (Recharts, all real backend data) — top of dashboard ── */}
          <section aria-label="Operations analytics">
            <SectionHead eyebrow="Analytics" title="City Analytics" sub="Severity, trend, response and workflow — live." />
            <div className="mt-3">
              {browseLoading && browse.length === 0 ? <Skeleton lines={4} /> : (
                <AuthorityAnalytics browse={browse} forecast={forecast} incidents={incidents} />
              )}
            </div>
          </section>

          {/* ── 1 · City status hero ── */}
          <section aria-label="City status" className="bg-panel text-white rounded-3xl px-5 py-6 sm:px-8 sm:py-8 flex flex-col md:flex-row md:items-center gap-6">
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-tag">
                <span className="w-1.5 h-1.5 rounded-full bg-tag animate-pulse" /> City operations active
              </p>
              <p className="text-white/70 text-xs sm:text-sm mt-2">
                {active.length === 0
                  ? 'No active incidents. The city is quiet — review queue and tasks below.'
                  : `${active.length} active incident${active.length === 1 ? '' : 's'} · ${pendingCount} awaiting review · ${myActive.length} on your plate.`}
              </p>
            </div>
            <div className="md:text-right shrink-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/60">City status</p>
              <p className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 ${cityState.cls}`}>{cityState.word}</p>
              <dl className="flex md:justify-end gap-5 mt-3">
                {[
                  { label: 'Incidents', value: active.length },
                  { label: 'Reports', value: pendingCount },
                  { label: 'Active tasks', value: myActive.length },
                ].map((s) => (
                  <div key={s.label}>
                    <dd className="text-xl font-extrabold leading-none">{s.value}</dd>
                    <dt className="text-[10px] font-bold uppercase tracking-wide text-white/60 mt-1">{s.label}</dt>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          {/* ── 2 · Attention queue (the most important section) ── */}
          <section aria-label="Needs your attention">
            <SectionHead
              eyebrow="Operations"
              title="Needs Your Attention"
              sub="Prioritized issues requiring authority action."
              action={queue.length > 0 ? (
                <span className="shrink-0 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-brand-soft text-brand">
                  {queue.length} open
                </span>
              ) : undefined}
            />
            {browseLoading && tasksLoading && browse.length === 0 && tasks.length === 0 ? <Skeleton lines={4} /> : queue.length === 0 ? (
              <p className="mt-3 text-sm font-bold text-civic-green flex items-center gap-2">
                <CheckCircle2 size={16} /> You&apos;re all caught up — no urgent authority actions right now.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-line border-y border-line list-none p-0 m-0">
                {queue.map((q) => (
                  <li key={q.key} className="flex items-center gap-3 sm:gap-4 py-3.5 min-w-0 group">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${SEV_DOT[q.severity]}${q.pulse ? ' animate-pulse' : ''}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-soft">{q.severity}</p>
                      <p className="text-sm sm:text-[15px] font-bold truncate">{q.title}</p>
                      <p className="text-[11px] sm:text-xs text-mute truncate mt-0.5">{q.sub}</p>
                    </div>
                    <span className="hidden sm:inline text-[10px] font-extrabold text-mute uppercase tracking-wide shrink-0">{q.status}</span>
                    <button onClick={q.run}
                      className="shrink-0 text-xs font-extrabold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm transition-all duration-150 active:scale-95">
                      {q.action}
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* ── 3 · Map + live incidents ── */}
          <section aria-label="Live city situation">
            <SectionHead
              eyebrow="Where"
              title="Live City Situation"
              sub="Incidents, reports and risk zones across the city."
            />
            <div className="mt-3 grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
              <div className="min-w-0">
                <div className="overflow-hidden rounded-2xl border border-line">
                  <Suspense fallback={<div className="h-[420px] bg-card animate-pulse" aria-label="Loading map" />}>
                    <CityMap live={loc} recenterKey={recenterKey} />
                  </Suspense>
                </div>
                <button onClick={() => navigate('/map')}
                  className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs font-extrabold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand transition-colors">
                  Open Full City Map <ArrowRight size={13} />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-mute mb-2">Live incidents</p>
                {browseLoading && browse.length === 0 ? <Skeleton lines={5} /> : liveFive.length === 0 ? (
                  <p className="text-xs text-soft">No active incidents.</p>
                ) : (
                  <ol className="divide-y divide-line border-y border-line list-none p-0 m-0">
                    {liveFive.map((i) => (
                      <li key={i.id}>
                        <button
                          onClick={() => { dispatch(setGlobalSearch(i.title.slice(0, 24))); navigate('/incidents'); }}
                          className="w-full text-left flex items-center gap-2.5 py-2.5 min-w-0 hover:opacity-80 transition-opacity"
                          title="Open incident details"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${SEV_DOT[i.severity]}`} aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-bold truncate">{i.title}</span>
                            <span className="block text-[11px] text-mute truncate mt-0.5">{i.address}</span>
                          </span>
                          <span className="text-[11px] font-semibold text-mute shrink-0">{timeAgo(i.reportedAt)}</span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </section>

          {/* ── 4 · Response pipeline ── */}
          <section aria-label="Response pipeline">
            <SectionHead eyebrow="Flow" title="Response Pipeline" sub="Live counts per backend workflow stage." />
            <ol className="mt-3 flex flex-col sm:flex-row sm:items-stretch gap-1.5 list-none p-0 m-0" aria-label="Issue lifecycle">
              {pipeline.map((s, idx) => (
                <li key={s.label} className="flex-1 min-w-0 flex sm:flex-col items-center gap-3 sm:gap-0 bg-card/60 border border-line/70 rounded-2xl px-4 py-3">
                  <span className="text-2xl font-extrabold leading-none">{s.n}</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-mute sm:mt-1.5 sm:text-center">{s.label}</span>
                  {idx < pipeline.length - 1 && (
                    <span aria-hidden className="ml-auto sm:ml-0 text-mute text-xs sm:hidden">↓</span>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* ── 5 · Response work (compact strip, not a card) ── */}
          <section aria-label="Your response work" className="flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-line py-3.5">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-mute">Your response work</p>
            <p className="text-sm font-bold">{myActive.filter((t) => t.status === 'ASSIGNED').length} Assigned</p>
            <p className="text-sm font-bold">{myActive.filter((t) => t.status === 'IN_PROGRESS').length} In Progress</p>
            <p className="text-sm font-bold text-soft">{tasks.filter((t) => t.status === 'RESOLVED').length} Resolved</p>
            <button onClick={() => navigate('/tasks')}
              className="ml-auto inline-flex items-center gap-1.5 text-xs font-extrabold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm transition-all duration-150 active:scale-95">
              Open My Tasks <ArrowRight size={13} />
            </button>
          </section>

          {/* ── 6 · Environmental intelligence (one wide band) ── */}
          <section aria-label="Environmental intelligence">
            <SectionHead eyebrow="Environment" title="Environmental Intelligence"
              sub={weatherLoc ? `${weatherLoc.city}${weatherLoc.country ? `, ${weatherLoc.country}` : ''} · live` : 'Live conditions'} />
            {weatherLoading && !today ? <Skeleton lines={3} /> : !today ? (
              <p className="text-xs text-soft mt-2">Weather data unavailable{weatherError ? ` — ${weatherError}` : ''}.{' '}
                <button onClick={() => refreshWeather()} className="underline text-brand font-bold">Retry</button>
              </p>
            ) : (
              <div className="mt-3 flex flex-col lg:flex-row gap-5 lg:gap-8">
                <div className="flex items-center gap-4 min-w-0">
                  <WeatherIcon icon={today.icon} condition={today.condition} size={72} />
                  <div>
                    <p className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none">{Math.round(today.temperature)}°C</p>
                    <p className="text-xs sm:text-sm font-semibold text-soft mt-1.5">{today.condition}</p>
                    <p className="text-[11px] sm:text-xs text-mute mt-0.5">
                      Humidity {today.humidity}% · Wind {today.windSpeedKmh} km/h · Rain {today.rainChance}%
                    </p>
                  </div>
                </div>
                <div className="flex gap-5 min-w-0 overflow-x-auto">
                  {forecast.map((d) => (
                    <div key={`${d.label}-${d.date}`} className="min-w-20 text-center shrink-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-mute">{d.weekday.slice(0, 3)}</p>
                      <div className="flex justify-center -my-1"><WeatherIcon icon={d.icon} condition={d.condition} size={40} /></div>
                      <p className="text-sm font-extrabold">{Math.round(d.temperature)}°</p>
                      <p className="text-[10px] font-semibold text-mute">{d.rainChance}% rain</p>
                    </div>
                  ))}
                </div>
                <div className="flex lg:flex-col gap-2 lg:ml-auto shrink-0">
                  {[
                    { label: 'Heat', v: risks?.heat },
                    { label: 'Rain', v: risks?.rain },
                    { label: 'Wind', v: risks?.wind },
                  ].map((r) => (
                    <span key={r.label} className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${riskBadge[r.v ?? 'Low']}`}>
                      {r.label} · {(r.v ?? 'Low').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 7 · AI risk brief (honestly labeled — heuristic intelligence) ── */}
          <section aria-label="Risk intelligence">
            <SectionHead eyebrow="Intelligence" title="Risk Brief" />
            {!aiTop ? (
              <p className="text-xs text-soft mt-2 leading-relaxed">
                No assessed reports yet. Rule-based risk analysis runs after verification — assessed signals will brief here automatically.
              </p>
            ) : (
              <div className="mt-2 border-l-2 border-brand pl-4 max-w-3xl">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
                  <Bot size={12} /> Risk intelligence · rule-based
                </p>
                <p className="text-base sm:text-lg font-bold leading-relaxed mt-1.5">
                  {aiTop.complexity === 'HIGH' ? 'High-complexity' : aiTop.complexity === 'MEDIUM' ? 'Medium-complexity' : 'Low-complexity'} {aiTop.issueType.replace(/_/g, ' ').toLowerCase()} signal
                  {aiTop.skillRequired ? ` — ${aiTop.skillRequired.replace(/_/g, ' ').toLowerCase()} crew recommended` : ''}.
                </p>
                <p className="text-xs text-soft mt-1.5">{aiTop.description}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  {aiTop.complexity && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${aiTop.complexity === 'HIGH' ? 'bg-[#fde8e2] text-[#f84424]' : aiTop.complexity === 'MEDIUM' ? 'bg-[#fdf0c8] text-[#965d13]' : 'bg-[#e9f2e2] text-[#51933a]'}`}>
                      {aiTop.complexity} risk
                    </span>
                  )}
                  <span className="text-[11px] font-semibold text-mute flex items-center gap-1">
                    <MapPin size={11} /> {aiTop.address ?? 'No address'}
                  </span>
                  <button onClick={() => navigate('/ai')} className="text-[11px] font-extrabold text-brand hover:underline">
                    Open AI Insights →
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── 8 · Recent activity (timeline, not cards) ── */}
          <section aria-label="Recent city activity">
            <SectionHead eyebrow="Timeline" title="Recent City Activity" />
            {browseLoading && browse.length === 0 ? <Skeleton lines={4} /> : activity.length === 0 ? (
              <p className="text-xs text-soft mt-2">No activity yet — events appear here as reports move through the workflow.</p>
            ) : (
              <ol className="mt-3 relative ml-1.5 border-l-2 border-line space-y-3.5 list-none pl-0 max-w-3xl">
                {activity.map((e) => {
                  const Icon = activityIcon[e.kind];
                  return (
                    <li key={`${e.at}-${e.id}-${e.kind}`} className="relative pl-6 min-w-0">
                      <span aria-hidden className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full bg-canvas border-2 border-brand" />
                      <p className="text-[13px] font-bold">{e.text}</p>
                      <p className="text-[11px] text-mute flex items-center gap-1 mt-0.5">
                        <Icon size={11} /> {new Date(e.at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' '}· {timeAgo(e.at)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* ── 9 · Compact action bar ── */}
          <nav aria-label="Quick actions" className="flex flex-wrap gap-2 border-t border-line pt-5">
            {[
              { label: 'Review Reports', to: '/reports' },
              { label: 'Open City Map', to: '/map' },
              { label: 'View Incidents', to: '/incidents' },
              { label: 'My Tasks', to: '/tasks' },
              { label: 'Emergency', to: '/emergency' },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.to)}
                className="text-xs font-extrabold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand hover:text-brand transition-colors">
                {a.label}
              </button>
            ))}
          </nav>

          {workflowError && (
            <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
              Some sections may be stale — {workflowError}{' '}
              <button onClick={() => void refresh()} className="underline">Retry</button>
            </p>
          )}
        </>
      )}
    </div>
  );
}
