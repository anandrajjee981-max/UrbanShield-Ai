import { useEffect, useState } from 'react';
import { CheckCircle2, CirclePlay, MapPin, X, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addTaskComment,
  changeTaskStatus,
  fetchAssignedTaskDetail,
  fetchAssignedTasks,
  refreshTaskComments,
} from '../../store/slices/authorityTasksSlice';
import { pushNotification } from '../../store/slices/notificationsSlice';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

export default function TaskDrawer({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const { detail, comments, detailLoading, actionLoading } = useAppSelector((s) => s.authorityTasks);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      setNote('');
      setReason('');
      setRejecting(false);
      dispatch(fetchAssignedTaskDetail(taskId));
      dispatch(refreshTaskComments(taskId));
    }
  }, [dispatch, taskId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!taskId) return null;
  const task = detail?.id === taskId ? detail : null;

  const act = async (
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    extra?: { note?: string; reason?: string },
  ) => {
    const res = await dispatch(changeTaskStatus({ taskId, status, ...extra }));
    if (changeTaskStatus.fulfilled.match(res)) {
      const label =
        status === 'IN_PROGRESS' ? 'Task started.' : status === 'COMPLETED' ? 'Task marked complete.' : 'Task rejected.';
      setToast(label);
      dispatch(
        pushNotification({
          title: label,
          message: task?.title ?? taskId.slice(0, 8),
          type: 'success',
          time: 'Just now',
          category: 'AUTHORITY ACTION',
          link: '/authority/tasks',
        }),
      );
      dispatch(fetchAssignedTasks());
      dispatch(fetchAssignedTaskDetail(taskId));
      setRejecting(false);
      setReason('');
      setNote('');
    }
  };

  const sendComment = async () => {
    const body = comment.trim();
    if (!body) return;
    const res = await dispatch(addTaskComment({ taskId, body }));
    if (addTaskComment.fulfilled.match(res)) setComment('');
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label="Task details">
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/50" />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-card border-l border-line shadow-2xl overflow-y-auto p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {task && (
              <>
                <StatusBadge value={task.status} />
                <PriorityBadge value={task.priority} />
              </>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-xl hover:bg-canvas">
            <X size={17} />
          </button>
        </div>

        {toast && (
          <p className="flex items-center gap-2 text-sm font-semibold bg-civic-green/10 border border-civic-green/30 text-civic-green rounded-xl px-4 py-3" role="status">
            <CheckCircle2 size={17} className="shrink-0" /> {toast}
          </p>
        )}

        {detailLoading || !task ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading task">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-line animate-pulse" style={{ width: `${92 - i * 10}%` }} />
            ))}
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-extrabold leading-snug">{task.title || task.description.slice(0, 120)}</h2>
              <p className="text-xs text-mute mt-1 font-mono">{task.id}</p>
            </div>
            <p className="text-sm text-soft leading-relaxed">{task.description}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-canvas border border-line rounded-xl p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">Due</p>
                <p className={`font-bold mt-0.5 ${task.isOverdue ? 'text-brand' : ''}`}>
                  {task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}
                </p>
              </div>
              <div className="bg-canvas border border-line rounded-xl p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">Assigned by</p>
                <p className="font-bold mt-0.5">{task.assignedBy ?? 'Admin'}</p>
              </div>
              <div className="bg-canvas border border-line rounded-xl p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">Skill needed</p>
                <p className="font-bold mt-0.5">{task.requiredSkill.replace(/_/g, ' ')}</p>
              </div>
              <div className="bg-canvas border border-line rounded-xl p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-mute">Est. effort</p>
                <p className="font-bold mt-0.5">~{task.estimatedDurationMinutes} min</p>
              </div>
            </div>
            <p className="text-xs text-mute flex items-center gap-1">
              <MapPin size={13} className="shrink-0" />
              {task.location.type === 'MANUAL'
                ? task.location.address || 'Location not provided'
                : `GPS ${task.location.latitude.toFixed(4)}, ${task.location.longitude.toFixed(4)}`}
              {' · '}
              linked issue {task.issueId.slice(0, 8)}
            </p>
            {task.imageUrl && (
              <img src={task.imageUrl} alt="Issue evidence" className="w-full max-h-56 object-cover rounded-xl border border-line" loading="lazy" />
            )}
            {task.workNotes && <p className="text-xs bg-canvas border border-line rounded-xl p-3">Note: {task.workNotes}</p>}
            {task.rejectionReason && <p className="text-xs bg-brand/5 border border-brand/30 text-brand rounded-xl p-3">Rejection reason: {task.rejectionReason}</p>}

            {/* Actions */}
            <div className="border-t border-line pt-3 space-y-2">
              {task.status === 'ASSIGNED' && (
                <button
                  disabled={actionLoading}
                  onClick={() => void act('IN_PROGRESS')}
                  className="w-full inline-flex items-center justify-center gap-1.5 font-bold text-xs px-3 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                >
                  <CirclePlay size={14} /> {actionLoading ? 'Working…' : 'Start task'}
                </button>
              )}
              {task.status === 'IN_PROGRESS' && (
                <>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Completion note / proof reference (optional)"
                    maxLength={2000}
                    className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
                  />
                  <button
                    disabled={actionLoading}
                    onClick={() => void act('COMPLETED', { note: note.trim() || undefined })}
                    className="w-full inline-flex items-center justify-center gap-1.5 font-bold text-xs px-3 py-2.5 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <CheckCircle2 size={14} /> {actionLoading ? 'Working…' : 'Mark complete'}
                  </button>
                </>
              )}
              {(task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') &&
                (rejecting ? (
                  <div className="space-y-2 border border-brand/30 rounded-xl p-3">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Rejection reason (required)"
                      maxLength={500}
                      className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setRejecting(false); setReason(''); }}
                        className="flex-1 font-bold text-xs px-3 py-2.5 rounded-xl border border-line hover:border-brand"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={actionLoading || !reason.trim()}
                        onClick={() => void act('CANCELLED', { reason: reason.trim() })}
                        className="flex-1 inline-flex items-center justify-center gap-1 font-bold text-xs px-3 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                      >
                        <XCircle size={14} /> Confirm reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    disabled={actionLoading}
                    onClick={() => setRejecting(true)}
                    className="w-full inline-flex items-center justify-center gap-1.5 font-bold text-xs px-3 py-2.5 rounded-xl border border-line hover:border-brand disabled:opacity-60"
                  >
                    <XCircle size={14} /> Reject with reason
                  </button>
                ))}
            </div>

            {/* Comments */}
            <div className="border-t border-line pt-3 space-y-2">
              <p className="font-extrabold text-sm">Notes & comments ({comments.length})</p>
              {comments.length === 0 ? (
                <p className="text-xs text-mute">No notes yet — add progress updates here.</p>
              ) : (
                <ol className="space-y-2">
                  {comments.map((c) => (
                    <li key={c.id} className="bg-canvas border border-line rounded-xl p-3">
                      <p className="text-xs">{c.body}</p>
                      <p className="text-[10px] text-mute mt-1 font-semibold">
                        {c.authorName ?? c.authorRole} · {new Date(c.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
              <div className="flex gap-2">
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a progress note…"
                  maxLength={2000}
                  className="flex-1 bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
                />
                <button
                  onClick={() => void sendComment()}
                  disabled={!comment.trim()}
                  className="font-bold text-xs px-4 py-2 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Activity timeline */}
            <ol className="relative border-l-2 border-line ml-2 space-y-3 pt-1">
              {[
                { label: 'Assigned', on: true, at: task.createdAt },
                { label: 'In Progress', on: task.status !== 'ASSIGNED', at: task.updatedAt },
                { label: 'Completed', on: task.status === 'COMPLETED', at: task.completedAt },
              ].map((t) => (
                <li key={t.label} className="ml-4">
                  <span className={`absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 ${t.on ? 'bg-brand border-brand' : 'bg-card border-line'}`} />
                  <p className={`text-xs font-bold ${t.on ? '' : 'text-mute'}`}>{t.label}</p>
                  {t.at && <p className="text-[10px] text-mute">{new Date(t.at).toLocaleString()}</p>}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
