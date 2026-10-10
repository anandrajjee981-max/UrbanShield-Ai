import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  FileCheck2,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutThunk } from '../../store/slices/authSlice';
import { fetchAdminIssues, fetchAuthorityApplications, fetchRetryQueue } from '../../store/slices/adminSlice';

/**
 * Admin shell: bark sidebar, brand-orange active states, collapse toggle,
 * live count badges, left-edge active indicator. Drawer on tablet/mobile.
 * Only rendered behind AdminRoute (role === ADMIN).
 */
export default function AdminLayout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { issues, applications, retryQueue } = useAppSelector((s) => s.admin);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminIssues({ limit: 100 }));
    dispatch(fetchAuthorityApplications({ limit: 100 }));
    dispatch(fetchRetryQueue());
  }, [dispatch]);

  const pendingIssues = issues.filter((i) => i.status === 'REPORTED').length;
  const pendingApps = applications.filter((a) => a.verificationStatus === 'PENDING').length;
  const pendingBucket = retryQueue.filter((e) => e.status === 'PENDING').length;

  const LINKS = [
    { to: '/admin', label: 'Overview', icon: Home, end: true, count: pendingBucket },
    { to: '/admin/issues', label: 'Issue Monitoring', icon: ClipboardList, end: false, count: pendingIssues },
    { to: '/admin/authority-applications', label: 'Authority Applications', icon: FileCheck2, end: false, count: pendingApps },
    { to: '/admin/users/new', label: 'Create User', icon: UserPlus, end: true, count: 0 },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3, end: true, count: 0 },
    { to: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, end: true, count: 0 },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon, end: true, count: 0 },
  ];

  const initials = (user?.name ?? 'A')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setDrawer(false);
    await dispatch(logoutThunk());
    navigate('/', { replace: true });
  };

  const nav = (onNavigate?: () => void, mini = false) => (
    <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Admin navigation">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={onNavigate}
          title={mini ? l.label : undefined}
          className={({ isActive }) =>
            `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand ${
              isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
            } ${mini ? 'justify-center' : ''}`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-white" />
              )}
              <l.icon size={18} className="shrink-0" aria-hidden />
              {!mini && <span className="truncate flex-1">{l.label}</span>}
              {!mini && l.count > 0 && (
                <span
                  aria-label={`${l.count} pending`}
                  className="shrink-0 min-w-6 h-6 px-1.5 rounded-full bg-white/15 text-white text-[11px] font-extrabold flex items-center justify-center"
                >
                  {l.count > 99 ? '99+' : l.count}
                </span>
              )}
              {mini && l.count > 0 && (
                <span
                  aria-label={`${l.count} pending`}
                  className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-brand text-white text-[9px] font-extrabold flex items-center justify-center border border-white/30"
                >
                  {l.count > 9 ? '9+' : l.count}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const profile = (mini = false) => (
    <div className="p-3 border-t border-white/10">
      <div className={`flex items-center gap-2.5 rounded-xl bg-white/10 border border-white/10 p-3 ${mini ? 'justify-center' : ''}`}>
        <div
          className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm shrink-0"
          title={mini ? `${user?.name ?? 'Admin'} (${user?.email ?? ''})` : undefined}
        >
          {initials}
        </div>
        {!mini && (
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm truncate leading-tight text-white">{user?.name ?? 'Admin'}</p>
            <p className="text-[11px] text-slate-400 truncate leading-tight">{user?.email ?? ''}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-civic-green text-white">
              ADMIN
            </span>
          </div>
        )}
      </div>
      <button
        onClick={handleLogout}
        aria-label={mini ? 'Logout' : undefined}
        title={mini ? 'Logout' : undefined}
        className={`mt-2 w-full flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-white/10 text-slate-200 hover:bg-brand hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-brand ${mini ? 'justify-center px-2' : 'justify-center'}`}
      >
        <LogOut size={15} aria-hidden /> {!mini && 'Logout'}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden">
      {/* Desktop sidebar (collapsible) */}
      <aside
        className={`hidden lg:flex shrink-0 flex-col bg-[#483f25] dark:bg-[#100c07] text-white transition-[width] duration-200 ${collapsed ? 'w-[76px]' : 'w-64'}`}
      >
        <div className={`flex items-center gap-2 px-4 h-16 border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-2' : ''}`}>
          <ShieldCheck size={26} className="text-tag shrink-0" aria-hidden />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold leading-none truncate">UrbanShieldAI</p>
              <p className="text-[11px] text-slate-400">Admin Console</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="p-1.5 rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand"
          >
            {collapsed ? <PanelLeftOpen size={17} aria-hidden /> : <PanelLeftClose size={17} aria-hidden />}
          </button>
        </div>
        {nav(undefined, collapsed)}
        {profile(collapsed)}
      </aside>

      {/* Mobile/tablet drawer */}
      {drawer && (
        <button aria-label="Close menu" onClick={() => setDrawer(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />
      )}
      <aside
        className={`fixed lg:hidden z-40 inset-y-0 left-0 w-64 max-w-[80vw] flex flex-col bg-[#483f25] dark:bg-[#100c07] text-white transition-transform duration-200 ${
          drawer ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={24} className="text-tag shrink-0" aria-hidden />
            <p className="font-bold leading-none truncate">UrbanShieldAI</p>
          </div>
          <button onClick={() => setDrawer(false)} aria-label="Close navigation" className="p-2 rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brand">
            <X size={18} />
          </button>
        </div>
        {nav(() => setDrawer(false))}
        {profile()}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-2 px-3 h-14 bg-cream border-b border-line shrink-0">
          <button onClick={() => setDrawer(true)} aria-label="Open navigation" className="p-2 rounded-lg hover:bg-canvas focus-visible:outline-2 focus-visible:outline-brand">
            <Menu size={20} />
          </button>
          <ShieldCheck size={20} className="text-brand" aria-hidden />
          <p className="font-extrabold text-sm">Admin Console</p>
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-civic-green/10 text-civic-green border border-civic-green/30">
            ADMIN
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto w-full max-w-[1200px] pb-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
