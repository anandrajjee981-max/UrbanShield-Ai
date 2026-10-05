import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, CheckCircle2, Clock, MapPin, Navigation, UserCheck, X, XCircle,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  analyzeIssueThunk,
  assignIssueThunk,
  fetchWorkforce,
  rejectIssueThunk,
  resolveTaskThunk,
  startTaskThunk,
  verifyIssueThunk,
} from '../../store/slices/workflowSlice';
import { pushNotification } from '../../store/slices/notificationsSlice';
import { setCenter } from '../../store/slices/mapSlice';
import type { BackendAdminIssue } from '../../services/api';
import WorkflowTracker from '../workflow/WorkflowTracker';
import AnalysisCard from '../workflow/AnalysisCard';
import { timeAgo } from '../../utils/format';

const REJECT_REASONS = [
  'Duplicate report',
  'Invalid information',
  'Insufficient evidence',
  'Outside service area',
  'Already resolved',
  'Other',
] as const;

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface ActivityEvent { at: string; text: string; }

/** Real audit trail built only from backend timestamps — nothing invented. */
function buildActivity(issue: BackendAdminIssue): ActivityEvent[] {
  const events: ActivityEvent[] = [
    { at: issue.createdAt, text: `Citizen ${issue.citizen.name} submitted the report` },
  ];
  if (issue.verifiedAt) events.push({ at: issue.verifiedAt, text: 'Command center reviewed and verified the report' });
  if (issue.rejectedAt) {
    events.push({
      at: issue.rejectedAt,
      text: `Report rejected${issue.rejectionReason ? ` — ${issue.rejectionReason}` : ''}`,
    });
  }
  if (issue.assignedAt) {
    events.push({
      at: issue.assignedAt,
      text: `Task assigned${issue.assignee ? ` to ${issue.assignee.name}` : ''}`,
    });
  }
  if (issue.startedAt) events.push({ at: issue.startedAt, text: 'Response team started field work' });
  if (issue.resolvedAt) {
    events.push({
      at: issue.resolvedAt,
      text: `Report resolved${issue.resolutionNote ? ` — ${issue.resolutionNote}` : ''}`,
    });
  }
  return events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

const statusPill: Record<string, string> = {
  REPORTED: 'bg-[#fdf0c8] text-[#965d13]',
  VERIFIED: 'bg-[#e8efff] text-[#4482ea]',
  ASSIGNED: 'bg-[#e8efff] text-[#4482ea]',
  IN_PROGRESS: 'bg-[#e8efff] text-[#4482ea]',
  RESOLVED: 'bg-[#e9f2e2] text-[#51933a]',
  REJECTED: 'bg-[#fde8e2] text-[#f84424]',
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

/**
 * Full authority/admin review surface for one citizen report.
 * Every action persists through the real backend APIs (verify / reject /
 * analyse / assign / start / resolve) — the backend enforces role rules, so
 * review powers are only offered when `canReview` (ADMIN) is true.
 */
export default function ReportReviewModal({
  issue,
  canReview,
  myId,
  onClose,
  onChanged,
}: {
  issue: BackendAdminIssue;
  canReview: boolean;
  myId: string | undefined;
  onClose: () => void;
  onChanged: () => void;
}) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { actionLoading, workforce, workforceLoading } = useAppSelector((s) => s.workflow);
  const [confirm, setConfirm] = useState<'accept' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [rejectNote, setRejectNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (canReview && issue.status === 'VERIFIED') dispatch(fetchWorkforce());
  }, [dispatch, canReview, issue.status]);

  const done = (message: string, link = '/reports') => {
    dispatch(pushNotification({
      title: `Report #${shortId(issue.id)} update`,
      message,
      type: 'success',
      time: 'Just now',
      category: 'AUTHORITY ACTION',
      link,
    }));
    setConfirm(null);
    onChanged();
  };
  const fail = (res: { payload?: unknown }, fallback: string) =>
    setLocalError((res.payload as string) ?? fallback);

  const doAccept = async () => {
    setLocalError(null);
    const res = await dispatch(verifyIssueThunk(issue.id));
    if (verifyIssueThunk.fulfilled.match(res)) {
      done(`Your report #${shortId(issue.id)} has been accepted and verified.`);
    } else fail(res, 'Could not accept the report.');
  };

  const doReject = async () => {
    setLocalError(null);
    const reason = rejectNote.trim() ? `${rejectReason} — ${rejectNote.trim()}` : rejectReason;
    const res = await dispatch(rejectIssueThunk({ issueId: issue.id, reason }));
    if (rejectIssueThunk.fulfilled.match(res)) {
      done(`Your report #${shortId(issue.id)} was rejected. Reason: ${rejectReason}.`);
    } else fail(res, 'Could not reject the report.');
  };

  const doAssign = async () => {
    if (!assigneeId) return;
    setLocalError(null);
    const res = await dispatch(assignIssueThunk({ issueId: issue.id, authorityId: assigneeId }));
    if (assignIssueThunk.fulfilled.match(res)) {
      const name = workforce.find((w) => w.id === assigneeId)?.name ?? 'response team';
      done(`Task assigned to ${name} for report #${shortId(issue.id)}.`, '/tasks');
    } else fail(res, 'Could not create the task.');
  };

  const doStart = async () => {
    setLocalError(null);
    const res = await dispatch(startTaskThunk(issue.id));
    if (startTaskThunk.fulfilled.match(res)) {
      done(`Your report #${shortId(issue.id)} is now being worked on.`, '/tasks');
    } else fail(res, 'Could not start the response.');
  };

  const doResolve = async () => {
    setLocalError(null);
    const res = await dispatch(resolveTaskThunk({ issueId: issue.id, note: resolveNote.trim() || undefined }));
    if (resolveTaskThunk.fulfilled.match(res)) {
      done(`Your report #${shortId(issue.id)} has been resolved.`, '/tasks');
    } else fail(res, 'Could not resolve the report.');
  };

  const viewOnMap = () => {
    if (issue.latitude !== null && issue.longitude !== null) {
      dispatch(setCenter([issue.latitude, issue.longitude]));
    }
    onClose();
    navigate('/map');
  };

  const activity = buildActivity(issue);
  const assignedToMe = !!myId && issue.assignedTo === myId;
  const coords =
    issue.latitude !== null && issue.longitude !== null
      ? `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Review report ${shortId(issue.id)}`}>
      <button aria-label="Close review" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full sm:max-w-2xl bg-card text-ink border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="p-5 md:p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-canvas border border-line text-soft">
                REPORT #{shortId(issue.id)}
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${statusPill[issue.status] ?? statusPill.REPORTED}`}>
                {issue.status.replace(/_/g, ' ')}
              </span>
            </div>
            <button onClick={onClose} aria-label="Close review" autoFocus className="p-2 rounded-xl hover:bg-canvas text-mute shrink-0">
              <X size={18} />
            </button>
          </div>

          <div>
            <p className="text-[11px] font-extrabold text-mute uppercase tracking-wide">
              {issue.issueType.replace(/_/g, ' ')}
              {issue.complexity ? ` · ${issue.complexity} complexity` : ''}
            </p>
            <h2 className="text-lg md:text-xl font-extrabold mt-1 leading-snug break-words">{issue.description}</h2>
          </div>

          {issue.imageUrl && (
            <img src={issue.imageUrl} alt="Report evidence photo" className="w-full max-h-72 object-cover rounded-2xl border border-line" loading="lazy" />
          )}

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px] flex items-center gap-1"><MapPin size={11} /> Location</dt>
              <dd className="font-bold mt-1">{issue.address ?? 'Location not provided'}</dd>
              {coords && <dd className="text-mute mt-0.5">GPS {coords}</dd>}
            </div>
            <div className="bg-canvas border border-line rounded-xl px-3 py-2.5">
              <dt className="font-extrabold text-mute uppercase tracking-wide text-[10px] flex items-center gap-1"><Clock size={11} /> Submitted</dt>
              <dd className="font-bold mt-1">{fmtDateTime(issue.createdAt)} ({timeAgo(issue.createdAt)})</dd>
              <dd className="text-mute mt-0.5">by {issue.citizen.name} · {issue.citizen.email}</dd>
            </div>
          </dl>

          <div>
            <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide mb-1.5">Status timeline</p>
            <WorkflowTracker status={issue.status} />
          </div>

          <AnalysisCard skillRequired={issue.skillRequired} complexity={issue.complexity} effortHours={issue.effortHours} />

          {issue.rejectionReason && (
            <p className="text-xs text-soft italic border-l-2 border-brand pl-3">
              Rejection reason: “{issue.rejectionReason}”
            </p>
          )}
          {issue.resolutionNote && (
            <p className="text-xs text-soft italic border-l-2 border-civic-green pl-3">
              Authority response: “{issue.resolutionNote}”
            </p>
          )}

          <div>
            <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide mb-1.5">Activity</p>
            <ol className="relative ml-1.5 border-l-2 border-line space-y-3 list-none pl-0">
              {activity.map((e) => (
                <li key={`${e.at}-${e.text}`} className="relative pl-5">
                  <span aria-hidden className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-brand" />
                  <p className="text-xs font-bold">{e.text}</p>
                  <p className="text-[11px] text-mute">{fmtDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
          </div>

          {localError && (
            <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">{localError}</p>
          )}

          {/* ── ACTION REQUIRED (admin only — backend enforces ADMIN role) ── */}
          {canReview && issue.status === 'REPORTED' && confirm === null && (
            <div className="border-t border-line pt-4">
              <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide mb-2">Action required</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  disabled={actionLoading}
                  onClick={() => setConfirm('accept')}
                  className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                >
                  <CheckCircle2 size={16} /> Accept Report
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setConfirm('reject')}
                  className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                >
                  <XCircle size={16} /> Reject Report
                </button>
              </div>
            </div>
          )}

          {canReview && issue.status === 'REPORTED' && confirm === 'accept' && (
            <div className="border border-civic-green/40 rounded-2xl p-4 space-y-3">
              <p className="font-extrabold text-sm">Accept this report?</p>
              <p className="text-xs text-soft">Accepting confirms the issue is valid and moves it to response.</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => setConfirm(null)} disabled={actionLoading} className="flex-1 font-bold text-sm px-4 py-2.5 rounded-xl border border-line hover:border-brand disabled:opacity-60">Cancel</button>
                <button onClick={doAccept} disabled={actionLoading} className="flex-1 font-bold text-sm px-4 py-2.5 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60">
                  {actionLoading ? 'Accepting…' : 'Confirm Accept'}
                </button>
              </div>
            </div>
          )}

          {canReview && issue.status === 'REPORTED' && confirm === 'reject' && (
            <div className="border border-brand/40 rounded-2xl p-4 space-y-3">
              <p className="font-extrabold text-sm">Reject this report?</p>
              <label className="block text-xs font-bold">
                Reason
                <select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="mt-1.5 w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand">
                  {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block text-xs font-bold">
                Additional note (optional)
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={2} maxLength={500}
                  placeholder="Anything the citizen should know…"
                  className="mt-1.5 w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand resize-none" />
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => setConfirm(null)} disabled={actionLoading} className="flex-1 font-bold text-sm px-4 py-2.5 rounded-xl border border-line hover:border-brand disabled:opacity-60">Cancel</button>
                <button onClick={doReject} disabled={actionLoading} className="flex-1 font-bold text-sm px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60">
                  {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}

          {/* ── VERIFIED: analyse + create response task (assign) ── */}
          {canReview && issue.status === 'VERIFIED' && (
            <div className="border-t border-line pt-4 space-y-2.5">
              <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide">Create response task</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  disabled={actionLoading}
                  onClick={async () => {
                    setLocalError(null);
                    const res = await dispatch(analyzeIssueThunk(issue.id));
                    if (analyzeIssueThunk.fulfilled.match(res)) onChanged();
                    else setLocalError((res.payload as string) ?? 'Could not analyse the issue.');
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-panel text-white hover:opacity-90 disabled:opacity-60"
                >
                  <Bot size={16} /> {issue.skillRequired ? 'Re-run AI analysis' : 'Run AI analysis'}
                </button>
              </div>
              <label className="block text-xs font-bold">
                Assigned team
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                  className="mt-1.5 w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand">
                  <option value="">{workforceLoading ? 'Loading teams…' : 'Select response team'}</option>
                  {workforce.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} · {w.activeAssignments} active{w.available ? '' : ' (busy)'}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={actionLoading || !assigneeId}
                onClick={doAssign}
                className="w-full flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
              >
                <UserCheck size={16} /> {actionLoading ? 'Creating…' : 'Create Task → IN PROGRESS'}
              </button>
            </div>
          )}

          {/* ── Authority field actions on own assignments ── */}
          {!canReview && assignedToMe && (issue.status === 'ASSIGNED' || issue.status === 'IN_PROGRESS') && (
            <div className="border-t border-line pt-4 space-y-2.5">
              <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide">Field response</p>
              {issue.status === 'ASSIGNED' && (
                <button disabled={actionLoading} onClick={doStart}
                  className="w-full font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60">
                  {actionLoading ? 'Starting…' : 'Start Response'}
                </button>
              )}
              {issue.status === 'IN_PROGRESS' && (
                <>
                  <textarea value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={2} maxLength={500}
                    placeholder="Resolution note (visible to the citizen)…"
                    className="w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand resize-none" />
                  <button disabled={actionLoading} onClick={doResolve}
                    className="w-full font-bold text-sm px-4 py-3 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60">
                    {actionLoading ? 'Resolving…' : 'Mark Resolved'}
                  </button>
                </>
              )}
            </div>
          )}
          {!canReview && issue.status === 'REPORTED' && (
            <p className="text-[11px] text-mute border-t border-line pt-3">
              Verification is handled by the command center. You will be notified when this report is assigned.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={viewOnMap}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-3 rounded-xl border border-line bg-canvas hover:border-brand">
              <Navigation size={15} /> View on Map
            </button>
            <button onClick={onClose}
              className="flex-1 text-sm font-bold px-4 py-3 rounded-xl border border-line hover:border-brand">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
