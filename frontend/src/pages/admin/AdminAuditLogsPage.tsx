import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAuthorityApplications } from '../../store/slices/adminSlice';
import type { ApiSuccess } from '../../services/api';
import type { AuthorityAuditEntry } from '../../services/admin.service';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from '../../components/admin/ui';

interface Row extends AuthorityAuditEntry {
  applicationId: string;
  applicant: string;
}

/**
 * /admin/audit-logs — aggregated decision history.
 * No global audit endpoint exists, so recent applications' trails are
 * collected per-application and merged newest-first.
 */
export default function AdminAuditLogsPage() {
  const dispatch = useAppDispatch();
  const { applications, applicationsFetch } = useAppSelector((s) => s.admin);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAuthorityApplications({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (applications.length === 0) return;
      setLoading(true);
      setError(null);
      try {
        const recent = [...applications]
          .sort((a, b) => +new Date(b.submittedAt) - +new Date(a.submittedAt))
          .slice(0, 20);
        const settled = await Promise.all(
          recent.map(async (a) => {
            try {
              const res = await api.get<ApiSuccess<{ entries: AuthorityAuditEntry[] }>>(
                `/admin/authority-applications/${a.id}/audit`,
              );
              return res.data.data.entries.map((e) => ({
                ...e,
                applicationId: a.id,
                applicant: a.fullName,
              }));
            } catch {
              return [] as Row[];
            }
          }),
        );
        if (!cancelled) {
          setRows(
            settled
              .flat()
              .sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt)),
          );
        }
      } catch {
        if (!cancelled) setError('Unable to load audit logs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [applications]);

  const reload = () => dispatch(fetchAuthorityApplications({ limit: 100 }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        subtitle="Immutable decision history across authority applications."
        actions={
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {applicationsFetch.loading || loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : error ?? applicationsFetch.error ? (
        <ErrorState title={error ?? 'Unable to load audit logs.'} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState title="No audit events yet." hint="Decisions on applications will appear here." />
      ) : (
        <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
          <ol className="relative border-l-2 border-line ml-2 space-y-4">
            {rows.map((e) => (
              <li key={e.id} className="ml-4">
                <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-tag border-tag" />
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={e.action} />
                  <Link
                    to={`/admin/authority-applications/${e.applicationId}`}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    {e.applicant}
                  </Link>
                  <span className="text-[11px] text-mute">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-soft mt-1">
                  {e.previousStatus ? `${e.previousStatus} → ${e.newStatus}` : `→ ${e.newStatus}`}
                  {e.adminId ? ` · by admin ${e.adminId.slice(0, 8)}` : ' · by applicant'}
                  {e.reason ? ` · “${e.reason}”` : ''}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
