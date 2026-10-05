import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  AUTHORITY_NOT_VERIFIED,
  fetchIncidents,
  setSeverityFilter,
} from '../store/slices/incidentsSlice';
import { setGlobalSearch } from '../store/slices/uiSlice';
import IncidentCard from '../components/incidents/IncidentCard';
import { useGsapEntrance } from '../hooks/useGsapEntrance';
import { severityColor, timeAgo } from '../utils/format';
import type { IncidentStatus, Severity } from '../types';

type StatusFilter = IncidentStatus | 'all';
type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITIES: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];

function SkeletonCard() {
  return (
    <div className="bg-card border border-line rounded-2xl shadow-sm p-4" aria-hidden>
      <div className="flex items-start justify-between gap-2">
        <div className="h-9 w-9 rounded-xl bg-line animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-line animate-pulse" />
      </div>
      <div className="h-4 w-3/4 rounded bg-line animate-pulse mt-3" />
      <div className="h-3 w-full rounded bg-line animate-pulse mt-2" />
      <div className="h-3 w-2/3 rounded bg-line animate-pulse mt-1.5" />
      <div className="h-3 w-1/2 rounded bg-line animate-pulse mt-3" />
      <div className="h-3 w-1/3 rounded bg-line animate-pulse mt-1.5" />
      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-line">
        <div className="h-4 w-20 rounded bg-line animate-pulse" />
        <div className="h-8 w-28 rounded-lg bg-line animate-pulse" />
      </div>
    </div>
  );
}

