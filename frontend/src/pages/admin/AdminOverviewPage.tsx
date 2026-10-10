import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Clock3, Hourglass } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAdminIssues,
  fetchAdminStats,
  fetchAuthorityApplications,
  fetchRetryQueue,
  rejectAuthorityApplication,
  verifyAuthorityApplication,
} from '../../store/slices/adminSlice';
import { ErrorState, SkeletonCard, EmptyState } from '../../components/admin/ui';
import { StatCard } from '../../components/admin/overview/StatCard';
import { IssueRow } from '../../components/admin/overview/IssueRow';
import { IssueDrawer } from '../../components/admin/overview/IssueDrawer';
import { ApplicationRow } from '../../components/admin/overview/ApplicationRow';
import { CategoryDonut } from '../../components/admin/overview/CategoryDonut';
import { ReportsTrend } from '../../components/admin/overview/ReportsTrend';
import { IssuesOverviewMap } from '../../components/admin/overview/IssuesOverviewMap';
import { ActivityFeed } from '../../components/admin/overview/ActivityFeed';
import { OverviewHeader } from '../../components/admin/overview/OverviewHeader';
import RetryBucketSection from '../../components/admin/overview/RetryBucketSection';
import { ToastStack, makeToast, type ToastMsg } from '../../components/admin/overview/Toast';
import {
  buildActivity,
  bucketByDay,
  timeAgo,
  wowChange,
} from '../../components/admin/overview/overviewStats';
import type {
  AdminAuthorityApplication,
  AdminMonitoredIssue,
} from '../../services/admin.service';

/**
 * GET /admin — Operations Overview.
 * Same Redux data flow as before (fetchAdminStats / fetchAdminIssues /
 * fetchAuthorityApplications + verify/reject thunks); only presentation changed.
 */
