import { AlertTriangle, CheckCircle2, FileText, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChartCard } from './badges';
import { EmptyState } from '../ui';
import { fullDate, timeAgo, type ActivityEvent } from './overviewStats';

const icons = {
  issue: FileText,
  verify: CheckCircle2,
  reject: AlertTriangle,
  application: UserPlus,
} as const;

/** Recent activity timeline (text + icon + relative time, newest first). */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ChartCard
      title="Recent Activity"
      sub="Reports, reviews and applications as they happen."
      action={
        <Link
          to="/admin/audit-logs"
          className="text-xs font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded"
        >
          Audit logs →
        </Link>
      }
    >
      {events.length === 0 ? (
        <EmptyState title="No activity yet." hint="Events appear here as reports move through the workflow." />
      ) : (
        <ol className="relative ml-1.5 border-l-2 border-line space-y-3.5 max-h-72 overflow-y-auto pr-1">
          {events.map((e) => {
            const Icon = icons[e.kind];
            return (
              <li key={`${e.at}-${e.id}-${e.kind}`} className="relative pl-6 min-w-0">
                <span aria-hidden className="absolute -left-[7px] top-0.5 w-3 h-3 rounded-full bg-card border-2 border-brand" />
                <p className="text-[13px] font-bold text-ink truncate">{e.text}</p>
                <p className="text-[11px] text-soft flex items-center gap-1 mt-0.5" title={fullDate(e.at)}>
                  <Icon size={11} aria-hidden /> {timeAgo(e.at)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </ChartCard>
  );
}
