import { Bell, RefreshCw, Search } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';

/**
 * Overview header: title + search + range filter + last-updated + bell + refresh.
 * Search/range are controlled by the page (client-side filtering, no API change).
 */
export function OverviewHeader({
  query,
  onQuery,
  range,
  onRange,
  updatedAt,
  refreshing,
  onRefresh,
}: {
  query: string;
  onQuery: (q: string) => void;
  range: 7 | 30;
  onRange: (r: 7 | 30) => void;
  updatedAt: string | null;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const unread = useAppSelector((s) => s.notifications.items.filter((n) => !n.read).length);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">Operations Overview</h1>
          <p className="text-xs sm:text-sm text-soft mt-0.5">
            City-wide monitoring, verification and accountability at a glance.
            {updatedAt && <span className="text-soft"> · Updated {updatedAt}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh overview data"
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} aria-hidden /> Refresh
          </button>
          <button
            aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
            className="relative p-2.5 rounded-xl border border-line bg-card hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Bell size={17} aria-hidden />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <label className="flex-1 flex items-center gap-2 bg-card border border-line rounded-xl px-3 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
          <Search size={15} className="text-soft shrink-0" aria-hidden />
          <span className="sr-only">Search issues and applications</span>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search issues, applicants, departments…"
            className="no-focus-outline bg-transparent outline-none text-sm text-ink w-full placeholder:text-soft"
          />
        </label>
        <div className="flex gap-1 p-1 rounded-xl bg-card border border-line self-start" role="group" aria-label="Activity range">
          {([7, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => onRange(r)}
              aria-pressed={range === r}
              className={`text-xs font-extrabold px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
                range === r ? 'bg-brand text-white' : 'text-soft hover:text-ink'
              }`}
            >
              Last {r} days
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
