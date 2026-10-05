import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, FileText, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearAdminAction,
  clearSelectedApplication,
  fetchAuthorityApplicationById,
  fetchAuthorityAuditTrail,
  rejectAuthorityApplication,
  verifyAuthorityApplication,
} from '../../store/slices/adminSlice';
import {
  ConfirmModal,
  EmptyState,
  ErrorState,
  SkeletonCard,
  StatusBadge,
  inputCls,
} from '../../components/admin/ui';

/** GET /admin/authority-applications/:applicationId — review + verify/reject + audit. */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
      <h2 className="font-extrabold text-sm text-ink mb-3">{title}</h2>
      {children}
    </div>
  );
}

export default function AuthorityApplicationDetailsPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const dispatch = useAppDispatch();
  const {
    selectedApplication: app,
    selectedApplicationFetch,
    auditTrail,
    auditFetch,
    actionLoading,
    actionError,
    lastAction,
  } = useAppSelector((s) => s.admin);

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) {
      // Fresh navigation (same component, new :applicationId) must not show
      // the previous application's verify/reject toast or action state.
      dispatch(clearAdminAction());
      setToast(null);
      setVerifyOpen(false);
      setRejectOpen(false);
      setReason('');
      dispatch(fetchAuthorityApplicationById(applicationId));
      dispatch(fetchAuthorityAuditTrail(applicationId));
    }
    return () => {
      dispatch(clearSelectedApplication());
      dispatch(clearAdminAction());
    };
  }, [dispatch, applicationId]);

  useEffect(() => {
    if (lastAction === 'verified') setToast('Authority application verified successfully.');
    else if (lastAction === 'rejected') setToast('Authority application rejected.');
    if (lastAction && applicationId) dispatch(fetchAuthorityAuditTrail(applicationId));
  }, [lastAction, applicationId, dispatch]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const reload = () => {
    if (applicationId) {
      dispatch(fetchAuthorityApplicationById(applicationId));
      dispatch(fetchAuthorityAuditTrail(applicationId));
    }
  };

  const confirmVerify = async () => {
    if (!applicationId) return;
    const res = await dispatch(verifyAuthorityApplication(applicationId));
    if (verifyAuthorityApplication.fulfilled.match(res)) setVerifyOpen(false);
  };

  const confirmReject = async () => {
    if (!applicationId) return;
    const res = await dispatch(
      rejectAuthorityApplication({ applicationId, reason: reason.trim() || undefined }),
    );
    if (rejectAuthorityApplication.fulfilled.match(res)) {
      setRejectOpen(false);
      setReason('');
    }
  };

  const isPending = app?.verificationStatus === 'PENDING';
  const isPdf = app?.documentMimeType === 'application/pdf';

  return (
    <div className="space-y-4">
      <Link
        to="/admin/authority-applications"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-brand hover:underline"
      >
        <ArrowLeft size={15} /> Back to applications
      </Link>

      {toast && (
        <div className="flex items-center gap-2 text-sm font-semibold bg-civic-green/10 border border-civic-green/30 text-civic-green rounded-xl px-4 py-3" role="status">
          <CheckCircle2 size={17} className="shrink-0" /> {toast}
        </div>
      )}
      {actionError && (
        <div className="text-sm font-semibold bg-brand-soft border border-brand/30 text-brand rounded-xl px-4 py-3" role="alert">
          {actionError}
        </div>
      )}

      {selectedApplicationFetch.loading && !app ? (
        <div className="space-y-3">
          <SkeletonCard lines={5} />
          <SkeletonCard lines={4} />
        </div>
      ) : selectedApplicationFetch.error && !app ? (
        <ErrorState title="Unable to load application details." onRetry={reload} />
      ) : !app ? (
        <EmptyState title="Application not found." />
      ) : (
        <>
          <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={app.verificationStatus} />
              <span className="font-mono text-xs text-mute ml-auto">{app.id}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-ink mt-2">{app.fullName}</h1>
            <p className="text-xs text-mute mt-0.5">
              {app.designation.replace(/_/g, ' ')} · {app.department.replace(/_/g, ' ')}
            </p>
          </div>

          <Section title="Applicant Information">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Full Name" value={app.fullName} />
              <Field label="Email" value={app.email} />
              <Field label="Phone" value={app.phone} />
              <Field label="Date of Birth" value={app.dateOfBirth} />
              <Field label="Address" value={app.address} />
              <Field label="Account" value={`${app.account.email} (${app.account.role})`} />
            </div>
          </Section>

          <Section title="Professional Information">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Department" value={app.department.replace(/_/g, ' ')} />
              <Field label="Designation" value={app.designation.replace(/_/g, ' ')} />
              <Field label="Jurisdiction" value={`${app.jurisdictionType.replace(/_/g, ' ')} — ${app.jurisdictionName}`} />
              <Field label="Skills" value={app.skills.map((s) => s.replace(/_/g, ' ')).join(', ') || '—'} />
              <Field label="Availability" value={app.availability.replace(/_/g, ' ')} />
              <Field label="Government ID" value={`${app.governmentIdType.replace(/_/g, ' ')} · ${app.governmentIdMasked}`} />
            </div>
          </Section>

          <Section title="Application Information">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Application ID" value={app.id} />
              <Field label="Submitted Date" value={new Date(app.submittedAt).toLocaleString()} />
              <Field label="Current Status" value={app.verificationStatus} />
              <Field
                label="Last Updated"
                value={app.updatedAt ? new Date(app.updatedAt).toLocaleString() : new Date(app.submittedAt).toLocaleString()}
              />
            </div>
            {app.rejectionReason && (
              <div className="mt-3 text-sm bg-brand-soft border border-brand/30 rounded-xl p-3">
                <span className="font-bold text-brand">Rejection reason: </span>
                <span className="text-brand">{app.rejectionReason}</span>
              </div>
            )}
          </Section>

          <Section title="Documents">
            {app.documentUrl ? (
              <div className="border border-line rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-canvas text-soft flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">Verification Document</p>
                  <p className="text-[11px] text-mute">
                    {isPdf ? 'PDF document' : app.documentMimeType ?? 'Attachment'} · opens securely in a new tab
                  </p>
                </div>
                <a
                  href={app.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl bg-panel text-white hover:opacity-90"
                >
                  <ExternalLink size={13} /> View Document
                </a>
              </div>
            ) : (
              <p className="text-xs text-mute">No verification document attached.</p>
            )}
          </Section>

          {isPending && (
            <div className="bg-card border border-line rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setVerifyOpen(true)}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> Verify Application
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={actionLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
              >
                <XCircle size={16} /> Reject Application
              </button>
            </div>
          )}

          {/* Audit history (read-only) */}
          <Section title="Audit History">
            {auditFetch.loading && auditTrail.length === 0 ? (
              <div className="space-y-2 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 bg-canvas rounded-xl" />
                ))}
              </div>
            ) : auditFetch.error && auditTrail.length === 0 ? (
              <ErrorState
                title="Unable to load audit history."
                onRetry={() => applicationId && dispatch(fetchAuthorityAuditTrail(applicationId))}
              />
            ) : auditTrail.length === 0 ? (
              <p className="text-xs text-mute">No audit events recorded yet.</p>
            ) : (
              <ol className="relative border-l-2 border-line ml-2 space-y-4">
                {auditTrail.map((e) => (
                  <li key={e.id} className="ml-4">
                    <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-brand border-brand" />
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge value={e.action} />
                      <span className="text-[11px] text-mute">
                        {new Date(e.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-soft mt-1">
                      {e.previousStatus ? `${e.previousStatus} → ${e.newStatus}` : `→ ${e.newStatus}`}
                      {e.adminId ? ` · by admin ${e.adminId.slice(0, 8)}` : ' · by applicant'}
                      {e.reason ? ` · “${e.reason}”` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Section>
        </>
      )}

      {verifyOpen && app && (
        <ConfirmModal
          title="Verify Authority Application?"
          message="This will approve the applicant as a verified authority. Make sure the submitted information and documents have been reviewed."
          confirmLabel="Confirm Verification"
          loading={actionLoading}
          onConfirm={confirmVerify}
          onCancel={() => setVerifyOpen(false)}
        />
      )}

      {rejectOpen && app && (
        <ConfirmModal
          title="Reject Authority Application"
          message="The applicant will be notified with the reason below. This cannot be undone from here."
          confirmLabel="Reject Application"
          confirmTone="danger"
          loading={actionLoading}
          onConfirm={confirmReject}
          onCancel={() => {
            setRejectOpen(false);
            setReason('');
          }}
        >
          <label className="block">
            <span className="text-xs font-bold text-soft">Reason for rejection</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Explain what was missing or invalid…"
              className={`${inputCls} mt-1.5 resize-y`}
            />
          </label>
        </ConfirmModal>
      )}
    </div>
  );
}
