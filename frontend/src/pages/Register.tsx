import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { registerUser, clearAuthError } from '../store/slices/authSlice';
import { homeForRole } from '../utils/roleHome';
import { popIn } from '../animations/gsap';

const inputCls =
  'w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';

export default function Register() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useAppSelector((s) => s.auth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CITIZEN' | 'AUTHORITY'>('CITIZEN');

  useEffect(() => { popIn('.auth-card'); }, []);
  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  // A freshly registered user is already authenticated → straight to role home
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await dispatch(registerUser({ name, email, password, role }));
    if (registerUser.fulfilled.match(res)) navigate(homeForRole(res.payload.role), { replace: true });
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
        <h1 className="text-2xl font-extrabold mt-5">Create account</h1>
        <p className="text-sm text-soft mt-1">Register once — you land directly on the dashboard.</p>

        <form onSubmit={submit} className="space-y-3.5 mt-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Asha Verma" className={`${inputCls} mt-1.5`} autoComplete="name" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@civic.local" className={`${inputCls} mt-1.5`} autoComplete="email" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 chars, 1 letter + 1 number" className={`${inputCls} mt-1.5`} autoComplete="new-password" />
            <p className="text-[11px] text-mute mt-1">Backend rule: 8–72 chars with at least one letter and one number.</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-soft">I am joining as</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['CITIZEN', 'AUTHORITY'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl border ${
                    role === r
                      ? r === 'AUTHORITY'
                        ? 'bg-civic-blue text-white border-transparent'
                        : 'bg-brand text-white border-transparent'
                      : 'bg-canvas text-soft border-line'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand whitespace-pre-line">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-70">
            {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <UserPlus size={16} />{loading ? 'Creating…' : 'Register → Dashboard'}
          </button>
        </form>

        <p className="text-sm text-center text-soft mt-5">
          Already registered? <Link to="/login" className="font-bold text-brand">Login</Link>
        </p>
        <p className="text-[11px] text-center text-mute mt-2">
          <Link to="/" className="underline">← Back to Home</Link>
        </p>
      </div>
    </div>
  );
}
