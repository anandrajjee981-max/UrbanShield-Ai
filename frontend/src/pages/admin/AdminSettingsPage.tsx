import { ShieldCheck, User } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { PageHeader, StatusBadge } from '../../components/admin/ui';
import { API_BASE_URL } from '../../services/api';

/** /admin/settings — session, role and console preferences (no data writes). */
export default function AdminSettingsPage() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Admin session, access scope and console information."
      />

      <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
            <User size={22} />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-ink">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-mute truncate">{user?.email ?? ''}</p>
          </div>
          <span className="ml-auto">
            <StatusBadge value="ADMIN" />
          </span>
        </div>
        <dl className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-mute">User ID</dt>
            <dd className="font-mono text-xs text-ink mt-0.5 break-all">{user?.id ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-mute">Role</dt>
            <dd className="text-ink mt-0.5 font-semibold">ADMIN — full governance access</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-mute">Authentication</dt>
            <dd className="text-ink mt-0.5">JWT HTTP-only cookie session</dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-mute">API Base</dt>
            <dd className="font-mono text-xs text-ink mt-0.5 break-all">{API_BASE_URL}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-card border border-line rounded-2xl p-4 sm:p-5">
        <h2 className="font-extrabold text-sm text-ink mb-2 flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-brand" /> Access scope
        </h2>
        <ul className="text-sm text-soft space-y-1.5 list-disc pl-5">
          <li>Monitor all citizen-reported issues (read-only — status changes belong to the Authority workflow).</li>
          <li>Review, verify and reject authority applications.</li>
          <li>View the immutable audit history of every application decision.</li>
          <li>Citizen and authority dashboards are never accessible to this role, and vice versa.</li>
        </ul>
      </div>
    </div>
  );
}
