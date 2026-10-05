import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, Droplets, Flame, HeartPulse,
  Loader2, MapPin, RefreshCw, Search, Thermometer, Trash2, Wind, Wrench, X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteReport, fetchReports } from '../store/slices/reportsSlice';
import { fetchMyTasks } from '../store/slices/workflowSlice';
import { fetchAdminIssues } from '../store/slices/adminSlice';
import { pushNotification } from '../store/slices/notificationsSlice';
import { setGlobalSearch } from '../store/slices/uiSlice';
import { citizenReportFields, matchesQuery, safeIssueFields } from '../utils/issueSearch';
import { backendTypeToCategory } from '../store/slices/reportsSlice';
import type { CitizenReport } from '../types';
import ReportFormModal from '../components/reports/ReportFormModal';
import ReportReviewModal, { type ReviewIssue } from '../components/reports/ReportReviewModal';
import WorkflowTracker from '../components/workflow/WorkflowTracker';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { timeAgo } from '../utils/format';

// ---------------------------------------------------------------------------
// Shared display helpers
// ---------------------------------------------------------------------------

const categoryIcon: Record<string, typeof Droplets> = {
  flood: Droplets,
  heat: Thermometer,
  fire: Flame,
  air: Wind,
  infrastructure: Wrench,
  medical: HeartPulse,
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

const staffStatusPill: Record<string, string> = {
  REPORTED: 'bg-[#fdf0c8] text-[#965d13]',
  VERIFIED: 'bg-[#e8efff] text-[#4482ea]',
  ASSIGNED: 'bg-[#e8efff] text-[#4482ea]',
  IN_PROGRESS: 'bg-[#e8efff] text-[#4482ea]',
  RESOLVED: 'bg-[#e9f2e2] text-[#51933a]',
  REJECTED: 'bg-[#fde8e2] text-[#f84424]',
};

/** Citizen-facing status labels derived from the real backend lifecycle. */
function citizenStatus(raw: CitizenReport['rawStatus']): { label: string; cls: string } {
  switch (raw) {
    case 'REPORTED': return { label: 'SUBMITTED', cls: 'bg-[#fdf0c8] text-[#965d13]' };
    case 'VERIFIED': return { label: 'ACCEPTED', cls: 'bg-[#e8efff] text-[#4482ea]' };
    case 'ASSIGNED':
    case 'IN_PROGRESS': return { label: 'IN PROGRESS', cls: 'bg-[#e8efff] text-[#4482ea]' };
    case 'RESOLVED': return { label: 'RESOLVED', cls: 'bg-[#e9f2e2] text-[#51933a]' };
    case 'REJECTED': return { label: 'REJECTED', cls: 'bg-[#fde8e2] text-[#f84424]' };
    default: return { label: 'SUBMITTED', cls: 'bg-[#fdf0c8] text-[#965d13]' };
  }
}

function SkeletonCards() {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-card border border-line rounded-2xl p-4">
          <div className="h-4 w-2/3 rounded bg-line animate-pulse" />
          <div className="h-3 w-1/3 rounded bg-line animate-pulse mt-2" />
          <div className="h-3 w-full rounded bg-line animate-pulse mt-3" />
          <div className="h-8 w-28 rounded-lg bg-line animate-pulse mt-4" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Citizen card + citizen detail modal
// ---------------------------------------------------------------------------

function CitizenCard({ report, onView, onDelete, deleting }: {
  report: CitizenReport; onView: () => void; onDelete: (id: string) => void; deleting: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const st = citizenStatus(report.rawStatus);
  const Icon = categoryIcon[report.category] ?? AlertTriangle;
  return (
    <article className="gs-in bg-card border border-line rounded-2xl shadow-sm p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand/40 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand-soft text-brand">
          <Icon size={17} />
        </span>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full uppercase shrink-0 ${st.cls}`}>{st.label}</span>
      </div>
      <h3 className="font-extrabold text-[15px] leading-snug mt-2.5 break-words line-clamp-2">{report.title}</h3>
      <p className="text-[11px] font-mono text-mute mt-0.5">REPORT #{shortId(report.id)}</p>
      <p className="text-xs text-soft mt-2 line-clamp-2 leading-relaxed break-words">{report.description}</p>
      <div className="flex flex-col gap-1 mt-3 text-[11px] text-mute">
        <span className="flex items-center gap-1.5 min-w-0">
          <MapPin size={12} className="shrink-0 text-brand" />
          <span className="truncate font-semibold">{report.address}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Clock size={12} className="shrink-0" />
          <span className="font-semibold">Submitted {timeAgo(report.createdAt)}</span>
        </span>
      </div>
      {report.resolutionNote ? (
        <p className="text-[11px] text-soft italic mt-2 border-l-2 border-civic-green pl-2">
          Authority: “{report.resolutionNote}”
        </p>
      ) : report.rawStatus && report.rawStatus !== 'REPORTED' && report.rawStatus !== 'REJECTED' ? (
        <p className="text-[11px] text-soft mt-2">Authority response in progress — track it below.</p>
      ) : null}
      <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-line">
        <button onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-extrabold px-3 py-2.5 rounded-xl bg-brand-soft text-brand border border-brand/20 hover:bg-brand hover:text-white transition-colors">
          View Report <ArrowRight size={13} />
        </button>
        {confirming ? (
          <span className="flex items-center gap-1">
            <button onClick={() => onDelete(report.id)} disabled={deleting}
              className="text-[11px] font-bold px-2 py-2 rounded-lg bg-brand text-white hover:bg-brand-warm disabled:opacity-60">
              {deleting ? <Loader2 size={13} className="animate-spin" /> : 'Confirm'}
            </button>
            <button onClick={() => setConfirming(false)} disabled={deleting}
              className="text-[11px] font-bold px-2 py-2 rounded-lg border border-line text-soft disabled:opacity-60">
              <X size={13} />
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirming(true)} aria-label={`Delete report ${shortId(report.id)}`}
            className="p-2.5 rounded-xl text-mute hover:text-brand hover:bg-[#fde8e2]">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </article>
  );
}

function CitizenDetailModal({ report, onClose }: { report: CitizenReport; onClose: () => void }) {
  const st = citizenStatus(report.rawStatus);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Report ${shortId(report.id)} details`}>
      <button aria-label="Close details" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full sm:max-w-lg bg-card text-ink border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto p-5 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-canvas border border-line text-soft">REPORT #{shortId(report.id)}</span>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full uppercase ${st.cls}`}>{st.label}</span>
          </div>
          <button onClick={onClose} aria-label="Close details" autoFocus className="p-2 rounded-xl hover:bg-canvas text-mute shrink-0"><X size={18} /></button>
        </div>
        <h2 className="text-lg font-extrabold leading-snug break-words">{report.title}</h2>
        <p className="text-sm text-soft leading-relaxed break-words">{report.description}</p>
        {report.imageUrl && (
          <img src={report.imageUrl} alt="Report evidence photo" className="w-full max-h-64 object-cover rounded-2xl border border-line" loading="lazy" />
        )}
        <p className="text-xs text-mute flex items-center gap-1.5">
          <MapPin size={13} className="shrink-0 text-brand" /> {report.address}
          <span>· Submitted {timeAgo(report.createdAt)}</span>
        </p>
        {report.rawStatus && (
          <div>
            <p className="text-[10px] font-extrabold text-mute uppercase tracking-wide mb-1.5">Status timeline</p>
            <WorkflowTracker status={report.rawStatus} />
          </div>
        )}
        {report.resolutionNote && (
          <p className="text-xs text-soft italic border-l-2 border-civic-green pl-3">Authority response: “{report.resolutionNote}”</p>
        )}
        <button onClick={onClose} className="w-full text-sm font-bold px-4 py-3 rounded-xl border border-line hover:border-brand">Close</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type StaffStatus = 'ALL' | 'REPORTED' | 'VERIFIED' | 'REJECTED';
const STAFF_FILTERS: StaffStatus[] = ['ALL', 'REPORTED', 'VERIFIED', 'REJECTED'];
const STAFF_FILTER_LABEL: Record<StaffStatus, string> = {
  ALL: 'All', REPORTED: 'Pending', VERIFIED: 'Accepted', REJECTED: 'Rejected',
};

export default function Reports() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const isStaff = role === 'AUTHORITY' || role === 'ADMIN';
  // Only verified AUTHORITY can verify/reject (PATCH /authority/issues/...).
  // ADMIN monitors read-only.
  const canReview = role === 'AUTHORITY';

  // Citizen state
  const { items, loading, error, deletingId } = useAppSelector((s) => s.reports);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<CitizenReport | null>(null);

  // Staff state — role-scoped real sources (no browse endpoint exists):
  // AUTHORITY sees the review queue, ADMIN sees the monitoring view.
  const { tasks, tasksLoading, error: tasksError } = useAppSelector((s) => s.workflow);
  const { issues: adminIssues, issuesFetch } = useAppSelector((s) => s.admin);
  const staffItems: ReviewIssue[] = useMemo(
    () => (role === 'ADMIN' ? adminIssues : tasks),
    [role, adminIssues, tasks],
  );
  const staffLoading = role === 'ADMIN' ? issuesFetch.loading : tasksLoading;
  const staffError = role === 'ADMIN' ? issuesFetch.error : tasksError;
  const [staffFilter, setStaffFilter] = useState<StaffStatus>('ALL');
  const [staffQuery, setStaffQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [reviewIssue, setReviewIssue] = useState<ReviewIssue | null>(null);

  useEffect(() => {
    if (role === 'ADMIN') dispatch(fetchAdminIssues({ limit: 100 }));
    else if (role === 'AUTHORITY') dispatch(fetchMyTasks());
    else dispatch(fetchReports());
  }, [dispatch, role]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const filteredCitizen = items.filter((r) => matchesQuery(globalSearch, citizenReportFields(r)));

  const categories = useMemo(() => {
    const set = new Set<string>();
    staffItems.forEach((b) => set.add(b.issueType));
    return [...set].sort();
  }, [staffItems]);

  const filteredStaff = useMemo(() => {
    const q = staffQuery.trim().toLowerCase();
    return staffItems.filter((b) => {
      if (staffFilter !== 'ALL' && b.status !== staffFilter) return false;
      if (categoryFilter !== 'ALL' && b.issueType !== categoryFilter) return false;
      if (q !== '') {
        const hay = `${b.id} ${b.description} ${b.address ?? ''} ${b.issueType} ${b.citizen?.name ?? ''} ${b.citizen?.email ?? ''}`.toLowerCase().replace(/_/g, ' ');
        if (!q.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      if (globalSearch.trim() !== '' && !matchesQuery(globalSearch, [...safeIssueFields(b), b.citizen?.name, b.citizen?.email])) return false;
      return true;
    });
  }, [staffItems, staffFilter, categoryFilter, staffQuery, globalSearch]);

  useGsapEntrance('.gs-in', [isStaff ? filteredStaff.length : filteredCitizen.length, staffFilter]);

  const openReview = (issue: ReviewIssue) => setReviewIssue(issue);
  const refreshStaff = () => {
    if (role === 'ADMIN') dispatch(fetchAdminIssues({ limit: 100 }));
    else dispatch(fetchMyTasks());
    setReviewIssue((prev) => {
      if (!prev) return prev;
      // The modal stays open; the list refresh brings the updated row.
      return prev;
    });
  };

  const handleDelete = async (id: string) => {
    const res = await dispatch(deleteReport(id));
    if (deleteReport.fulfilled.match(res)) setToast(`Report ${shortId(id)} deleted.`);
    else setToast((res.payload as string) ?? 'Could not delete the report.');
  };

  const selectCls = 'text-xs font-bold pl-3 pr-8 py-2.5 rounded-xl border border-line bg-card text-ink outline-none hover:border-brand focus:border-brand appearance-none max-w-full';

  // ── CITIZEN VIEW ──
  if (!isStaff) {
    if (loading && items.length === 0) return <Loader label="Loading your reports…" />;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold">My Reports ({items.length})</h1>
            <p className="text-xs sm:text-sm text-mute">Submit issues in your city and track authority response here.</p>
          </div>
          <button onClick={() => setFormOpen(true)} className="shrink-0 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">+ New Report</button>
        </div>
        {globalSearch.trim() && (
          <p className="text-xs font-semibold text-soft flex items-center gap-2 flex-wrap">
            <span>Showing {filteredCitizen.length} of {items.length} for “{globalSearch.trim()}”</span>
            <button onClick={() => dispatch(setGlobalSearch(''))} className="underline text-brand">Clear search</button>
          </p>
        )}
        {error && (
          <div className="flex items-center justify-between gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
            <span className="whitespace-pre-line">Unable to load reports.</span>
            <button onClick={() => dispatch(fetchReports())} className="shrink-0 underline">Retry</button>
          </div>
        )}
        {items.length === 0 && !loading && !error && (
          <div className="border border-dashed border-line rounded-2xl p-8 md:p-12 text-center">
            <p className="text-base font-extrabold">No reports yet</p>
            <p className="text-sm text-soft mt-1.5">Report an issue in your city and track its progress here.</p>
            <button onClick={() => setFormOpen(true)} className="mt-4 text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">+ New Report</button>
          </div>
        )}
        {items.length > 0 && filteredCitizen.length === 0 && !loading && (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            No reports match “{globalSearch.trim()}” — try “flood”, “heat”, “resolved” or a place name.
          </p>
        )}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredCitizen.map((r) => (
            <CitizenCard key={r.id} report={r} onView={() => setViewReport(r)} onDelete={handleDelete} deleting={deletingId === r.id} />
          ))}
        </div>
        {viewReport && <CitizenDetailModal report={viewReport} onClose={() => setViewReport(null)} />}
        {formOpen && (
          <ReportFormModal
            onClose={(newId) => {
              setFormOpen(false);
              if (newId) {
                setToast(`Report ${shortId(newId)} submitted — pending review.`);
                dispatch(pushNotification({
                  title: 'Report submitted',
                  message: `Your report #${shortId(newId)} was submitted and is pending review.`,
                  type: 'info', time: 'Just now', category: 'REPORT', link: '/reports',
                }));
                dispatch(fetchReports());
              }
            }}
          />
        )}
        {toast && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-civic-green text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-md justify-center text-center">
            <CheckCircle2 size={17} className="shrink-0" />{toast}
          </div>
        )}
      </div>
    );
  }

  // ── AUTHORITY / ADMIN VIEW ──
  const total = staffItems.length;
  const pending = staffItems.filter((b) => b.status === 'REPORTED').length;
  const accepted = staffItems.filter((b) => b.status === 'VERIFIED').length;
  const rejected = staffItems.filter((b) => b.status === 'REJECTED').length;

  if (staffLoading && staffItems.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Reports to Review</h1>
          <p className="text-xs sm:text-sm text-mute">Review citizen reports, verify the information, and take action.</p>
        </div>
        <SkeletonCards />
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-extrabold">Reports to Review</h1>
          <p className="text-xs sm:text-sm text-mute">Review citizen reports, verify the information, and take action.</p>
        </div>
        <button onClick={refreshStaff} disabled={staffLoading}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand disabled:opacity-50 shrink-0">
          <RefreshCw size={13} className={staffLoading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Summary — dynamic */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line rounded-2xl overflow-hidden">
        {[
          { label: 'Total reports', value: total },
          { label: 'Pending', value: pending },
          { label: 'Accepted', value: accepted },
          { label: 'Rejected', value: rejected },
        ].map((s) => (
          <div key={s.label} className="bg-card px-4 py-3">
            <dt className="text-[10px] font-extrabold text-mute uppercase tracking-widest">{s.label}</dt>
            <dd className="text-2xl font-extrabold leading-tight">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1" role="group" aria-label="Filter by status">
          {STAFF_FILTERS.map((f) => (
            <button key={f} onClick={() => setStaffFilter(f)} aria-pressed={staffFilter === f}
              className={`text-[11px] font-bold px-3 py-2 rounded-full border shrink-0 transition-colors ${staffFilter === f ? 'bg-panel text-white border-panel' : 'bg-card text-soft border-line hover:border-brand'}`}>
              {STAFF_FILTER_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="relative basis-full sm:basis-auto sm:flex-1 sm:min-w-44 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input value={staffQuery} onChange={(e) => setStaffQuery(e.target.value)}
            placeholder="Search reports…"
            aria-label="Search by report ID, title, location or category"
            className="w-full text-xs font-semibold bg-card border border-line rounded-xl pl-9 pr-8 py-2.5 outline-none hover:border-brand focus:border-brand placeholder:text-mute" />
          {staffQuery !== '' && (
            <button onClick={() => setStaffQuery('')} aria-label="Clear report search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-mute hover:text-brand">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category" className={selectCls}>
          <option value="ALL">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {staffError && !staffError.includes('verified') && (
        <div className="flex items-center justify-between gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
          <span>Unable to load reports.</span>
          <button onClick={refreshStaff} className="shrink-0 underline">Retry</button>
        </div>
      )}
      {staffError?.includes('verified') && (
        <div className="bg-card border border-civic-amber/40 rounded-2xl p-5 text-center">
          <p className="font-extrabold text-ink text-sm">Verification required</p>
          <p className="text-xs text-mute mt-1 max-w-md mx-auto">
            Your authority account has not been verified by an administrator yet. Apply for verification to review reports.
          </p>
          <Link to="/authority/apply" className="mt-4 inline-block text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
            Apply for Verification
          </Link>
        </div>
      )}

      {staffItems.length === 0 && !staffLoading ? (
        <div className="border border-dashed border-line rounded-2xl p-8 md:p-12 text-center">
          <p className="text-base font-extrabold">You&apos;re all caught up.</p>
          <p className="text-sm text-soft mt-1.5">No citizen reports are waiting for review.</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="border border-dashed border-line rounded-2xl p-8 text-center">
          <p className="text-base font-extrabold">No reports found</p>
          <p className="text-sm text-soft mt-1.5">Try changing your filters or search terms.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] font-bold text-mute uppercase tracking-wide">Showing {filteredStaff.length} of {staffItems.length}</p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredStaff.map((b) => {
              const Icon = categoryIcon[backendTypeToCategory(b.issueType)] ?? AlertTriangle;
              return (
                <article key={b.id} className="gs-in bg-card border border-line rounded-2xl shadow-sm p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand/40 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-brand-soft text-brand">
                      <Icon size={17} />
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full uppercase shrink-0 ${staffStatusPill[b.status]}`}>
                      {b.status === 'REPORTED' ? 'PENDING REVIEW' : b.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-[15px] leading-snug mt-2.5 break-words line-clamp-2">{b.description}</h3>
                  <p className="text-[11px] font-mono text-mute mt-0.5">REPORT #{shortId(b.id)}</p>
                  <div className="flex flex-col gap-1 mt-2.5 text-[11px] text-mute">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <MapPin size={12} className="shrink-0 text-brand" />
                      <span className="truncate font-semibold">{b.address ?? 'Location not provided'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} className="shrink-0" />
                      <span className="font-semibold">Submitted {timeAgo(b.createdAt)}</span>
                      {b.citizen && (
                        <>
                          <span aria-hidden className="text-line">·</span>
                          <span className="truncate">{b.citizen.name}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                    <span className="text-[10px] font-extrabold px-2 py-1 rounded-full bg-canvas border border-line text-soft uppercase">
                      {b.issueType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <button onClick={() => openReview(b)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1 text-xs font-extrabold px-3 py-2.5 rounded-xl bg-brand-soft text-brand border border-brand/20 hover:bg-brand hover:text-white transition-colors">
                    View Details <ArrowRight size={13} />
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}

      {reviewIssue && (
        <ReportReviewModal
          issue={staffItems.find((b) => b.id === reviewIssue.id) ?? reviewIssue}
          canReview={canReview}
          onClose={() => setReviewIssue(null)}
          onChanged={refreshStaff}
        />
      )}
    </div>
  );
}
