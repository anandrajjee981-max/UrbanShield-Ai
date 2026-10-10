import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, RefreshCw, Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminIssues } from '../../store/slices/adminSlice';
import type { AdminIssueStatus } from '../../services/admin.service';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonTable,
  StatusBadge,
  inputCls,
} from '../../components/admin/ui';

/** Statuses the backend accepts in `?status=` — the review stage only. */
const STATUSES: Array<'ALL' | AdminIssueStatus> = ['ALL', 'REPORTED', 'VERIFIED', 'REJECTED'];

/**
 * GET /admin/issues — read-only monitoring.
 * No verify / reject / resolve / status-change actions exist here by design.
 */
export default function AdminIssuesPage() {
  const dispatch = useAppDispatch();
  const { issues, issuesFetch } = useAppSelector((s) => s.admin);

  const [search, setSearch] = useState('');
  // Deep-link support for overview StatCards: /admin/issues?status=REPORTED
  const [params] = useSearchParams();
  const initialStatus = (params.get('status')?.toUpperCase() ?? 'ALL') as (typeof STATUSES)[number];
  const [status, setStatus] = useState<'ALL' | AdminIssueStatus>(
    initialStatus === 'ALL' || initialStatus === 'REPORTED' || initialStatus === 'VERIFIED' || initialStatus === 'REJECTED'
      ? initialStatus
      : 'ALL',
  );
  const [category, setCategory] = useState('ALL');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    dispatch(fetchAdminIssues(status === 'ALL' ? { limit: 100 } : { status, limit: 100 }));
  }, [dispatch, status]);

  const reload = () =>
    dispatch(fetchAdminIssues(status === 'ALL' ? { limit: 100 } : { status, limit: 100 }));

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(issues.map((i) => i.issueType)))],
    [issues],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return issues.filter((i) => {
      if (category !== 'ALL' && i.issueType !== category) return false;
      if (location.trim()) {
        const loc = `${i.address ?? ''} ${i.latitude ?? ''} ${i.longitude ?? ''}`.toLowerCase();
        if (!loc.includes(location.trim().toLowerCase())) return false;
      }
      if (date) {
        const day = new Date(i.createdAt).toISOString().slice(0, 10);
        if (day !== date) return false;
      }
      if (!q) return true;
      return [i.id, i.description, i.issueType, i.status, i.citizen.name, i.citizen.email, i.address ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [issues, search, category, location, date]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Issue Monitoring"
        subtitle="Monitor citizen-reported issues across the city."
        actions={
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {/* Filters */}
      <div className="bg-card border border-line rounded-2xl p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
        <label className="relative block sm:col-span-2 xl:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ID, title, citizen, address…"
            className={`${inputCls} pl-9`}
          />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} aria-label="Category filter">
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'ALL' ? 'All categories' : c.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={inputCls} aria-label="Status filter">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'ALL' ? 'All statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location filter (address or coords)"
          className={inputCls}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputCls}
          aria-label="Date filter"
        />
        <div className="flex items-center gap-2">
          {(search || location || date || category !== 'ALL' || status !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setLocation('');
                setDate('');
                setCategory('ALL');
                setStatus('ALL');
              }}
              className="text-xs font-bold text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
          <span className="text-xs text-mute ml-auto">
            {visible.length} of {issues.length}
          </span>
        </div>
      </div>

      {issuesFetch.loading && issues.length === 0 ? (
        <SkeletonTable rows={8} />
      ) : issuesFetch.error && issues.length === 0 ? (
        <ErrorState title="Unable to load issues." onRetry={reload} />
      ) : visible.length === 0 ? (
        <EmptyState title="No issues found." hint="Try widening the filters or refreshing." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-line rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-mute border-b border-line bg-canvas">
                  {['Issue ID', 'Category', 'Title', 'Location', 'Status', 'Reported', 'Authority', ''].map((h) => (
                    <th key={h} className="px-4 py-3 font-extrabold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0 hover:bg-canvas">
                    <td className="px-4 py-3 font-mono text-xs text-soft">{i.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{i.issueType.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <span className="line-clamp-1 font-medium text-ink">{i.description}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-soft max-w-[180px] truncate">
                      {i.address ?? (i.latitude !== null ? `${i.latitude.toFixed(3)}, ${i.longitude?.toFixed(3)}` : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={i.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-soft whitespace-nowrap">
                      {new Date(i.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-soft">{i.assignee?.name ?? 'Unassigned'}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/admin/issues/${i.id}`}
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

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {visible.map((i) => (
              <div key={i.id} className="bg-card border border-line rounded-2xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm line-clamp-2">{i.description}</p>
                  <StatusBadge value={i.status} />
                </div>
                <p className="text-[11px] text-mute mt-1">
                  {i.issueType.replace(/_/g, ' ')} · {i.id.slice(0, 8)} · {new Date(i.createdAt).toLocaleDateString()}
                </p>
                <Link
                  to={`/admin/issues/${i.id}`}
                  className="mt-2.5 flex items-center justify-center gap-1 text-xs font-bold px-3 py-2.5 rounded-xl bg-brand text-white"
                >
                  <Eye size={13} /> View Details
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
