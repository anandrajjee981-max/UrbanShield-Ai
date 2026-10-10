import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ConfirmModal } from '../ui';
import { fullDate, timeAgo } from './overviewStats';
import type { AdminAuthorityApplication } from '../../../services/admin.service';

/**
 * Application awaiting review with inline Approve / Reject.
 * Opens a confirmation dialog, then calls the Redux thunk passed in via
 * onDecision and surfaces the result with onToast (no API logic in here).
 */
export function ApplicationRow({
  app,
  deciding,
  onOpen,
  onDecision,
  onToast,
}: {
  app: AdminAuthorityApplication;
  deciding: boolean;
  onOpen: (app: AdminAuthorityApplication) => void;
  onDecision: (app: AdminAuthorityApplication, action: 'approve' | 'reject', reason?: string) => Promise<boolean>;
  onToast: (kind: 'success' | 'error', text: string) => void;
}) {
  const [confirm, setConfirm] = useState<'approve' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!confirm) return;
    setBusy(true);
    const ok = await onDecision(app, confirm, confirm === 'reject' ? reason : undefined);
    setBusy(false);
    setConfirm(null);
    setReason('');
    onToast(
      ok ? 'success' : 'error',
      ok
        ? confirm === 'approve'
          ? `Approved ${app.fullName}`
          : `Rejected ${app.fullName}`
        : `Could not ${confirm} ${app.fullName} — try again`,
    );
  };

  return (
    <div className="p-3 rounded-xl border border-line bg-card transition-colors hover:border-brand/50">
      <button
        type="button"
        onClick={() => onOpen(app)}
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-brand rounded-lg"
        aria-label={`Open application from ${app.fullName}`}
      >
        <span className="block text-sm font-bold text-ink truncate">{app.fullName}</span>
        <span className="block text-[11px] text-soft mt-0.5 truncate">
          {app.department.replace(/_/g, ' ')} · {app.designation.replace(/_/g, ' ')}
        </span>
        <span className="block text-[11px] text-soft mt-0.5" title={fullDate(app.submittedAt)}>
          Applied {timeAgo(app.submittedAt)}
        </span>
      </button>
      <div className="flex gap-2 mt-2.5">
        <button
          type="button"
          disabled={deciding}
          onClick={() => setConfirm('approve')}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-extrabold px-3 py-2 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Check size={13} aria-hidden /> Approve
        </button>
        <button
          type="button"
          disabled={deciding}
          onClick={() => setConfirm('reject')}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-extrabold px-3 py-2 rounded-xl border border-brand/40 text-brand hover:bg-brand hover:text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <X size={13} aria-hidden /> Reject
        </button>
      </div>
      {confirm && (
        <ConfirmModal
          title={confirm === 'approve' ? `Approve ${app.fullName}?` : `Reject ${app.fullName}?`}
          message={
            confirm === 'approve'
              ? 'They will gain verified-authority access to review citizen reports.'
              : 'They will be notified and may re-apply. An optional reason is shown to the candidate.'
          }
          confirmLabel={confirm === 'approve' ? 'Approve' : 'Reject'}
          confirmTone={confirm === 'reject' ? 'danger' : 'primary'}
          loading={busy}
          onConfirm={submit}
          onCancel={() => {
            if (!busy) {
              setConfirm(null);
              setReason('');
            }
          }}
        >
          {confirm === 'reject' && (
            <label className="block text-xs font-bold text-soft">
              Reason (optional)
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. ID document unreadable"
                maxLength={500}
                className="mt-1.5 w-full bg-card border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}
