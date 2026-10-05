import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { AuthorityTaskIssue } from '../../services/api';
import type { WeatherDay } from '../../services/weatherService';
import type { Incident } from '../../types';

// ---------------------------------------------------------------------------
// Data transforms — pure functions, backend data in, chart rows out.
// ---------------------------------------------------------------------------

export interface RiskRow { level: string; count: number; fill: string; }

export function transformIncidentRiskData(incidents: Incident[]): RiskRow[] {
  const c = (s: Incident['severity']) => incidents.filter((i) => i.severity === s).length;
  return [
    { level: 'Critical', count: c('critical'), fill: 'var(--brand)' },
    { level: 'High', count: c('high'), fill: 'var(--brand-warm)' },
    { level: 'Medium', count: c('medium'), fill: 'var(--amber)' },
    { level: 'Low', count: c('low'), fill: 'var(--green)' },
  ];
}

export interface TrendRow { date: string; incidents: number; }

/** Last 7 full days: submissions by createdAt. Resolutions are not tracked by
 * the backend yet (no assignment module), so no resolved series is shown. */
export function transformIncidentTrendData(browse: AuthorityTaskIssue[]): TrendRow[] {
  const DAY = 86400000;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const start = now.getTime() - (6 - i) * DAY;
    const end = start + DAY;
    const inWin = (iso: string | null) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return !Number.isNaN(t) && t >= start && t < end;
    };
    return {
      date: new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      incidents: browse.filter((b) => inWin(b.createdAt)).length,
    };
  });
}

export interface WorkflowRow { stage: string; count: number; }

/** Live counts per review stage the backend actually tracks. */
export function transformWorkflowData(browse: AuthorityTaskIssue[]): WorkflowRow[] {
  const c = (s: string) => browse.filter((b) => b.status === s).length;
  return [
    { stage: 'Reported', count: c('REPORTED') },
    { stage: 'Verified', count: c('VERIFIED') },
    { stage: 'Rejected', count: c('REJECTED') },
  ];
}

export interface TempRow { day: string; temp: number; }

/** Real forecast days with their actual weekday labels — never relabeled as future. */
export function transformTempOutlook(forecast: WeatherDay[]): TempRow[] {
  return forecast.map((d) => ({
    day: `${d.weekday.slice(0, 3)} ${d.date.slice(5)}`,
    temp: Math.round(d.temperature),
  }));
}

// ---------------------------------------------------------------------------
// Charts — each renders only when its real dataset is non-trivial.
// ---------------------------------------------------------------------------

const tick = { fill: 'var(--mute)', fontSize: 11 };
const reduceMotion =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ChartShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4 sm:p-5 min-w-0 overflow-hidden">
      <h3 className="font-extrabold text-sm">{title}</h3>
      <p className="text-[11px] text-mute mt-0.5 mb-3">{sub}</p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-soft py-8 text-center">{children}</p>;
}

export default function AuthorityAnalytics({ browse, forecast, incidents }: {
  browse: AuthorityTaskIssue[]; forecast: WeatherDay[]; incidents: Incident[];
}) {
  const risk = useMemo(() => transformIncidentRiskData(incidents), [incidents]);
  const trend = useMemo(() => transformIncidentTrendData(browse), [browse]);
  const workflow = useMemo(() => transformWorkflowData(browse), [browse]);
  const temps = useMemo(() => transformTempOutlook(forecast), [forecast]);

  const hasRisk = risk.some((r) => r.count > 0);
  const hasTrend = trend.some((t) => t.incidents > 0);

  return (
    <div className="grid md:grid-cols-2 gap-4 items-start">
      <ChartShell title="Risk Distribution" sub="Current incidents grouped by severity.">
        {!hasRisk ? <Empty>No active incidents.</Empty> : (
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={risk} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="level" tick={tick} interval={0} />
                <YAxis tick={tick} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion}>
                  {risk.map((r) => <Cell key={r.level} fill={r.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <ChartShell title="Incident Trend" sub="Submissions, last 7 days.">
        {!hasTrend ? <Empty>No historical data available yet.</Empty> : (
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="date" tick={tick} />
                <YAxis tick={tick} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="incidents" name="Submitted" stroke="var(--brand)" strokeWidth={2.5} dot={false} isAnimationActive={!reduceMotion} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <ChartShell title="Report Workflow" sub="Live reports per backend stage.">
        {browse.length === 0 ? <Empty>No reports yet.</Empty> : (
          <div className="h-52 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workflow} margin={{ top: 4, right: 4, bottom: 0, left: -14 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="stage" tick={tick} interval={0} angle={-14} dy={8} height={44} />
                <YAxis tick={tick} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--brand-warm)" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      {temps.length > 0 && (
        <div className="md:col-span-2">
          <ChartShell title="3-Day Temperature Outlook" sub="Live backend forecast, actual days.">
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={temps} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                  <XAxis dataKey="day" tick={tick} />
                  <YAxis tick={tick} domain={['auto', 'auto']} unit="°" />
                  <Tooltip formatter={(v) => [`${v}°C`, 'Temp']} />
                  <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="var(--amberdark)" strokeWidth={2.5} isAnimationActive={!reduceMotion} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartShell>
        </div>
      )}
    </div>
  );
}
