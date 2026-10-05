import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAuthorityApplications } from '../../store/slices/adminSlice';
import type { AuthorityVerificationStatus } from '../../services/admin.service';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonTable,
  StatusBadge,
  inputCls,
} from '../../components/admin/ui';

const STATUSES: Array<'ALL' | AuthorityVerificationStatus> = ['ALL', 'PENDING', 'VERIFIED', 'REJECTED'];

/** GET /admin/authority-applications — review queue. */
export default function AuthorityApplicationsPage() {
  const dispatch = useAppDispatch();
  const { applications, applicationsFetch } = useAppSelector((s) => s.admin);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [department, setDepartment] = useState('ALL');
  const [date, setDate] = useState('');

  useEffect(() => {
    dispatch(
      fetchAuthorityApplications(status === 'ALL' ? { limit: 100 } : { status, limit: 100 }),
    );
  }, [dispatch, status]);

  const reload = () =>
    dispatch(fetchAuthorityApplications(status === 'ALL' ? { limit: 100 } : { status, limit: 100 }));

  const departments = useMemo(
    () => ['ALL', ...Array.from(new Set(applications.map((a) => a.department)))],
    [applications],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((a) => {
      if (department !== 'ALL' && a.department !== department) return false;
      if (date && new Date(a.submittedAt).toISOString().slice(0, 10) !== date) return false;
      if (!q) return true;
      return [a.fullName, a.email, a.department, a.jurisdictionName, a.id]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [applications, search, department, date]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Authority Applications"
        subtitle="Review and verify authority applications submitted by users."
        actions={
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <div className="bg-card border border-line rounded-2xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search applicant, email…"
            className={`${inputCls} pl-9`}
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls} aria-label="Status filter">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputCls} aria-label="Department filter">
          {departments.map((d) => (
            <option key={d} value={d}>
              {d === 'ALL' ? 'All departments' : d.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} aria-label="Date filter" />
      </div>

      {applicationsFetch.loading && applications.length === 0 ? (
        <SkeletonTable rows={8} />
      ) : applicationsFetch.error && applications.length === 0 ? (
        <ErrorState title="Unable to load authority applications." onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState title="No authority applications found." hint="Try widening the filters." />
      ) : (
        <>
          <div className="hidden md:block bg-card border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute border-b border-line bg-canvas">
                  {['Applicant', 'Email', 'Department', 'Organization', 'Applied', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 font-extrabold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-semibold text-ink">{a.fullName}</td>
                    <td className="px-4 py-3 text-xs text-soft max-w-[220px] truncate">{a.email}</td>
                    <td className="px-4 py-3 text-xs">{a.department.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs text-soft max-w-[180px] truncate">{a.jurisdictionName}</td>
                    <td className="px-4 py-3 text-xs text-soft whitespace-nowrap">
                      {new Date(a.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={a.verificationStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/authority-applications/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg border border-line hover:border-brand hover:text-brand"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {visible.map((a) => (
              <div key={a.id} className="bg-card border border-line rounded-2xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{a.fullName}</p>
                    <p className="text-[11px] text-mute truncate">{a.email}</p>
                  </div>
                  <StatusBadge value={a.verificationStatus} />
                </div>
                <p className="text-[11px] text-mute mt-1">
                  {a.department.replace(/_/g, ' ')} · {new Date(a.submittedAt).toLocaleDateString()}
                </p>
                <Link
                  to={`/admin/authority-applications/${a.id}`}
                  className="mt-2.5 flex items-center justify-center gap-1 text-xs font-bold px-3 py-2.5 rounded-xl bg-brand text-white"
                >
                  <Eye size={13} /> View
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
