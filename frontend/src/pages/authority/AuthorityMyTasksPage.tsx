import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList, ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAssignedTasks, type TasksTab } from '../../store/slices/authorityTasksSlice';
import { pushNotification } from '../../store/slices/notificationsSlice';
import TaskCard from '../../components/tasks/TaskCard';
import TaskDrawer from '../../components/tasks/TaskDrawer';
import type { AssignedTask, AssignedTaskPriority } from '../../services/api';
import { useGsapEntrance } from '../../hooks/useGsapEntrance';

const TABS: Array<{ key: TasksTab; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'OVERDUE', label: 'Overdue' },
];

const POLL_MS = 30_000;

export default function AuthorityMyTasksPage() {
  const dispatch = useAppDispatch();
  const { tasks, counts, loading, error, lastFetchedAt } = useAppSelector((s) => s.authorityTasks);
  const [tab, setTab] = useState<TasksTab>('ALL');
  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<'ALL' | AssignedTaskPriority>('ALL');
  const [sortDue, setSortDue] = useState<'due' | 'newest'>('due');
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  useGsapEntrance('.gs-in', [tasks.length, tab]);

  // Initial load + 30s polling.
  useEffect(() => {
    dispatch(fetchAssignedTasks());
    const t = setInterval(() => dispatch(fetchAssignedTasks()), POLL_MS);
    return () => clearInterval(t);
  }, [dispatch]);

  // Bell notification when the admin assigns a brand-new task.
  useEffect(() => {
    if (tasks.length === 0) return;
    const seen = seenRef.current;
    const fresh = tasks.filter((t) => !seen.has(t.id));
    if (seen.size > 0 && fresh.length > 0) {
      const first = fresh[0] as AssignedTask;
      dispatch(
        pushNotification({
          title: 'New task assigned',
          message: first.title ?? first.description.slice(0, 60),
          type: 'info',
          time: 'Just now',
          category: 'AUTHORITY ACTION',
          link: '/authority/tasks',
        }),
      );
      setToast(`${fresh.length} new task${fresh.length === 1 ? '' : 's'} assigned.`);
    }
    seenRef.current = new Set(tasks.map((t) => t.id));
  }, [dispatch, tasks]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = tasks.filter((t) => {
      if (tab === 'OVERDUE' && !t.isOverdue) return false;
      if (tab !== 'ALL' && tab !== 'OVERDUE' && t.status !== tab) return false;
      if (priority !== 'ALL' && t.priority !== priority) return false;
      if (q && ![t.title ?? '', t.description, t.issueType, t.status].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sortDue === 'newest') return +new Date(b.createdAt) - +new Date(a.createdAt);
      const ad = a.dueDate ? +new Date(a.dueDate) : Number.POSITIVE_INFINITY;
      const bd = b.dueDate ? +new Date(b.dueDate) : Number.POSITIVE_INFINITY;
      return ad - bd || +new Date(b.createdAt) - +new Date(a.createdAt);
    });
    return out;
  }, [tasks, tab, priority, query, sortDue]);

  const notVerified = error?.includes('verified') ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">My Tasks ({counts.pending + counts.inProgress} open)</h1>
          <p className="text-xs sm:text-sm text-mute">
            Tasks assigned to you by the admin. Auto-refreshes every 30s
            {lastFetchedAt ? ` · updated ${new Date(lastFetchedAt).toLocaleTimeString()}` : ''}.
          </p>
        </div>
        <Link to="/tasks" className="text-xs font-bold text-brand hover:underline">
          Open Review Queue →
        </Link>
      </div>

      {/* Dashboard widget counts — clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Pending', n: counts.pending, tab: 'ASSIGNED' as TasksTab },
          { label: 'In Progress', n: counts.inProgress, tab: 'IN_PROGRESS' as TasksTab },
          { label: 'Overdue', n: counts.overdue, tab: 'OVERDUE' as TasksTab },
          { label: 'Completed', n: counts.completed, tab: 'COMPLETED' as TasksTab },
        ].map((c) => (
          <button
            key={c.label}
            onClick={() => setTab(c.tab)}
            className={`bg-card border rounded-2xl px-4 py-3 text-left hover:border-brand transition-colors ${tab === c.tab ? 'border-brand' : 'border-line'}`}
          >
            <p className="text-2xl font-extrabold leading-none">{c.n}</p>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-mute mt-1.5">{c.label}</p>
          </button>
        ))}
      </div>

      {toast && (
        <p className="flex items-center gap-2 text-sm font-semibold bg-civic-green/10 border border-civic-green/30 text-civic-green rounded-xl px-4 py-3" role="status">
          <CheckCircle2 size={17} className="shrink-0" /> {toast}
        </p>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${
              tab === t.key ? 'bg-brand text-white border-transparent' : 'bg-card text-soft border-line hover:border-brand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          className="flex-1 min-w-40 bg-card border border-line rounded-xl px-3 py-2 text-xs outline-none focus:border-brand"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="bg-card border border-line rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand"
          aria-label="Priority filter"
        >
          {['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <option key={p} value={p}>{p === 'ALL' ? 'All priorities' : p}</option>
          ))}
        </select>
        <select
          value={sortDue}
          onChange={(e) => setSortDue(e.target.value as typeof sortDue)}
          className="bg-card border border-line rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand"
          aria-label="Sort order"
        >
          <option value="due">Sort: due date</option>
          <option value="newest">Sort: newest</option>
        </select>
      </div>

      {error && !notVerified && (
        <div className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
          {error}{' '}
          <button onClick={() => dispatch(fetchAssignedTasks())} className="underline">Retry</button>
        </div>
      )}

      {notVerified && (
        <div className="bg-card border border-civic-amber/40 rounded-2xl p-5 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-civic-amber/15 text-civic-amber-dark flex items-center justify-center mb-3">
            <ShieldAlert size={20} />
          </div>
          <p className="font-extrabold text-sm">Verification required</p>
          <p className="text-xs text-mute mt-1 max-w-md mx-auto">
            Your authority account has not been verified by an administrator yet. Apply for verification to unlock My Tasks.
          </p>
          <Link to="/authority/apply" className="mt-4 inline-block text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
            Apply for Verification
          </Link>
        </div>
      )}

      {loading && tasks.length === 0 ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3" aria-busy="true" aria-label="Loading tasks">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-line rounded-2xl p-4 space-y-2">
              <div className="h-4 rounded bg-line animate-pulse" style={{ width: '80%' }} />
              <div className="h-3 rounded bg-line animate-pulse" style={{ width: '60%' }} />
              <div className="h-3 rounded bg-line animate-pulse" style={{ width: '40%' }} />
            </div>
          ))}
        </div>
      ) : visible.length === 0 && !error ? (
        <div className="bg-card border border-dashed border-line rounded-2xl p-8 text-center">
          <ClipboardList size={22} className="mx-auto text-mute" />
          <p className="font-extrabold text-sm mt-2">No tasks assigned yet</p>
          <p className="text-xs text-mute mt-1">When an admin assigns you a task it will appear here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={(task) => setOpenId(task.id)} />
          ))}
        </div>
      )}

      <TaskDrawer taskId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
