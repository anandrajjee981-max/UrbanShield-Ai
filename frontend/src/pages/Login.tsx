import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, clearAuthError } from '../store/slices/authSlice';
import { popIn } from '../animations/gsap';
import { useEffect } from 'react';

const inputCls =
  'w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export default function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  useEffect(() => { popIn('.auth-card'); }, []);
  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(res)) navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-4">
      <div className="auth-card bg-card border border-line rounded-3xl shadow-xl w-full max-w-md p-6 md:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={28} className="text-brand" />
          <div>
            <p className="font-extrabold leading-none">UrbanShieldAI</p>
            <p className="text-[11px] text-mute">City Resilience</p>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold mt-5">Welcome back</h1>
        <p className="text-sm text-soft mt-1">Login to open your city dashboard.</p>

        <form onSubmit={submit} className="space-y-3.5 mt-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="citizen@civic.local" className={`${inputCls} mt-1.5`} autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Your account password" className={`${inputCls} mt-1.5`} autoComplete="current-password" />
          </div>
          {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-70">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <LogIn size={16} />{loading ? 'Signing in…' : 'Login → Dashboard'}
          </button>
        </form>

        <p className="text-sm text-center text-soft mt-5">
          New here? <Link to="/register" className="font-bold text-brand">Create an account</Link>
        </p>
        <p className="text-[11px] text-center text-mute mt-2">
          <Link to="/" className="underline">← Back to Home</Link> · POST /api/auth/login — session is an HTTP-only cookie.
        </p>
      </div>
    </div>
  );
}
