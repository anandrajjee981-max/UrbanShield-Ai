import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, MapPin, Trash2, UserCheck, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  analyzeIssueThunk,
  assignIssueThunk,
  clearSelection,
  deleteRejectedIssueThunk,
  fetchRecommendation,
  fetchReviewIssue,
  fetchReviewQueue,
  rejectIssueThunk,
  verifyIssueThunk,
  type ReviewQueueStatus,
} from '../store/slices/workflowSlice';
import Loader from '../components/common/Loader';
import AnalysisCard from '../components/workflow/AnalysisCard';
import WorkflowTracker from '../components/workflow/WorkflowTracker';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { setGlobalSearch } from '../store/slices/uiSlice';
import { adminIssueFields, matchesQuery } from '../utils/issueSearch';

const FILTERS = ['ALL', 'REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

export default function AdminReview() {
  const dispatch = useAppDispatch();
  const { queue, queueLoading, selected, selectedLoading, recommendation, recommendationLoading, actionLoading, error } =
    useAppSelector((s) => s.workflow);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [rejectReason, setRejectReason] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const visibleQueue = queue.filter((x) => matchesQuery(globalSearch, adminIssueFields(x)));
  useGsapEntrance('.gs-in', [queue.length]);

  useEffect(() => {
    dispatch(
      fetchReviewQueue(filter === 'ALL' ? undefined : { status: filter as ReviewQueueStatus }),
    );
  }, [dispatch, filter]);

  // Pre-select the recommended authority once a recommendation loads.
  useEffect(() => {
    if (recommendation?.recommendedAuthorityId) setAssigneeId(recommendation.recommendedAuthorityId);
  }, [recommendation]);

  const open = (id: string) => {
    dispatch(clearSelection());
    setRejectReason('');
    setAssigneeId('');
    dispatch(fetchReviewIssue(id));
  };

  const recommend = (id: string) => dispatch(fetchRecommendation(id));

  /** Card Verify → VERIFIED, then jump to the verified view with the issue open. */
  const handleVerify = async (id: string) => {
    const res = await dispatch(verifyIssueThunk(id));
    if (verifyIssueThunk.fulfilled.match(res)) {
      setFilter('VERIFIED');
      open(res.payload.id);
    }
  };

  /** Card Reject → REJECTED, then jump to the rejected view with the issue open. */
  const handleReject = async (id: string) => {
    const res = await dispatch(rejectIssueThunk({ issueId: id }));
    if (rejectIssueThunk.fulfilled.match(res)) {
      setFilter('REJECTED');
      open(res.payload.id);
    }
  };

  /** Removes a REJECTED issue from the queue after confirmation. */
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this rejected report permanently? This cannot be undone.')) return;
    const res = await dispatch(deleteRejectedIssueThunk(id));
    if (deleteRejectedIssueThunk.fulfilled.match(res)) {
      dispatch(fetchReviewQueue(filter === 'ALL' ? undefined : { status: filter as ReviewQueueStatus }));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Admin Review</h1>
        <p className="text-xs sm:text-sm text-mute">
          REPORTED → verify → VERIFIED → AI analysis + workforce → assign → ASSIGNED. Field work continues under Authority Tasks.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
              filter === f ? 'bg-brand text-white border-transparent' : 'bg-card text-soft border-line hover:border-brand'
            }`}
          >
            {f === 'ALL' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">{error}</p>}

      {globalSearch.trim() && (
        <p className="text-xs font-semibold text-soft flex items-center gap-2 flex-wrap">
          <span>Showing {visibleQueue.length} of {queue.length} for “{globalSearch.trim()}”</span>
          <button onClick={() => dispatch(setGlobalSearch(''))} className="underline text-brand">Clear search</button>
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4 items-start">
        {/* Queue */}
        <div className="space-y-2">
          {queueLoading && queue.length === 0 ? (
            <Loader label="Loading queue…" />
          ) : queue.length === 0 ? (
            <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
              No {filter === 'ALL' ? '' : `${filter} `}issues right now.
            </p>
          ) : visibleQueue.length === 0 ? (
            <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
              No issues match “{globalSearch.trim()}” — try a name, “flood”, “heat” or a status like “verified”.
            </p>
          ) : (
            visibleQueue.map((q) => (
              <div
                key={q.id}
                onClick={() => open(q.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    open(q.id);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`gs-in w-full text-left bg-card border rounded-2xl p-3.5 hover:border-brand transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                  selected?.id === q.id ? 'border-brand ring-1 ring-brand/30' : 'border-line'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm line-clamp-2 min-w-0">{q.description.slice(0, 90)}</p>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-canvas border border-line text-soft">
                    {q.status}
                  </span>
                </div>
                <p className="text-[11px] text-mute mt-1">
                  {q.issueType.replace(/_/g, ' ')} · {q.citizen.name} · {new Date(q.createdAt).toLocaleDateString()}
                </p>
                {/* Inline actions right on the card */}
                {q.status === 'REPORTED' && (
                  <div className="flex gap-2 mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleVerify(q.id)}
                      className="flex-1 flex items-center justify-center gap-1 font-bold text-[11px] px-3 py-2 rounded-lg bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                    >
                      <CheckCircle2 size={13} /> Verify
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleReject(q.id)}
                      className="flex-1 flex items-center justify-center gap-1 font-bold text-[11px] px-3 py-2 rounded-lg bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}
                {q.status === 'REJECTED' && (
                  <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleDelete(q.id)}
                      className="w-full flex items-center justify-center gap-1 font-bold text-[11px] px-3 py-2 rounded-lg border border-brand/40 text-brand hover:bg-brand hover:text-white disabled:opacity-60"
                    >
                      <Trash2 size={13} /> Delete rejected report
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        <div className="bg-card border border-line rounded-2xl p-4 sm:p-5 lg:sticky lg:top-4">
          {selectedLoading ? (
            <Loader label="Loading issue…" />
          ) : !selected ? (
            <p className="text-sm text-soft text-center py-10">Select an issue from the queue to review it.</p>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-canvas border border-line text-soft">
                  {selected.status}
                </span>
                <span className="text-[11px] text-mute">{selected.id.slice(0, 8)}</span>
              </div>
              <p className="text-sm font-semibold leading-relaxed break-words">{selected.description}</p>
              {selected.imageUrl && (
                <img src={selected.imageUrl} alt="Issue evidence" className="w-full max-h-64 object-cover rounded-xl border border-line" />
              )}
              <p className="text-xs text-mute flex items-center gap-1.5">
                <MapPin size={13} className="shrink-0" />
                {selected.locationType === 'GPS' && selected.latitude !== null
                  ? `GPS ${selected.latitude.toFixed(4)}, ${selected.longitude?.toFixed(4)}`
                  : selected.address ?? 'No location'}
                <span className="ml-1">· reported by {selected.citizen.name} ({selected.citizen.email})</span>
              </p>
              <WorkflowTracker status={selected.status} />
              <AnalysisCard
                skillRequired={selected.skillRequired}
                complexity={selected.complexity}
                effortHours={selected.effortHours}
              />

              {/* ── REPORTED: verify / reject ── */}
              {selected.status === 'REPORTED' && (
                <div className="space-y-2.5 border-t border-line pt-3.5">
                  <input
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Rejection reason (optional)"
                    maxLength={500}
                    className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand"
                  />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleVerify(selected.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                    >
                      <CheckCircle2 size={16} /> {actionLoading ? 'Working…' : 'Verify → VERIFIED'}
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={async () => {
                        const res = await dispatch(
                          rejectIssueThunk({ issueId: selected.id, reason: rejectReason.trim() || undefined }),
                        );
                        if (rejectIssueThunk.fulfilled.match(res)) {
                          setFilter('REJECTED');
                          open(res.payload.id);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                    >
                      <XCircle size={16} /> Reject → REJECTED
                    </button>
                  </div>
                </div>
              )}

              {/* ── REJECTED: permanent cleanup ── */}
              {selected.status === 'REJECTED' && (
                <div className="border-t border-line pt-3.5">
                  {selected.rejectionReason && (
                    <p className="text-xs text-soft italic mb-2.5">Reason: “{selected.rejectionReason}”</p>
                  )}
                  <button
                    disabled={actionLoading}
                    onClick={() => handleDelete(selected.id)}
                    className="w-full flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl border border-brand/40 text-brand hover:bg-brand hover:text-white disabled:opacity-60"
                  >
                    <Trash2 size={16} /> Delete rejected report
                  </button>
                </div>
              )}

              {/* ── VERIFIED: AI analysis + recommendation + assign ── */}
              {selected.status === 'VERIFIED' && (
                <div className="space-y-2.5 border-t border-line pt-3.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => dispatch(analyzeIssueThunk(selected.id))}
                      className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-panel text-white hover:opacity-90 disabled:opacity-60"
                    >
                      <Bot size={16} /> {selected.skillRequired ? 'Re-run AI analysis' : 'Run AI analysis'}
                    </button>
                    <button
                      disabled={recommendationLoading}
                      onClick={() => recommend(selected.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl border border-line bg-canvas hover:border-brand disabled:opacity-60"
                    >
                      <UserCheck size={16} /> {recommendationLoading ? 'Scoring…' : 'Workforce recommendation'}
                    </button>
                  </div>

                  {recommendation && recommendation.issueId === selected.id && (
                    <div className="bg-canvas border border-line rounded-xl p-3 space-y-2">
                      <p className="text-xs font-extrabold">
                        Assignment recommendation · {recommendation.analysis.skillRequired.replace(/_/g, ' ')} ·{' '}
                        {recommendation.analysis.complexity} · ~{recommendation.analysis.effortHours}h
                      </p>
                      {recommendation.ranking.length === 0 ? (
                        <p className="text-xs text-mute">No AUTHORITY members registered yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {recommendation.ranking.map((r) => (
                            <label
                              key={r.authority.id}
                              className={`flex items-center gap-2 text-xs p-2 rounded-lg border cursor-pointer ${
                                assigneeId === r.authority.id ? 'border-brand bg-card' : 'border-line bg-card/60'
                              }`}
                            >
                              <input
                                type="radio"
                                name="assignee"
                                checked={assigneeId === r.authority.id}
                                onChange={() => setAssigneeId(r.authority.id)}
                                className="accent-[#f84424]"
                              />
                              <span className="font-bold min-w-0 truncate">{r.authority.name}</span>
                              <span className="text-mute shrink-0">score {r.score}</span>
                              <span className="text-mute truncate hidden sm:inline">· {r.reason}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <button
                        disabled={actionLoading || !assigneeId}
                        onClick={() => dispatch(assignIssueThunk({ issueId: selected.id, authorityId: assigneeId }))}
                        className="w-full font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                      >
                        {actionLoading ? 'Assigning…' : 'Assign → ASSIGNED'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── ASSIGNED and beyond: progress readout ── */}
              {['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].includes(selected.status) && (
                <div className="text-xs text-soft border-t border-line pt-3.5 space-y-1">
                  <p>
                    Assigned to <span className="font-bold text-ink">{selected.assignee?.name ?? selected.assignedTo?.slice(0, 8) ?? '—'}</span>
                    {selected.assignedAt && ` on ${new Date(selected.assignedAt).toLocaleString()}`}
                  </p>
                  {selected.startedAt && <p>Work started {new Date(selected.startedAt).toLocaleString()}</p>}
                  {selected.resolvedAt && <p>Resolved {new Date(selected.resolvedAt).toLocaleString()}</p>}
                  {selected.resolutionNote && <p className="italic">“{selected.resolutionNote}”</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