export default function AdminOverviewPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { stats, statsFetch, issues, issuesFetch, applications, applicationsFetch, actionLoading } =
    useAppSelector((s) => s.admin);

  const [query, setQuery] = useState('');
  const [range, setRange] = useState<7 | 30>(30);
  const [trendRange, setTrendRange] = useState<7 | 30>(30);
  const [drawerIssue, setDrawerIssue] = useState<AdminMonitoredIssue | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = async () => {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchAdminStats()),
      dispatch(fetchAdminIssues({ limit: 100 })),
      dispatch(fetchAuthorityApplications({ limit: 100 })),
      dispatch(fetchRetryQueue()),
    ]);
    setUpdatedAt(timeAgo(new Date().toISOString()));
    setRefreshing(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushToast = (kind: 'success' | 'error', text: string) =>
    setToasts((t) => [...t.slice(-3), makeToast(kind, text)]);
  const dismissToast = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  // ── Client-side search across both queues (no API change) ──
  const q = query.trim().toLowerCase();
  const filteredIssues = useMemo(
    () =>
      q
        ? issues.filter((i) =>
            [i.description, i.issueType, i.status, i.citizen.name, i.address ?? '']
              .join(' ')
              .toLowerCase()
              .includes(q),
          )
        : issues,
    [issues, q],
  );
  const filteredApps = useMemo(
    () =>
      q
        ? applications.filter((a) =>
            [a.fullName, a.email, a.department, a.designation, a.jurisdictionName]
              .join(' ')
              .toLowerCase()
              .includes(q),
          )
        : applications,
    [applications, q],
  );

  // ── Range-aware slices for trends ──
  const rangedIssues = useMemo(() => {
    const cutoff = Date.now() - range * 86_400_000;
    return filteredIssues.filter((i) => new Date(i.createdAt).getTime() >= cutoff);
  }, [filteredIssues, range]);

  // ── 4 KPIs with deltas + sparklines ──
  const kpis = useMemo(() => {
    const issueDates = filteredIssues.map((i) => i.createdAt);
    const appDates = filteredApps.map((a) => a.submittedAt);
    const sparkOf = (dates: string[]) => bucketByDay(dates, 14).map((b) => b.count);
    return [
      {
        label: 'Total Issues',
        value: filteredIssues.length,
        sub: `Last ${range} days view`,
        icon: ClipboardList,
        accent: 'bg-brand',
        delta: wowChange(issueDates),
        spark: sparkOf(issueDates),
        to: '/admin/issues',
        openLabel: 'Open issue monitoring',
      },
      {
        label: 'Pending Review',
        value: filteredIssues.filter((i) => i.status === 'REPORTED').length,
        sub: 'Awaiting authority review',
        icon: Clock3,
        accent: 'bg-civic-amber',
        delta: wowChange(filteredIssues.filter((i) => i.status === 'REPORTED').map((i) => i.createdAt)),
        spark: sparkOf(filteredIssues.filter((i) => i.status === 'REPORTED').map((i) => i.createdAt)),
        to: '/admin/issues?status=REPORTED',
        openLabel: 'Open pending issues',
      },
      {
        label: 'Verified',
        value: filteredIssues.filter((i) => i.status === 'VERIFIED').length,
        sub: 'Completed review outcomes',
        icon: CheckCircle2,
        accent: 'bg-civic-green',
        delta: wowChange(filteredIssues.filter((i) => i.status === 'VERIFIED').map((i) => i.createdAt)),
        spark: sparkOf(filteredIssues.filter((i) => i.status === 'VERIFIED').map((i) => i.createdAt)),
        to: '/admin/issues?status=VERIFIED',
        openLabel: 'Open verified issues',
      },
      {
        label: 'Pending Applications',
        value: filteredApps.filter((a) => a.verificationStatus === 'PENDING').length,
        sub: 'Needs admin review',
        icon: Hourglass,
        accent: 'bg-civic-amber-dark',
        delta: wowChange(appDates),
        spark: sparkOf(appDates),
        to: '/admin/authority-applications?status=PENDING',
        openLabel: 'Open pending applications',
      },
    ];
  }, [filteredIssues, filteredApps, range]);

  const recentIssues = [...rangedIssues]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const pendingApps = filteredApps.filter((a) => a.verificationStatus === 'PENDING').slice(0, 5);
  const activity = useMemo(() => buildActivity(rangedIssues, filteredApps), [rangedIssues, filteredApps]);

  const decide = async (app: AdminAuthorityApplication, action: 'approve' | 'reject', reason?: string) => {
    const res =
      action === 'approve'
        ? await dispatch(verifyAuthorityApplication(app.id))
        : await dispatch(rejectAuthorityApplication({ applicationId: app.id, reason }));
    return (action === 'approve' ? verifyAuthorityApplication : rejectAuthorityApplication).fulfilled.match(res);
  };

  const loading = (statsFetch.loading && !stats) || (issuesFetch.loading && issues.length === 0);
  const failed = statsFetch.error && !stats && issues.length === 0;

  return (
    <div className="space-y-5">
      <OverviewHeader
        query={query}
        onQuery={setQuery}
        range={range}
        onRange={setRange}
        updatedAt={updatedAt}
        refreshing={refreshing}
        onRefresh={() => void reload()}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3" aria-busy="true" aria-label="Loading overview">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : failed ? (
        <ErrorState title="Unable to load dashboard statistics." onRetry={() => void reload()} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {kpis.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              sub={k.sub}
              icon={k.icon}
              accent={k.accent}
              delta={k.delta}
              spark={k.spark}
              onOpen={() => navigate(k.to)}
              openLabel={k.openLabel}
            />
          ))}
        </div>
      )}

      {/* Issues + Applications */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-ink">Latest reported issues</h2>
            <Link to="/admin/issues" className="text-xs font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded">
              Open monitoring →
            </Link>
          </div>
          {issuesFetch.loading && recentIssues.length === 0 ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : recentIssues.length === 0 ? (
            <EmptyState title={q ? 'No issues match your search.' : 'No issues reported yet.'} hint={q ? 'Try a different keyword.' : 'Filed citizen reports will appear here.'} />
          ) : (
            <div className="space-y-2">
              {recentIssues.map((i) => (
                <IssueRow key={i.id} issue={i} onOpen={setDrawerIssue} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-line rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-ink">Applications awaiting review</h2>
            <Link to="/admin/authority-applications" className="text-xs font-bold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded">
              Open queue →
            </Link>
          </div>
          {applicationsFetch.loading && pendingApps.length === 0 ? (
            <div className="space-y-2" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} lines={2} />
              ))}
            </div>
          ) : pendingApps.length === 0 ? (
            <EmptyState title={q ? 'No applications match your search.' : 'No pending applications.'} hint="New authority applications will appear here." />
          ) : (
            <div className="space-y-2">
              {pendingApps.map((a) => (
                <ApplicationRow
                  key={a.id}
                  app={a}
                  deciding={actionLoading}
                  onOpen={(app) => navigate(`/admin/authority-applications/${app.id}`)}
                  onDecision={decide}
                  onToast={pushToast}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        <CategoryDonut issues={rangedIssues} />
        <ReportsTrend issues={filteredIssues} range={trendRange} onRange={setTrendRange} />
      </div>

      {/* AI retry bucket */}
      <RetryBucketSection onToast={pushToast} />

      {/* Map + activity */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <IssuesOverviewMap issues={rangedIssues} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed events={activity} />
        </div>
      </div>

      <IssueDrawer issue={drawerIssue} onClose={() => setDrawerIssue(null)} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
