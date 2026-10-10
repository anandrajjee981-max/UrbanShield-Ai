import { statusDotCls } from './tokens';
import { CategoryChip, StatusBadge } from './badges';
import { fullDate, splitTitleBody, timeAgo } from './overviewStats';
import type { AdminMonitoredIssue } from '../../../services/admin.service';

/**
 * One reported issue: bold title, muted 1-line description, category chip,
 * colored status badge, relative date with full-date tooltip. Whole row is a
 * button that opens the details drawer (keyboard accessible).
 */
export function IssueRow({
  issue,
  onOpen,
}: {
  issue: AdminMonitoredIssue;
  onOpen: (issue: AdminMonitoredIssue) => void;
}) {
  const { title, body } = splitTitleBody(issue.description);
  const dot = statusDotCls[issue.status.toUpperCase()] ?? 'bg-mute';

  return (
    <button
      type="button"
      onClick={() => onOpen(issue)}
      aria-label={`Open details for ${title}`}
      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-line bg-card transition-colors hover:border-brand/50 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink truncate">{title}</span>
        {body && <span className="block text-xs text-soft truncate mt-0.5">{body}</span>}
        <span className="flex flex-wrap items-center gap-1.5 mt-2">
          <CategoryChip value={issue.issueType} />
          <StatusBadge value={issue.status} />
          <span className="text-[11px] text-soft ml-auto" title={fullDate(issue.createdAt)}>
            {timeAgo(issue.createdAt)}
          </span>
        </span>
      </span>
    </button>
  );
}
