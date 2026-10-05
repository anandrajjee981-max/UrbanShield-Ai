import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, logoutThunk, clearAuthError } from '../store/slices/authSlice';
import { popIn } from '../animations/gsap';
import { homeForRole } from '../utils/roleHome';

const inputCls =
  'w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

/**
 * Dedicated admin entry point (public route: /admin/login).
 *
 * Same backend API as citizen/authority login (POST /api/auth/login is
 * role-agnostic — the role comes from the DB, never from the request), but
 * this page enforces role === 'ADMIN' on the client:
 * any non-admin credential is immediately logged out with a clear error,
 * so a citizen can never land inside the admin dashboards from here.
 * ADMIN accounts are DB-seeded (public /register only allows CITIZEN/AUTHORITY).
 */
export default function AdminLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleError, setRoleError] = useState<string | null>(null);

  useEffect(() => { popIn('.auth-card'); }, []);
  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to={homeForRole('ADMIN')} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRoleError(null);
    const res = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(res)) {
      if (res.payload.role !== 'ADMIN') {
        await dispatch(logoutThunk());
        setRoleError('This account is not an ADMIN. Citizens/authorities use the main Login page.');
        return;
      }
      navigate(homeForRole('ADMIN'), { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="auth-card bg-card border border-line rounded-3xl shadow-xl w-full max-w-md p-6 md:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={28} className="text-brand" />
          <div>
            <p className="font-extrabold leading-none">UrbanShieldAI · Admin</p>
            <p className="text-[11px] text-mute">Restricted — command center only</p>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold mt-5">Admin login</h1>
        <p className="text-sm text-soft mt-1">Sign in with a DB-seeded ADMIN account to open the admin dashboard.</p>

        <form onSubmit={submit} className="space-y-3.5 mt-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Admin email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@civic.local" className={`${inputCls} mt-1.5`} autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password" className={`${inputCls} mt-1.5`} autoComplete="current-password" />
          </div>
          {(roleError || error) && (
            <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">
              {roleError ?? error}
            </p>
          )}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-70">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <LogIn size={16} />{loading ? 'Verifying…' : 'Login → Admin Dashboard'}
          </button>
        </form>

        <p className="text-sm text-center text-soft mt-5">
          Citizen / Authority? <Link to="/login" className="font-bold text-brand">Main login</Link>
        </p>
        <p className="text-[11px] text-center text-mute mt-2">
          <Link to="/" className="underline">← Back to Home</Link> · No admin account? Ask backend owner to seed one (UPDATE users SET role='ADMIN').
        </p>
      </div>
    </div>
  );
}
