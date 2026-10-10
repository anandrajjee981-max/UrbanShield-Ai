import type { AdminMonitoredIssue, AdminAuthorityApplication } from '../../../services/admin.service';

/** "2 days ago" + full-date tooltip title. */
export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  return `${Math.floor(mo / 12)} year${Math.floor(mo / 12) === 1 ? '' : 's'} ago`;
}

export const fullDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
};

/** Split "Title. Description…" — first sentence is the title, rest is detail. */
export function splitTitleBody(description: string): { title: string; body: string } {
  const text = description.trim();
  const match = /^(.{8,}?[.!?])\s+(.+)$/s.exec(text);
  if (match) return { title: match[1]!.trim(), body: match[2]!.trim() };
  return {
    title: text.length > 64 ? `${text.slice(0, 64).trimEnd()}…` : text,
    body: text.length > 64 ? text : '',
  };
}

const DAY = 86_400_000;

/** % change of items in the last `days` vs the previous window. */
export function wowChange(dates: string[], days = 7): number {
  const now = Date.now();
  const inWin = (iso: string, from: number, to: number) => {
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && t >= from && t < to;
  };
  const curr = dates.filter((d) => inWin(d, now - days * DAY, now)).length;
  const prev = dates.filter((d) => inWin(d, now - 2 * days * DAY, now - days * DAY)).length;
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Per-day buckets for sparklines + trend charts (oldest → newest). */
export function bucketByDay(dates: string[], days: number): { label: string; count: number }[] {
  const now = new Date();
  const buckets = new Map<string, number>();
  for (let d = days - 1; d >= 0; d--) {
    const dt = new Date(now);
    dt.setDate(now.getDate() - d);
    buckets.set(dt.toISOString().slice(0, 10), 0);
  }
  dates.forEach((iso) => {
    const day = new Date(iso).toISOString().slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1);
  });
  return [...buckets.entries()].map(([day, count]) => ({ label: day.slice(5), count }));
}

export type ActivityEvent =
  | { kind: 'issue'; at: string; text: string; id: string }
  | { kind: 'verify' | 'reject'; at: string; text: string; id: string }
  | { kind: 'application'; at: string; text: string; id: string };

/** Newest-first activity assembled from live issue + application timestamps. */
export function buildActivity(
  issues: AdminMonitoredIssue[],
  applications: AdminAuthorityApplication[],
  limit = 8,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  for (const i of issues) {
    const { title } = splitTitleBody(i.description);
    events.push({ kind: 'issue', at: i.createdAt, text: `New report — ${title}`, id: i.id });
    if (i.verifiedAt) events.push({ kind: 'verify', at: i.verifiedAt, text: `Verified — ${title}`, id: i.id });
    if (i.rejectedAt) events.push({ kind: 'reject', at: i.rejectedAt, text: `Rejected — ${title}`, id: i.id });
  }
  for (const a of applications) {
    events.push({ kind: 'application', at: a.submittedAt, text: `Application from ${a.fullName}`, id: a.id });
    if (a.verifiedAt) events.push({ kind: 'verify', at: a.verifiedAt, text: `Authority approved — ${a.fullName}`, id: a.id });
    if (a.rejectedAt) events.push({ kind: 'reject', at: a.rejectedAt, text: `Authority rejected — ${a.fullName}`, id: a.id });
  }
  return events
    .filter((e) => !Number.isNaN(new Date(e.at).getTime()))
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, limit);
}
