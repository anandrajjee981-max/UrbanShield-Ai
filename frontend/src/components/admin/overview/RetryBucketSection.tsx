import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronDown, RefreshCw, Send } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchRetryQueue, resendRetryQueue } from '../../../store/slices/adminSlice';
import type { RetryQueueEntry } from '../../../services/admin.service';
import { ConfirmModal, EmptyState, ErrorState, SkeletonCard, StatusBadge } from '../ui';
import { CategoryChip, ChartCard } from './badges';
import { fullDate, timeAgo } from './overviewStats';

const TABS = ['ALL', 'WATCHER', 'BOSS', 'ASSIGNMENT'] as const;
type Tab = (typeof TABS)[number];

const POLL_MS = 30_000;

function matchesQuery(q: string, e: RetryQueueEntry): boolean {
  const hay = [e.payload.description, e.payload.issueType, e.failureCode ?? '', e.issueId, e.id]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

/**
 * AI Retry Bucket — stuck AI material waiting for an admin resend.
 * Data: GET /api/admin/tasks/queue (Redux: admin.retryQueue),
 * action: POST /api/admin/tasks/queue/resend (Redux: admin.resendLoading).
 * Presentation only reuses existing admin primitives — no new hexes.
 */
export default function RetryBucketSection({ onToast }: { onToast: (kind: 'success' | 'error', text: string) => void }) {
  const dispatch = useAppDispatch();
  const { retryQueue, retryQueueFetch, resendLoading, resendError, lastResend } = useAppSelector(
    (s) => s.admin,
  );
  const [tab, setTab] = useState<Tab>('ALL');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    dispatch(fetchRetryQueue());
    const t = setInterval(() => dispatch(fetchRetryQueue()), POLL_MS);
    return () => clearInterval(t);
  }, [dispatch]);

  const pending = useMemo(() => retryQueue.filter((e) => e.status === 'PENDING'), [retryQueue]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = retryQueue.filter(
      (e) =>
        (tab === 'ALL' || e.stage === tab) && (q === '' || matchesQuery(q, e)),
    );
    return [...out].sort((a, b) =>
      newestFirst
        ? +new Date(b.createdAt) - +new Date(a.createdAt)
        : +new Date(a.createdAt) - +new Date(b.createdAt),
    );
  }, [retryQueue, tab, query, newestFirst]);

  const reload = () => dispatch(fetchRetryQueue());

  const doResend = async () => {
    setConfirming(false);
    const res = await dispatch(resendRetryQueue());
    if (resendRetryQueue.fulfilled.match(res)) {
      const { claimed, completed, requeued } = res.payload;
      onToast('success', `Resend finished — ${claimed} claimed · ${completed} completed · ${requeued} requeued.`);
      dispatch(fetchRetryQueue());
    } else {
      onToast('error', typeof res.payload === 'string' ? res.payload : 'Resend failed. Please try again.');
    }
  };

  return (
    <ChartCard
      title="AI Retry Bucket"
      sub="Stuck AI material waiting for resend — the citizen does not need to re-report."
      action={
        <span
          aria-label={`${pending.length} pending`}
          className="shrink-0 min-w-6 h-6 px-2 rounded-full bg-brand text-white text-[11px] font-extrabold inline-flex items-center justify-center"
        >
          {pending.length > 99 ? '99+' : pending.length}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          onClick={reload}
          disabled={retryQueueFetch.loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-line hover:border-brand disabled:opacity-60"
        >
          <RefreshCw size={13} className={retryQueueFetch.loading ? 'animate-spin' : ''} /> Refresh
        </button>
        <button
          onClick={() => setConfirming(true)}
          disabled={pending.length === 0 || resendLoading}
          title={pending.length === 0 ? 'Bucket is empty — nothing to resend' : `Resend ${pending.length} pending entries`}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
        >
          <Send size={13} /> {resendLoading ? 'Resending… (one AI call at a time)' : 'Resend bucket'}
        </button>
      </div>

      {lastResend && (
        <p
          role="status"
          className="flex items-center gap-2 text-xs font-bold px-3 py-2.5 rounded-xl bg-civic-green/10 text-civic-green border border-civic-green/30 mb-3"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          Resend finished — {lastResend.claimed} claimed · {lastResend.completed} completed ·{' '}
          {lastResend.requeued} requeued ({timeAgo(lastResend.at)})
        </p>
      )}
      {resendError && (
        <p role="alert" className="text-xs font-bold px-3 py-2.5 rounded-xl bg-brand/10 text-brand border border-brand/30 mb-3">
          {resendError}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
              tab === t
                ? 'bg-brand text-white border-transparent'
                : 'bg-card text-soft border-line hover:border-brand'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search description, type, failure code, id…"
          aria-label="Search retry queue"
          className="flex-1 min-w-44 bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
        />
        <button
          onClick={() => setNewestFirst((v) => !v)}
          className="text-xs font-bold px-3 py-2 rounded-xl border border-line hover:border-brand"
          aria-pressed={newestFirst}
        >
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {retryQueueFetch.loading && retryQueue.length === 0 ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading retry queue">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : retryQueueFetch.error && retryQueue.length === 0 ? (
        <ErrorState title="Unable to load retry queue." onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={retryQueue.length === 0 ? 'Bucket is clear.' : 'No entries match your filter.'}
          hint={
            retryQueue.length === 0
              ? 'AI failures will park here for resend.'
              : 'Try a different stage or keyword.'
          }
        />
      ) : (
        <ol className="space-y-2 list-none p-0 m-0">
          {visible.map((e) => {
            const p = e.payload;
            const isOpen = expanded === e.id;
            return (
              <li key={e.id} className="bg-canvas border border-line rounded-2xl p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge value={e.status} />
                  <CategoryChip value={e.stage} />
                  {e.failureCode && <CategoryChip value={e.failureCode} />}
                  <span
                    title={`Last attempt: ${e.lastAttemptAt ? fullDate(e.lastAttemptAt) : 'never'}`}
                    className={`ml-auto text-[11px] font-extrabold ${e.attempts >= 3 ? 'text-brand' : 'text-mute'}`}
                  >
                    {e.attempts} attempt{e.attempts === 1 ? '' : 's'}
                    {e.attempts >= 3 ? ' · needs attention' : ''}
                  </span>
                </div>
                <p className="text-[13px] font-bold mt-2 line-clamp-2">
                  {p.description.length > 120 ? `${p.description.slice(0, 120)}…` : p.description}
                </p>
                <p className="text-[11px] text-mute mt-1">
                  {p.issueType.replace(/_/g, ' ')} · {p.address ?? 'GPS report'} ·{' '}
                  <span title={fullDate(e.createdAt)}>stuck {timeAgo(e.createdAt)}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Link
                    to={`/admin/issues/${e.issueId}`}
                    className="text-[11px] font-bold text-brand hover:underline"
                  >
                    Open issue →
                  </Link>
                  <button
                    onClick={() => setExpanded(isOpen ? null : e.id)}
                    aria-expanded={isOpen}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-soft hover:text-brand"
                  >
                    {isOpen ? 'Hide snapshot' : 'Show snapshot'}
                    <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {isOpen && (
                  <dl className="mt-2 grid sm:grid-cols-2 gap-2 text-[11px] bg-card border border-line rounded-xl p-3">
                    <div><dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Issue</dt><dd className="font-mono break-all">{p.issueId}</dd></div>
                    <div><dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Entry</dt><dd className="font-mono break-all">{e.id}</dd></div>
                    <div><dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Location</dt><dd>{p.locationType}{p.address ? ` · ${p.address}` : p.latitude !== null ? ` · ${p.latitude}, ${p.longitude}` : ''}</dd></div>
                    <div><dt className="font-extrabold text-mute uppercase tracking-wide text-[10px]">Issue status at failure</dt><dd>{p.issueStatus}</dd></div>
                    {p.imageUrl && (
                      <div className="sm:col-span-2"><dt className="font-extrabold text-mute uppercase tracking-wide text-[10px] mb-1">Evidence</dt><dd><img src={p.imageUrl} alt="Stuck issue evidence" loading="lazy" className="max-h-32 rounded-xl border border-line object-cover" /></dd></div>
                    )}
                  </dl>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {confirming && (
        <ConfirmModal
          title="Resend the whole bucket?"
          message={`This runs ${pending.length} pending ${pending.length === 1 ? 'entry' : 'entries'} back through Watcher → Boss → Assignment, one AI call at a time. Entries that still fail return to PENDING.`}
          confirmLabel={resendLoading ? 'Working…' : `Resend ${pending.length}`}
          loading={resendLoading}
          onConfirm={() => void doResend()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </ChartCard>
  );
}
