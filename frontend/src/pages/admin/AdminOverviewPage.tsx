import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ClipboardList,
  Clock3,
  FileCheck2,
  Hourglass,
  ShieldCheck,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAdminIssues, fetchAdminStats, fetchAuthorityApplications } from '../../store/slices/adminSlice';
import { ErrorState, PageHeader, SkeletonCard } from '../../components/admin/ui';

/** GET /admin — operations overview with live KPIs (never hardcoded). */

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  sub: string;
  icon: typeof ClipboardList;
  accent: string;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 ${accent}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold leading-none text-ink">{value}</p>
        <p className="text-xs font-bold text-soft mt-1">{label}</p>
        <p className="text-[11px] text-mute">{sub}</p>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const dispatch = useAppDispatch();
  const { stats, statsFetch, issues, applications } = useAppSelector((s) => s.admin);

  useEffect(() => {
    dispatch(fetchAdminStats());
    dispatch(fetchAdminIssues({ limit: 100 }));
    dispatch(fetchAuthorityApplications({ limit: 100 }));
  }, [dispatch]);

  const reload = () => {
    dispatch(fetchAdminStats());
    dispatch(fetchAdminIssues({ limit: 100 }));
    dispatch(fetchAuthorityApplications({ limit: 100 }));
  };

  const recentIssues = [...issues].slice(0, 5);
  const pendingApps = applications.filter((a) => a.verificationStatus === 'PENDING').slice(0, 5);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Operations Overview"
        subtitle="City-wide monitoring, verification and accountability at a glance."
        actions={
          <button
            onClick={reload}
            className="text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand"
          >
            Refresh
          </button>
        }
      />

      {statsFetch.loading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      ) : statsFetch.error && !stats ? (
        <ErrorState title="Unable to load dashboard statistics." onRetry={reload} />
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <Kpi label="Total Reported Issues" value={stats.totalIssues} sub="All citizen reports" icon={ClipboardList} accent="bg-brand" />
          <Kpi label="Pending Issues" value={stats.pendingIssues} sub="Awaiting authority review" icon={Clock3} accent="bg-civic-amber" />
          <Kpi label="Resolved Issues" value={stats.resolvedIssues} sub="Completed review outcomes" icon={AlertOctagon} accent="bg-civic-green" />
          <Kpi label="Authority Applications" value={stats.totalApplications} sub="All submissions" icon={FileCheck2} accent="bg-panel" />
          <Kpi label="Pending Applications" value={stats.pendingApplications} sub="Needs admin review" icon={Hourglass} accent="bg-civic-amber-dark" />
          <Kpi label="Verified Authorities" value={stats.verifiedAuthorities} sub="Active verified staff" icon={ShieldCheck} accent="bg-civic-green" />
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-ink">Latest reported issues</h2>
            <Link to="/admin/issues" className="text-xs font-bold text-brand hover:underline">
              Open monitoring →
            </Link>
          </div>
          <div className="space-y-2">
            {recentIssues.length === 0 ? (
              <p className="text-xs text-mute py-4 text-center">No issues reported yet.</p>
            ) : (
              recentIssues.map((i) => (
                <Link
                  key={i.id}
                  to={`/admin/issues/${i.id}`}
                  className="block border border-line rounded-xl p-3 hover:border-brand"
                >
                  <p className="text-sm font-semibold text-ink line-clamp-1">{i.description}</p>
                  <p className="text-[11px] text-mute mt-0.5">
                    {i.issueType.replace(/_/g, ' ')} · {i.status.replace(/_/g, ' ')} ·{' '}
                    {new Date(i.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
        <div className="bg-card border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-ink">Applications awaiting review</h2>
            <Link to="/admin/authority-applications" className="text-xs font-bold text-brand hover:underline">
              Open queue →
            </Link>
          </div>
          <div className="space-y-2">
            {pendingApps.length === 0 ? (
              <p className="text-xs text-mute py-4 text-center">No pending applications.</p>
            ) : (
              pendingApps.map((a) => (
                <Link
                  key={a.id}
                  to={`/admin/authority-applications/${a.id}`}
                  className="block border border-line rounded-xl p-3 hover:border-brand"
                >
                  <p className="text-sm font-semibold text-ink">{a.fullName}</p>
                  <p className="text-[11px] text-mute mt-0.5">
                    {a.department.replace(/_/g, ' ')} · {new Date(a.submittedAt).toLocaleDateString()}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
