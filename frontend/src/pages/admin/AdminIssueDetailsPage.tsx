import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, Lock } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { adminAssignTask, clearSelectedIssue, fetchAdminIssueById, fetchAuthorityApplications } from '../../store/slices/adminSlice';
import {
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatusBadge,
} from '../../components/admin/ui';

const IssueMiniMap = lazy(() => import('../../components/admin/IssueMiniMap'));

/** GET /admin/issues/:issueId — detailed READ-ONLY issue view. */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
    </div>
  );
}

const TIMELINE: Array<{ status: string; label: string }> = [
  { status: 'REPORTED', label: 'Reported' },
  { status: 'VERIFIED', label: 'Verified' },
  { status: 'ASSIGNED', label: 'Assigned' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'RESOLVED', label: 'Resolved' },
];

export default function AdminIssueDetailsPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const dispatch = useAppDispatch();
  const { selectedIssue: issue, selectedIssueFetch, applications, actionLoading, actionError, lastAction } = useAppSelector((s) => s.admin);
  const [authorityId, setAuthorityId] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (issueId) dispatch(fetchAdminIssueById(issueId));
    dispatch(fetchAuthorityApplications({ status: 'VERIFIED', limit: 100 }));
    return () => {
      dispatch(clearSelectedIssue());
    };
  }, [dispatch, issueId]);

  const reload = () => {
    if (issueId) dispatch(fetchAdminIssueById(issueId));
  };

  const assign = async () => {
    if (!issueId || !authorityId) return;
    const res = await dispatch(
      adminAssignTask({
        issueId,
        authorityApplicationId: authorityId,
        priority,
        ...(dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
      }),
    );
    if (adminAssignTask.fulfilled.match(res)) reload();
  };

  return (
    <div className="space-y-4">
      <Link
        to="/admin/issues"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
      >
        <ArrowLeft size={15} /> Back to monitoring
      </Link>

      {selectedIssueFetch.loading && !issue ? (
        <div className="space-y-3">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      ) : selectedIssueFetch.error && !issue ? (
        <ErrorState title="Unable to load issue details." onRetry={reload} />
      ) : !issue ? (
        <EmptyState title="Issue not found." />
      ) : (
        <>
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={issue.status} />
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-panel text-white">
                <Eye size={12} /> Admin Monitoring Mode
              </span>
              <span className="font-mono text-xs text-mute ml-auto">{issue.id}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-ink mt-3 leading-snug">
              {issue.description.slice(0, 120)}
            </h1>
            <p className="text-xs text-mute mt-2 flex items-center gap-1.5">
              <Lock size={12} /> Issue status can only be changed through the Authority workflow.
            </p>
          </div>

          {/* Issue information */}
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <h2 className="font-extrabold text-sm text-ink mb-3">Issue Information</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Issue ID" value={issue.id} />
              <Field label="Category" value={issue.issueType.replace(/_/g, ' ')} />
              <Field label="Status" value={issue.status.replace(/_/g, ' ')} />
              <Field label="Reported Date" value={new Date(issue.createdAt).toLocaleString()} />
              <Field label="Last Updated" value={new Date(issue.updatedAt).toLocaleString()} />
              <Field label="Reported By" value={`${issue.citizen.name} (${issue.citizen.email})`} />
            </div>
            <div className="mt-4">
              <Field label="Description" value={issue.description} />
            </div>
            {issue.rejectionReason && (
              <div className="mt-3 text-sm bg-brand-soft border border-brand/30 rounded-xl p-3">
                <span className="font-bold text-brand">Rejection reason: </span>
                <span className="text-brand">{issue.rejectionReason}</span>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <h2 className="font-extrabold text-sm text-ink mb-3">Location</h2>
            <div className="grid sm:grid-cols-3 gap-4 mb-3">
              <Field label="Address" value={issue.address ?? 'Not provided (GPS report)'} />
              <Field label="Latitude" value={issue.latitude !== null ? String(issue.latitude) : '—'} />
              <Field label="Longitude" value={issue.longitude !== null ? String(issue.longitude) : '—'} />
            </div>
            {issue.latitude !== null && issue.longitude !== null ? (
              <Suspense fallback={<div className="h-56 rounded-xl bg-line animate-pulse" />}>
                <IssueMiniMap lat={issue.latitude} lng={issue.longitude} />
              </Suspense>
            ) : (
              <p className="text-xs text-mute bg-canvas border border-line rounded-xl p-3">
                No coordinates for this manual-address report — no marker to display.
              </p>
            )}
          </div>

          {/* Evidence */}
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <h2 className="font-extrabold text-sm text-ink mb-3">Evidence</h2>
            {issue.imageUrl ? (
              <img
                src={issue.imageUrl}
                alt="Citizen-submitted evidence"
                className="w-full max-h-80 object-cover rounded-xl border border-line"
              />
            ) : (
              <p className="text-xs text-mute">No photo evidence attached.</p>
            )}
            <p className="text-sm text-soft mt-3 leading-relaxed">{issue.description}</p>
          </div>

          {/* Assignment — manual assign to a verified authority */}
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <h2 className="font-extrabold text-sm text-ink mb-1">Assignment</h2>
            <p className="text-[11px] text-mute mb-3">
              Only VERIFIED issues can be assigned. The task appears instantly in the authority&apos;s My Tasks (/authority/tasks).
            </p>
            <div className="grid sm:grid-cols-3 gap-4 mb-3">
              <Field label="Assigned Authority" value={issue.assignee?.name ?? 'Unassigned'} />
              <Field label="Department" value="—" />
              <Field label="Assignment Date" value={issue.assignedAt ? new Date(issue.assignedAt).toLocaleString() : '—'} />
            </div>
            {issue.status !== 'VERIFIED' ? (
              <p className="text-xs text-mute bg-canvas border border-line rounded-xl p-3">
                Assignment unlocks once the issue is VERIFIED{issue.status === 'REPORTED' ? ' (currently REPORTED — an authority must verify it first)' : ''}.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 items-end">
                <label className="flex-1 min-w-52 text-xs font-bold">
                  Authority
                  <select
                    value={authorityId}
                    onChange={(e) => setAuthorityId(e.target.value)}
                    className="mt-1 w-full bg-canvas border border-line rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
                  >
                    <option value="">Select verified authority…</option>
                    {applications
                      .filter((a) => a.verificationStatus === 'VERIFIED')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} · {a.department} ({a.email})
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Priority
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as typeof priority)}
                    className="mt-1 bg-canvas border border-line rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
                  >
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold">
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 bg-canvas border border-line rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand"
                  />
                </label>
                <button
                  onClick={() => void assign()}
                  disabled={!authorityId || actionLoading}
                  className="text-xs font-extrabold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                >
                  {actionLoading ? 'Assigning…' : 'Assign task'}
                </button>
              </div>
            )}
            {actionError && <p className="text-xs font-semibold text-brand mt-2">{actionError}</p>}
            {lastAction === 'assigned' && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-civic-green mt-2">
                <CheckCircle2 size={13} /> Task assigned — the authority now sees it under My Tasks.
              </p>
            )}
          </div>

          {/* Activity timeline (informational only) */}
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <h2 className="font-extrabold text-sm text-ink mb-1">Activity Timeline</h2>
            <p className="text-[11px] text-mute mb-4">Informational only — admin cannot advance this workflow.</p>
            <ol className="relative border-l-2 border-line ml-2 space-y-4">
              {TIMELINE.map((t) => {
                const order = ['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];
                const reached = order.indexOf(issue.status) >= order.indexOf(t.status);
                const isRejected = issue.status === 'REJECTED';
                return (
                  <li key={t.status} className="ml-4">
                    <span
                      className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 ${
                        reached && !isRejected ? 'bg-brand border-brand' : 'bg-card border-line'
                      }`}
                    />
                    <p className={`text-sm font-bold ${reached && !isRejected ? 'text-ink' : 'text-mute'}`}>
                      {t.label}
                    </p>
                    {t.status === 'REPORTED' && (
                      <p className="text-[11px] text-mute">{new Date(issue.createdAt).toLocaleString()}</p>
                    )}
                  </li>
                );
              })}
              {issue.status === 'REJECTED' && (
                <li className="ml-4">
                  <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-brand border-brand" />
                  <p className="text-sm font-bold text-brand">Rejected</p>
                  {issue.rejectedAt && (
                    <p className="text-[11px] text-mute">{new Date(issue.rejectedAt).toLocaleString()}</p>
                  )}
                </li>
              )}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
