import { useEffect, useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { adminCreateUser, clearCreateUser } from '../../store/slices/adminSlice';
import type { ProvisionableRole } from '../../services/admin.service';
import { PageHeader, StatusBadge } from '../../components/admin/ui';
import { inputCls } from '../../components/admin/ui';

const ROLES: ProvisionableRole[] = ['CITIZEN', 'AUTHORITY', 'ADMIN'];

const ROLE_HINT: Record<ProvisionableRole, string> = {
  CITIZEN: 'Reports issues and tracks their own reports.',
  AUTHORITY: 'Candidate — must still apply and be verified before reviewing issues.',
  ADMIN: 'Full console access: monitoring, verification, analytics and user provisioning.',
};

/**
 * /admin/users/new — provision any account type, including ADMIN.
 * ADMIN-only (route + backend guards). The public register page can never
 * create these roles; this is the governed door for it.
 */
export default function AdminCreateUserPage() {
  const dispatch = useAppDispatch();
  const { createUserLoading, createUserError, lastCreatedUser } = useAppSelector((s) => s.admin);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ProvisionableRole>('AUTHORITY');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      dispatch(clearCreateUser());
    };
  }, [dispatch]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) {
      setFormError('Name must be at least 2 characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('A valid email address is required.');
      return;
    }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setFormError('Password must be at least 8 characters with a letter and a number.');
      return;
    }
    const res = await dispatch(adminCreateUser({ name, email, password, role }));
    if (adminCreateUser.fulfilled.match(res)) {
      setName('');
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader
        title="Create User Account"
        subtitle="Provision a new CITIZEN, AUTHORITY or ADMIN account. The new user logs in with this email and password."
      />

      {lastCreatedUser && (
        <div className="bg-card border border-civic-green/40 rounded-2xl p-4 sm:p-5" role="status">
          <p className="flex items-center gap-2 font-extrabold text-sm text-ink">
            <CheckCircle2 size={17} className="text-civic-green shrink-0" /> Account created
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-sm font-bold text-ink">{lastCreatedUser.name}</span>
            <span className="text-xs text-mute">{lastCreatedUser.email}</span>
            <StatusBadge value={lastCreatedUser.role} />
          </div>
          <p className="text-[11px] text-mute mt-2">
            Share the credentials securely — passwords are stored as bcrypt hashes and cannot be read back.
          </p>
        </div>
      )}

      {(formError || createUserError) && (
        <div className="text-sm font-semibold bg-brand-soft border border-brand/30 text-brand rounded-xl px-4 py-3 whitespace-pre-line" role="alert">
          {formError ?? createUserError}
        </div>
      )}

      <form onSubmit={submit} className="bg-card border border-line rounded-2xl p-4 sm:p-6 space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-soft">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Asha Verma"
            maxLength={120}
            autoComplete="name"
            className={`${inputCls} mt-1.5`}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-soft">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@civic.local"
            maxLength={320}
            autoComplete="email"
            className={`${inputCls} mt-1.5`}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-soft">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, 1 letter + 1 number"
            maxLength={72}
            autoComplete="new-password"
            className={`${inputCls} mt-1.5`}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-soft">Role</label>
          <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
            {ROLES.map((r) => (
              <label
                key={r}
                className={`text-xs font-bold px-3 py-2.5 rounded-xl border cursor-pointer text-center transition-colors ${
                  role === r ? 'bg-brand text-white border-transparent' : 'bg-canvas text-soft border-line hover:border-brand'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === r}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>
          <p className="text-[11px] text-mute mt-1.5">{ROLE_HINT[role]}</p>
        </div>
        <button
          type="submit"
          disabled={createUserLoading}
          className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
        >
          <UserPlus size={16} /> {createUserLoading ? 'Creating…' : `Create ${role} Account`}
        </button>
      </form>
    </div>
  );
}
