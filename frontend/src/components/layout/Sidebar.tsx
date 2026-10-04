import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CloudSun, Map, AlertTriangle, FileText, BarChart3, Bot, Siren, ShieldCheck, ClipboardCheck, Briefcase, LogOut, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeMobileMenu } from '../../store/slices/uiSlice';
import { logoutThunk } from '../../store/slices/authSlice';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/weather', label: 'Weather', icon: CloudSun, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/map', label: 'City Map', icon: Map, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/reports', label: 'Reports', icon: FileText, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/admin', label: 'Admin Review', icon: ClipboardCheck, roles: ['ADMIN'] as const },
  { to: '/tasks', label: 'My Tasks', icon: Briefcase, roles: ['AUTHORITY'] as const },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/ai', label: 'AI Insights', icon: Bot, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
  { to: '/emergency', label: 'Emergency', icon: Siren, roles: ['CITIZEN', 'AUTHORITY', 'ADMIN'] as const },
];

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const mobile = useAppSelector((s) => s.ui.mobileMenuOpen);
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role ?? 'CITIZEN';
  const close = () => dispatch(closeMobileMenu());
  const visible = links.filter((l) => (l.roles as readonly string[]).includes(role));
  const expanded = open || mobile;
  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);

  // Close the profile popup on Escape.
  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setProfileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [profileOpen]);

  const handleLogout = () => {
    setProfileOpen(false);
    // Same order as Topbar: navigate first while authenticated, then clear session.
    navigate('/', { replace: true });
    dispatch(closeMobileMenu());
    dispatch(logoutThunk());
  };
  return (
    <>
      {/* Backdrop: tap outside the drawer to close it (mobile/tablet only) */}
      {mobile && (
        <button
          aria-label="Close menu"
          onClick={close}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}
      <aside className={`${mobile ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static z-40 inset-y-0 left-0 h-screen transition-all duration-200 bg-[#483f25] dark:bg-[#100c07] text-white ${open || mobile ? 'w-60 max-w-[75vw]' : 'w-16'} flex flex-col`}>
        <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0">
          <ShieldCheck className="text-tag shrink-0" size={26} />
          {(open || mobile) && <div className="min-w-0"><p className="font-bold leading-none truncate">UrbanShieldAI</p><p className="text-[11px] text-slate-400">City Resilience</p></div>}
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {visible.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10'}`}>
              <l.icon size={18} className="shrink-0" />{(open || mobile) && <span className="truncate">{l.label}</span>}
            </NavLink>
          ))}
        </nav>
        {/* Logged-in user card — click opens the profile popup */}
        {user ? (
          <div className="mx-3 mb-2 relative">
            {/* Outside-click layer to dismiss the popup */}
            {profileOpen && (
              <button aria-label="Close profile" onClick={() => setProfileOpen(false)}
                className="fixed inset-0 z-40 cursor-default bg-transparent" />
            )}
            <button onClick={() => setProfileOpen((v) => !v)} title="View profile & logout"
              className={`relative z-40 w-full rounded-xl bg-white/10 border transition-colors text-left ${profileOpen ? 'border-brand' : 'border-white/10 hover:border-white/25'} ${expanded ? 'p-3' : 'p-2 flex justify-center'}`}>
              {expanded ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate leading-tight">{user.name}</p>
                    <p className="text-[11px] text-slate-400 truncate leading-tight">{user.email}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      user.role === 'AUTHORITY' ? 'bg-[#4482ea] text-white'
                      : user.role === 'ADMIN' ? 'bg-[#51933a] text-white'
                      : 'bg-[#f84424] text-white'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm">
                  {initials}
                </div>
              )}
            </button>

            {/* Profile popup: full info + logout */}
            {profileOpen && (
              <div className={`absolute z-40 bottom-full mb-2 rounded-2xl bg-card text-ink border border-line shadow-2xl p-4 ${expanded ? 'left-0 right-0' : 'left-10 w-64'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-brand text-white flex items-center justify-center font-bold text-lg shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold truncate leading-tight">{user.name}</p>
                      <p className="text-xs text-mute truncate">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setProfileOpen(false)} aria-label="Close profile"
                    className="p-1.5 rounded-lg hover:bg-canvas text-mute shrink-0">
                    <X size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.role === 'AUTHORITY' ? 'bg-[#e8efff] text-[#4482ea]'
                    : user.role === 'ADMIN' ? 'bg-[#e9f2e2] text-[#51933a]'
                    : 'bg-[#fff1e6] text-[#f84424]'
                  }`}>
                    {user.role}
                  </span>
                  <span className="text-mute font-semibold">ID {user.id.slice(0, 8)}</span>
                </div>
                <button onClick={handleLogout}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        ) : null}
      </aside>
    </>
  );
}