export default function Incidents() {
  const dispatch = useAppDispatch();
  const { items, loading, severityFilter, lastUpdated, error } = useAppSelector((s) => s.incidents);
  const role = useAppSelector((s) => s.auth.user?.role);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  // Ticks so the "Last updated … ago" label stays truthful without refetching.
  const [, setNow] = useState(Date.now());

  useEffect(() => { dispatch(fetchIncidents()); }, [dispatch]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const gq = globalSearch.trim().toLowerCase();
    const list = items.filter((i) => {
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (q !== '' && !(i.title + i.description + i.address).toLowerCase().includes(q)) return false;
      if (gq !== '' && !(i.title + i.address + i.category).toLowerCase().includes(gq)) return false;
      return true;
    });
    const byTime = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'oldest': return byTime(a.reportedAt, b.reportedAt);
        case 'highest': return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || byTime(b.reportedAt, a.reportedAt);
        case 'lowest': return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || byTime(b.reportedAt, a.reportedAt);
        case 'newest':
        default: return byTime(b.reportedAt, a.reportedAt);
      }
    });
  }, [items, severityFilter, statusFilter, query, globalSearch, sort]);

  useGsapEntrance('.gs-in', [filtered.length, severityFilter, statusFilter, sort]);

  // All counters derive from live state — never hardcoded.
  const countFor = (s: Severity | 'all') => (s === 'all' ? items.length : items.filter((i) => i.severity === s).length);
  const activeCount = items.filter((i) => i.status === 'active').length;
  const resolvedCount = items.filter((i) => i.status === 'resolved').length;
  const criticalCount = items.filter((i) => i.severity === 'critical').length;

  const hasActiveFilters = severityFilter !== 'all' || statusFilter !== 'all' || query.trim() !== '' || globalSearch.trim() !== '';
  const clearFilters = () => {
    dispatch(setSeverityFilter('all'));
    setStatusFilter('all');
    setQuery('');
    setSort('newest');
    dispatch(setGlobalSearch(''));
  };

  const selectCls =
    'text-xs font-bold pl-3 pr-8 py-2.5 rounded-xl border border-line bg-card text-ink outline-none hover:border-brand focus:border-brand appearance-none max-w-full';

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading incidents">
        <div>
          <div className="h-7 w-48 rounded bg-line animate-pulse" />
          <div className="h-3 w-72 max-w-full rounded bg-line animate-pulse mt-2" />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    const authorityNeedsVerification = role === 'AUTHORITY' && error === AUTHORITY_NOT_VERIFIED;

    return (
      <div className="bg-card border border-line rounded-2xl p-8 md:p-12 text-center max-w-lg mx-auto">
        <p className="text-lg font-extrabold">
          {authorityNeedsVerification ? 'Authority verification required' : 'Unable to load incidents'}
        </p>
        <p className="text-sm text-soft mt-2">
          {authorityNeedsVerification
            ? 'Incident review is available after an administrator verifies your authority account. Check your application status for updates.'
            : error}
        </p>
        {authorityNeedsVerification && (
          <Link
            to="/authority/apply"
            className="mt-5 inline-flex items-center justify-center text-sm font-bold px-6 py-3 rounded-xl border border-line hover:border-brand"
          >
            Check application status
          </Link>
        )}
        <button
          type="button"
          onClick={() => dispatch(fetchIncidents())}
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm"
        >
          <RefreshCw size={15} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* ── 1+2 · Header + live status ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold">City Incidents</h1>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-brand/10 text-brand border border-brand/30 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> Live monitoring
            </span>
          </div>
          <p className="text-xs sm:text-sm text-mute mt-1">
            Monitor active risks, prioritize critical events, and track response progress across the city.
          </p>
          <p className="text-[11px] text-mute mt-1 font-semibold">
            Last updated: {lastUpdated ? timeAgo(lastUpdated) : '—'}
            <button
              type="button"
              onClick={() => dispatch(fetchIncidents())}
              disabled={loading}
              title="Refresh incidents"
              className="ml-2 inline-flex items-center gap-1 underline text-brand disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </p>
        </div>
        {/* Risk counters — dynamic, scrollable on mobile, no page overflow */}
        <div className="flex gap-2 overflow-x-auto max-w-full pb-1" aria-label="Incidents by risk level">
          {(Object.keys(SEVERITY_RANK) as Severity[]).map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full border border-line bg-card shrink-0"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: severityColor[s] }}
              />
              {countFor(s)} {s.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* ── 16 · Command summary strip (compact, dynamic) ── */}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-line border border-line rounded-2xl overflow-hidden">
        {[
          { label: 'Total incidents', value: items.length },
          { label: 'Active', value: activeCount },
          { label: 'Critical', value: criticalCount },
          { label: 'Resolved', value: resolvedCount },
        ].map((s) => (
          <div key={s.label} className="bg-card px-4 py-3">
            <dt className="text-[10px] font-extrabold text-mute uppercase tracking-widest">{s.label}</dt>
            <dd className="text-2xl font-extrabold leading-tight">{s.value}</dd>
          </div>
        ))}
      </dl>

      {/* ── 3 · Filter toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto max-w-full pb-1" role="group" aria-label="Filter by severity">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => dispatch(setSeverityFilter(s))}
              aria-pressed={severityFilter === s}
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full border shrink-0 transition-colors ${
                severityFilter === s ? 'bg-panel text-white border-panel' : 'bg-card text-soft border-line hover:border-brand'
              }`}
            >
              {s !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: severityColor[s] }} />
              )}
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              <span className={severityFilter === s ? 'opacity-70' : 'text-mute'}>{countFor(s)}</span>
            </button>
          ))}
        </div>
        <div className="relative basis-full sm:basis-auto sm:flex-1 sm:min-w-44 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents"
            aria-label="Search incidents by title, description or location"
            className="w-full text-xs font-semibold bg-card border border-line rounded-xl pl-9 pr-8 py-2.5 outline-none hover:border-brand focus:border-brand placeholder:text-mute"
          />
          {query !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-mute hover:text-brand"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-mute">
          <span className="sr-only">Filter by status</span>
          <span aria-hidden>Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="Filter by status"
            className={selectCls}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="monitoring">Monitoring</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-mute">
          <span className="sr-only">Sort incidents</span>
          <span aria-hidden>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort incidents"
            className={selectCls}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest risk</option>
            <option value="lowest">Lowest risk</option>
          </select>
        </label>
      </div>

      {globalSearch.trim() !== '' && (
        <p className="text-xs font-semibold text-soft">
          Global search “{globalSearch.trim()}” is also applied from the top bar.
        </p>
      )}

      {/* ── Cards ── */}
      {filtered.length > 0 ? (
        <>
          <p className="text-[11px] font-bold text-mute uppercase tracking-wide">
            Showing {filtered.length} of {items.length}
          </p>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((i) => <IncidentCard key={i.id} incident={i} />)}
          </div>
        </>
      ) : (
        <div className="bg-card border border-dashed border-line rounded-2xl p-8 md:p-12 text-center">
          <p className="text-base font-extrabold">No incidents found</p>
          <p className="text-sm text-soft mt-1.5">Try changing your filters or search terms.</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
            >
              <X size={14} /> Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
