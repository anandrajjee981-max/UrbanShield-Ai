import { useEffect, useState } from 'react';
import { MapPin, Play, CheckCheck, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchBrowseReports, fetchMyTasks, resolveTaskThunk, startTaskThunk } from '../store/slices/workflowSlice';
import Loader from '../components/common/Loader';
import AnalysisCard from '../components/workflow/AnalysisCard';
import WorkflowTracker from '../components/workflow/WorkflowTracker';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

const BROWSE_FILTERS = ['ALL', 'REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'] as const;

export default function AuthorityTasks() {
  const dispatch = useAppDispatch();
  const { tasks, tasksLoading, browse, browseLoading, actionLoading, error } = useAppSelector((s) => s.workflow);
  const myId = useAppSelector((s) => s.auth.user?.id);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [filter, setFilter] = useState<(typeof BROWSE_FILTERS)[number]>('ALL');
  useGsapEntrance('.gs-in', [tasks.length, browse.length, tab]);

  useEffect(() => {
    dispatch(fetchMyTasks());
  }, [dispatch]);

  useEffect(() => {
    if (tab === 'all') dispatch(fetchBrowseReports(filter === 'ALL' ? undefined : filter));
  }, [dispatch, tab, filter]);

  if (tasksLoading && tasks.length === 0) return <Loader label="Loading your tasks…" />;

  const active = tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Field Work ({active.length} active)</h1>
        <p className="text-xs sm:text-sm text-mute">My Tasks = assigned to you (actionable) · All Citizen Reports = every report on the city (read-only).</p>
      </div>

      <div className="flex gap-1.5 bg-canvas border border-line rounded-xl p-1 w-fit">
        {([
          { key: 'mine', label: `My Tasks (${tasks.length})` },
          { key: 'all', label: `All Citizen Reports (${browse.length})` },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
              tab === t.key ? 'bg-brand text-white' : 'text-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">{error}</p>}

      {/* ── MY TASKS (actionable) ── */}
      {tab === 'mine' && (
        <>
          {tasks.length === 0 && !tasksLoading && (
            <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
              No tasks assigned to you yet — the admin assigns VERIFIED issues from the review queue.
            </p>
          )}
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {tasks.map((t) => (
              <div key={t.id} className="gs-in bg-card border border-line rounded-2xl p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-sm line-clamp-2 min-w-0">{t.description.slice(0, 100)}</p>
                  <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-canvas border border-line text-soft">
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-mute flex items-center gap-1">
                  <MapPin size={12} className="shrink-0" />
                  {t.locationType === 'GPS' && t.latitude !== null
                    ? `GPS ${t.latitude.toFixed(4)}, ${t.longitude?.toFixed(4)}`
                    : t.address ?? 'No location'}
                </p>
                {t.imageUrl && (
                  <img src={t.imageUrl} alt="Issue evidence" className="w-full h-32 object-cover rounded-xl border border-line" loading="lazy" />
                )}
                <WorkflowTracker status={t.status} />
                <AnalysisCard skillRequired={t.skillRequired} complexity={t.complexity} effortHours={t.effortHours} compact />

                {t.status === 'ASSIGNED' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => dispatch(startTaskThunk(t.id))}
                    className="w-full flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-2.5 rounded-xl bg-civic-blue text-white hover:opacity-90 disabled:opacity-60"
                  >
                    <Play size={15} /> Start work → IN_PROGRESS
                  </button>
                )}
                {t.status === 'IN_PROGRESS' && (
                  <div className="space-y-2">
                    <input
                      value={notes[t.id] ?? ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [t.id]: e.target.value }))}
                      placeholder="Resolution note (optional)"
                      maxLength={1000}
                      className="w-full bg-canvas border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
                    />
                    <button
                      disabled={actionLoading}
                      onClick={() => dispatch(resolveTaskThunk({ issueId: t.id, note: (notes[t.id] ?? '').trim() || undefined }))}
                      className="w-full flex items-center justify-center gap-1.5 font-bold text-sm px-4 py-2.5 rounded-xl bg-civic-green text-white hover:opacity-90 disabled:opacity-60"
                    >
                      <CheckCheck size={15} /> Mark resolved → RESOLVED
                    </button>
                  </div>
                )}
                {t.status === 'RESOLVED' && t.resolutionNote && (
                  <p className="text-[11px] text-soft italic">“{t.resolutionNote}”</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ALL CITIZEN REPORTS (read-only browse) ── */}
      {tab === 'all' && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {BROWSE_FILTERS.map((f) => (
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
          {browseLoading && browse.length === 0 ? (
            <Loader label="Loading citizen reports…" />
          ) : browse.length === 0 ? (
            <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
              No {filter === 'ALL' ? '' : `${filter} `}reports on the city right now.
            </p>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {browse.map((b) => (
                <div key={b.id} className="gs-in bg-card border border-line rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm line-clamp-2 min-w-0">{b.description.slice(0, 100)}</p>
                    <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-canvas border border-line text-soft">
                      {b.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-mute flex items-center gap-1">
                    <User size={12} className="shrink-0" />
                    {b.citizen.name}
                    {b.assignedTo === myId && <span className="font-bold text-brand">· assigned to you</span>}
                    {b.assignee && b.assignedTo !== myId && <span>· crew: {b.assignee.name}</span>}
                  </p>
                  <p className="text-[11px] text-mute flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    {b.locationType === 'GPS' && b.latitude !== null
                      ? `GPS ${b.latitude.toFixed(4)}, ${b.longitude?.toFixed(4)}`
                      : b.address ?? 'No location'}
                  </p>
                  {b.imageUrl && (
                    <img src={b.imageUrl} alt="Issue evidence" className="w-full h-32 object-cover rounded-xl border border-line" loading="lazy" />
                  )}
                  <WorkflowTracker status={b.status} />
                  <AnalysisCard skillRequired={b.skillRequired} complexity={b.complexity} effortHours={b.effortHours} compact />
                  {b.resolutionNote && (
                    <p className="text-[11px] text-soft italic">“{b.resolutionNote}”</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
