import { useEffect } from 'react';
import { Bot } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchReports } from '../store/slices/reportsSlice';
import { fetchMyTasks, fetchReviewQueue } from '../store/slices/workflowSlice';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

/**
 * Role-aware insights, backed only by real workflow data:
 * - CITIZEN sees their own reports and live statuses.
 * - AUTHORITY sees the review queue they act on.
 * - ADMIN sees the VERIFIED monitoring queue.
 * AI analysis/assignment briefings do not exist on the backend yet, so none
 * are rendered — only genuine review metadata.
 */
export default function AiInsights() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const reports = useAppSelector((s) => s.reports.items);
  const reportsLoading = useAppSelector((s) => s.reports.loading);
  const { tasks, tasksLoading, queue, queueLoading } = useAppSelector(
    (s) => s.workflow,
  );
  useGsapEntrance('.gs-in', [reports.length, tasks.length, queue.length]);

  useEffect(() => {
    if (role === 'CITIZEN') dispatch(fetchReports());
    else if (role === 'AUTHORITY') dispatch(fetchMyTasks());
    else dispatch(fetchReviewQueue({ status: 'VERIFIED' }));
  }, [dispatch, role]);

  const loading = reportsLoading || tasksLoading || queueLoading;

  return (
    <div className="space-y-4 w-full max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-extrabold">AI Risk Insights</h1>

      <Card className="gs-in p-5 bg-gradient-to-r from-brand to-brand-warm border-0! text-white">
        <div className="flex items-center gap-2 font-bold"><Bot size={20} /> UrbanShield AI Engine</div>
        <p className="text-sm text-white/85 mt-1">
          Live review workflow: REPORTED reports await verify / reject decisions from verified authorities. Skill analysis and assignment scoring arrive with the next backend module.
        </p>
      </Card>

      {loading && <Loader label="Loading insights…" />}

      {/* ── CITIZEN: my reports with live statuses ── */}
      {role === 'CITIZEN' && !loading && (
        reports.length === 0 ? (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            No reports yet — submit one to track its review status here.
          </p>
        ) : (
          reports.map((r) => (
            <Card key={r.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{r.title}</p>
              {r.rawStatus && <p className="text-[11px] text-mute mt-2">Status: {r.rawStatus.replace('_', ' ')}</p>}
            </Card>
          ))
        )
      )}

      {/* ── AUTHORITY: live review queue ── */}
      {role === 'AUTHORITY' && !loading && (
        tasks.length === 0 ? (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            Review queue is empty.
          </p>
        ) : (
          tasks.map((t) => (
            <Card key={t.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{t.description.slice(0, 100)}</p>
              <p className="text-[11px] text-mute mt-2">Status: {t.status.replace('_', ' ')}</p>
            </Card>
          ))
        )
      )}

      {/* ── ADMIN: VERIFIED monitoring queue ── */}
      {role === 'ADMIN' && !loading && (
        queue.length === 0 ? (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            No VERIFIED issues right now.
          </p>
        ) : (
          queue.map((q) => (
            <Card key={q.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{q.description.slice(0, 100)}</p>
              <p className="text-[11px] text-mute mt-1">Reported by {q.citizen.name} · {q.status}</p>
            </Card>
          ))
        )
      )}
    </div>
  );
}
