import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CategoryChip, StatusBadge } from './badges';
import { fullDate, splitTitleBody, timeAgo } from './overviewStats';
import type { AdminMonitoredIssue } from '../../../services/admin.service';

/**
 * Slide-over details drawer (not a route change): title, description, meta,
 * reporter, review outcome + link to the full monitoring page.
 * Escape closes, focus lands on the close button, body scroll locks.
 */
export function IssueDrawer({
  issue,
  onClose,
}: {
  issue: AdminMonitoredIssue | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!issue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [issue, onClose]);

  if (!issue) return null;
  const { title, body } = splitTitleBody(issue.description);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`Issue details: ${title}`}>
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-y-0 right-0 w-full max-w-md bg-card border-l border-line shadow-2xl flex flex-col">
        <div className="flex items-start gap-3 p-4 border-b border-line">
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-ink leading-snug">{title}</h2>
            <p className="text-[11px] text-soft mt-1" title={fullDate(issue.createdAt)}>
              Reported {timeAgo(issue.createdAt)} · {fullDate(issue.createdAt)}
            </p>
          </div>
          <button
            // biome-ignore lint: autofocus via autoFocus is intentional for drawer a11y
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <CategoryChip value={issue.issueType} />
            <StatusBadge value={issue.status} />
          </div>
          {body && <p className="text-sm text-soft leading-relaxed">{issue.description}</p>}
          {!body && <p className="text-sm text-soft leading-relaxed">{issue.description}</p>}
          {issue.imageUrl && (
            <img src={issue.imageUrl} alt="Issue evidence" className="w-full rounded-xl border border-line" loading="lazy" />
          )}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-soft">Location</dt>
              <dd className="text-ink mt-0.5 text-xs font-semibold">
                {issue.address ?? (issue.latitude != null ? `${issue.latitude}, ${issue.longitude}` : '—')}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-soft">Reporter</dt>
              <dd className="text-ink mt-0.5 text-xs font-semibold">{issue.citizen.name}</dd>
            </div>
            {issue.rejectionReason && (
              <div className="col-span-2">
                <dt className="text-[11px] font-bold uppercase tracking-wider text-soft">Rejection reason</dt>
                <dd className="text-ink mt-0.5 text-xs">{issue.rejectionReason}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="p-4 border-t border-line">
          <a
            href={`/admin/issues/${issue.id}`}
            className="block text-center text-sm font-bold px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm focus-visible:outline-2 focus-visible:outline-brand"
          >
            Open full monitoring view
          </a>
        </div>
      </div>
    </div>
  );
}
