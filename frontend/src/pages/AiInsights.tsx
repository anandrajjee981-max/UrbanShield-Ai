import { useEffect } from 'react';
import { Bot, Users } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchReports } from '../store/slices/reportsSlice';
import { fetchMyTasks, fetchReviewQueue, fetchWorkforce } from '../store/slices/workflowSlice';
import AnalysisCard from '../components/workflow/AnalysisCard';
import Card from '../components/common/Card';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

/**
 * Role-aware AI insights, backed by the real workflow:
 * - CITIZEN sees the AI briefing (skill / complexity / effort) on their own reports.
 * - AUTHORITY sees the briefing on their assigned tasks.
 * - ADMIN sees workforce availability plus every analysed VERIFIED issue.
 */
export default function AiInsights() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const reports = useAppSelector((s) => s.reports.items);
  const reportsLoading = useAppSelector((s) => s.reports.loading);
  const { tasks, tasksLoading, queue, queueLoading, workforce, workforceLoading } = useAppSelector(
    (s) => s.workflow,
  );
  useGsapEntrance('.gs-in', [reports.length, tasks.length, queue.length, workforce.length]);

  useEffect(() => {
    if (role === 'CITIZEN') dispatch(fetchReports());
    else if (role === 'AUTHORITY') dispatch(fetchMyTasks());
    else {
      dispatch(fetchWorkforce());
      dispatch(fetchReviewQueue({ status: 'VERIFIED' }));
    }
  }, [dispatch, role]);

  const loading = reportsLoading || tasksLoading || queueLoading || workforceLoading;

  const citizenBriefings = reports.filter((r) => r.skillRequired || r.complexity || r.effortHours);
  const taskBriefings = tasks;

  return (
    <div className="space-y-4 w-full max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-extrabold">AI Risk Insights</h1>

      <Card className="gs-in p-5 bg-gradient-to-r from-brand to-brand-warm border-0! text-white">
        <div className="flex items-center gap-2 font-bold"><Bot size={20} /> UrbanShield AI Engine</div>
        <p className="text-sm text-white/85 mt-1">
          Rule-based briefing on every VERIFIED report: required skill crew, complexity and effort estimate — then workforce scoring picks the best AUTHORITY member.
        </p>
      </Card>

      {loading && <Loader label="Loading insights…" />}

      {/* ── CITIZEN: briefings on my reports ── */}
      {role === 'CITIZEN' && !loading && (
        citizenBriefings.length === 0 ? (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            No AI briefings yet — they appear here once the admin verifies and analyses your reports.
          </p>
        ) : (
          citizenBriefings.map((r) => (
            <Card key={r.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{r.title}</p>
              <div className="mt-2.5">
                <AnalysisCard skillRequired={r.skillRequired ?? null} complexity={r.complexity ?? null} effortHours={r.effortHours ?? null} />
              </div>
              {r.rawStatus && <p className="text-[11px] text-mute mt-2">Status: {r.rawStatus.replace('_', ' ')}</p>}
            </Card>
          ))
        )
      )}

      {/* ── AUTHORITY: briefings on my tasks ── */}
      {role === 'AUTHORITY' && !loading && (
        tasks.length === 0 ? (
          <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
            No tasks yet — briefings appear here once issues are assigned to you.
          </p>
        ) : (
          taskBriefings.map((t) => (
            <Card key={t.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{t.description.slice(0, 100)}</p>
              <div className="mt-2.5">
                <AnalysisCard skillRequired={t.skillRequired} complexity={t.complexity} effortHours={t.effortHours} />
              </div>
              <p className="text-[11px] text-mute mt-2">Status: {t.status.replace('_', ' ')}</p>
            </Card>
          ))
        )
      )}

      {/* ── ADMIN: workforce + analysed queue ── */}
      {role === 'ADMIN' && !loading && (
        <>
          <Card className="gs-in p-5">
            <div className="flex items-center gap-2 font-bold text-sm"><Users size={16} /> Workforce availability ({workforce.length})</div>
            {workforce.length === 0 ? (
              <p className="text-xs text-mute mt-2">No AUTHORITY members registered yet.</p>
            ) : (
              <div className="mt-2.5 space-y-1.5">
                {workforce.map((w) => (
                  <div key={w.id} className="flex items-center gap-2 text-xs bg-canvas border border-line rounded-lg px-3 py-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${w.available ? 'bg-civic-green' : 'bg-tag'}`} />
                    <span className="font-bold truncate">{w.name}</span>
                    <span className="text-mute truncate hidden sm:inline">{w.email}</span>
                    <span className="ml-auto font-bold text-soft shrink-0">{w.activeAssignments} active</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          {queue.filter((q) => q.skillRequired).map((q) => (
            <Card key={q.id} className="gs-in p-5">
              <p className="font-bold text-sm line-clamp-2">{q.description.slice(0, 100)}</p>
              <p className="text-[11px] text-mute mt-1">Reported by {q.citizen.name} · {q.status}</p>
              <div className="mt-2.5">
                <AnalysisCard skillRequired={q.skillRequired} complexity={q.complexity} effortHours={q.effortHours} />
              </div>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
