import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, MapPin, ShieldAlert, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  authorityRejectIssueThunk,
  authorityVerifyIssueThunk,
  fetchMyTasks,
} from '../store/slices/workflowSlice';
import { setGlobalSearch } from '../store/slices/uiSlice';
import { matchesQuery } from '../utils/issueSearch';
import type { AuthorityTaskIssue } from '../services/api';
import Loader from '../components/common/Loader';
import WorkflowTracker from '../components/workflow/WorkflowTracker';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

const FILTERS = ['ALL', 'REPORTED', 'VERIFIED', 'REJECTED'] as const;

/** Searchable text for an authority queue row (names only — never coordinates). */
const rowFields = (t: AuthorityTaskIssue): string =>
  [t.id, t.description, t.issueType, t.status, t.address ?? ''].join(' ');

/**
 * AUTHORITY review queue (/tasks): REPORTED → VERIFIED / REJECTED through the
 * real authority endpoints. Assignment and field-work stages have no backend
 * API yet, so this screen is the review workflow — nothing else.
 */
export default function AuthorityTasks() {
  const dispatch = useAppDispatch();
  const { tasks, tasksLoading, actionLoading, error } = useAppSelector((s) => s.workflow);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  useGsapEntrance('.gs-in', [tasks.length, filter]);

  useEffect(() => {
    dispatch(fetchMyTasks(filter === 'ALL' ? undefined : { status: filter }));
  }, [dispatch, filter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = tasks.filter((t) => matchesQuery(globalSearch, [rowFields(t)]));
  const pending = tasks.filter((t) => t.status === 'REPORTED').length;
  const notVerified = error?.includes('verified') ?? false;

  const doVerify = async (id: string) => {
    const res = await dispatch(authorityVerifyIssueThunk(id));
    if (authorityVerifyIssueThunk.fulfilled.match(res)) {
      setToast('Report verified — moved to VERIFIED.');
      dispatch(fetchMyTasks(filter === 'ALL' ? undefined : { status: filter }));
    }
  };

  const doReject = async (id: string) => {
    const res = await dispatch(
      authorityRejectIssueThunk({ issueId: id, reason: reason.trim() || undefined }),
    );
    if (authorityRejectIssueThunk.fulfilled.match(res)) {
      setRejectFor(null);
      setReason('');
      setToast('Report rejected.');
      dispatch(fetchMyTasks(filter === 'ALL' ? undefined : { status: filter }));
    }
  };

  if (tasksLoading && tasks.length === 0) return <Loader label="Loading review queue…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Review Queue ({pending} pending)</h1>
        <p className="text-xs sm:text-sm text-mute">
          Citizen reports awaiting your verify / reject decision. Assignment and field work arrive with the next backend module.
        </p>
      </div>

      {toast && (
        <p className="flex items-center gap-2 text-sm font-semibold bg-civic-green/10 border border-civic-green/30 text-civic-green rounded-xl px-4 py-3" role="status">
          <CheckCircle2 size={17} className="shrink-0" /> {toast}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
              filter === f ? 'bg-brand text-white border-transparent' : 'bg-card text-soft border-line hover:border-brand'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error && !notVerified && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">{error}</p>}

      {notVerified && (
        <div className="bg-card border border-civic-amber/40 rounded-2xl p-5 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-civic-amber/15 text-civic-amber-dark flex items-center justify-center mb-3">
            <ShieldAlert size={20} />
          </div>
          <p className="font-extrabold text-ink text-sm">Verification required</p>
          <p className="text-xs text-mute mt-1 max-w-md mx-auto">
            Your authority account has not been verified by an administrator yet. Apply for verification to unlock the review queue.
          </p>
          <Link
            to="/authority/apply"
            className="mt-4 inline-block text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            Apply for Verification
          </Link>
        </div>
      )}

      {globalSearch.trim() && (
        <p className="text-xs font-semibold text-soft flex items-center gap-2 flex-wrap">
          <span>Showing {visible.length} of {tasks.length} for “{globalSearch.trim()}”</span>
          <button onClick={() => dispatch(setGlobalSearch(''))} className="underline text-brand">Clear search</button>
        </p>
      )}

      {tasks.length === 0 && !tasksLoading && !error ? (
        <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
          No {filter === 'ALL' ? '' : `${filter.toLowerCase()} `}reports right now.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((t) => (
            <div key={t.id} className="gs-in bg-card border border-line rounded-2xl p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-sm line-clamp-2 min-w-0">{t.description.slice(0, 100)}</p>
                <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-canvas border border-line text-soft">
                  {t.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-mute">
                {t.issueType.replace(/_/g, ' ')} · {new Date(t.createdAt).toLocaleDateString()}
              </p>
              <p className="text-[11px] text-mute flex items-center gap-1">
                <MapPin size={12} className="shrink-0" />
                {t.address ?? 'Location not provided'}
              </p>
              {t.imageUrl && (
                <img src={t.imageUrl} alt="Issue evidence" className="w-full h-32 object-cover rounded-xl border border-line" loading="lazy" />
              )}
              <WorkflowTracker status={t.status} />
              {t.rejectionReason && (
                <p className="text-[11px] text-soft italic">Rejection reason: “{t.rejectionReason}”</p>
              )}
              {t.status === 'REPORTED' && (
                rejectFor === t.id ? (
                  <div className="space-y-2 border-t border-line pt-2.5">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason (optional)"
                      maxLength={500}
                      className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRejectFor(null); setReason(''); }}
                        disabled={actionLoading}
                        className="flex-1 font-bold text-xs px-3 py-2.5 rounded-xl border border-line hover:border-brand disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => void doReject(t.id)}
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs px-3 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                      >
                        <XCircle size={14} /> {actionLoading ? 'Working…' : 'Confirm Reject'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={actionLoading}
                      onClick={() => void doVerify(t.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs px-3 py-2.5 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                    >
                      <CheckCircle2 size={14} /> Verify
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => setRejectFor(t.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs px-3 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
