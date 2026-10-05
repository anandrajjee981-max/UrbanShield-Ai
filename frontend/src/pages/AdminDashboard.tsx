import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck, Bot, Users, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchReviewQueue, fetchWorkforce } from '../store/slices/workflowSlice';
import Loader from '../components/common/Loader';

/**
 * ADMIN home (/admin-dashboard). Command-center overview built from the real
 * backend (GET /api/admin/issues + workforce):
 * REPORTED queue, VERIFIED assignment queue, active field work, REJECTED
 * cleanup — with entry points into the full /admin review workflow.
 * CITIZEN / AUTHORITY never see this (RoleRoute ADMIN).
 */
export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { queue, queueLoading, workforce } = useAppSelector((s) => s.workflow);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(fetchReviewQueue());
    dispatch(fetchWorkforce());
  }, [dispatch]);

  const count = (s: string) => queue.filter((q) => q.status === s).length;
  const reported = count('REPORTED');
  const verified = count('VERIFIED');
  const field = count('ASSIGNED') + count('IN_PROGRESS');
  const rejected = count('REJECTED');

  if (queueLoading && queue.length === 0) return <Loader label="Loading command center…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Command center — {user?.name ?? 'Admin'}</h1>
        <p className="text-xs sm:text-sm text-mute">
          {reported} awaiting review · {verified} ready to assign · {field} in field · {workforce.length} authority members.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'REPORTED — review now', value: reported, icon: ClipboardCheck, bg: 'bg-brand' },
          { label: 'VERIFIED — AI + assign', value: verified, icon: Bot, bg: 'bg-panel' },
          { label: 'Authority workforce', value: workforce.length, icon: Users, bg: 'bg-civic-blue' },
          { label: 'REJECTED — cleanup', value: rejected, icon: Trash2, bg: 'bg-civic-amber-dark' },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-line rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${c.bg} text-white flex items-center justify-center shrink-0`}>
              <c.icon size={18} />
            </div>
            <div><p className="text-2xl font-extrabold leading-none">{c.value}</p><p className="text-xs text-soft mt-1">{c.label}</p></div>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => navigate('/admin')}
          className="flex-1 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm">
          Open Review Queue → verify / reject / assign
        </button>
        <button onClick={() => navigate('/map')}
          className="flex-1 font-bold text-sm px-4 py-3 rounded-xl border border-line bg-card hover:border-brand">
          City Map
        </button>
      </div>
    </div>
  );
}
