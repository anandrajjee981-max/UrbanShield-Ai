import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, ChevronDown, FileText, LogOut, Menu, Moon, Search,
  Settings, ShieldCheck, Sun, User as UserIcon, X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setGlobalSearch, toggleMobileMenu, toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { closePanel, togglePanel } from '../../store/slices/notificationsSlice';
import { fetchIncidents } from '../../store/slices/incidentsSlice';
import { fetchReports } from '../../store/slices/reportsSlice';
import { setCenter } from '../../store/slices/mapSlice';
import { logoutThunk } from '../../store/slices/authSlice';
import { citizenReportFields, matchesQuery, safeIssueFields } from '../../utils/issueSearch';
import { homeForRole } from '../../utils/roleHome';

interface SearchHit { key: string; group: string; title: string; sub: string; run: () => void; }

const roleIcon = { AUTHORITY: ShieldCheck, CITIZEN: UserIcon, ADMIN: Settings } as const;

export default function Topbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useAppSelector((s) => s.notifications.items);
  const unread = notifications.filter((n) => !n.read).length;
  const user = useAppSelector((s) => s.auth.user);
  const theme = useAppSelector((s) => s.ui.theme);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const incidents = useAppSelector((s) => s.incidents.items);
  const reports = useAppSelector((s) => s.reports.items);
  const tasks = useAppSelector((s) => s.workflow.tasks);

  const [openMenu, setOpenMenu] = useState<'none' | 'feed' | 'profile'>('none');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const RoleIcon = roleIcon[user?.role ?? 'CITIZEN'];

  // Warm the searchable stores so results work from anywhere.
  useEffect(() => {
    if (incidents.length === 0) dispatch(fetchIncidents());
    if (reports.length === 0) dispatch(fetchReports());
  }, [dispatch, incidents.length, reports.length]);

  // Ctrl/Cmd+K focuses search; Escape closes any open menu.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') { setSearchOpen(false); setOpenMenu('none'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goToResults = () => {
    if (globalSearch.trim() === '') return;
    const to = user?.role === 'AUTHORITY' ? '/tasks' : user?.role === 'ADMIN' ? '/admin' : '/reports';
    if (location.pathname === to) return;
    navigate(to);
  };

  // ── Grouped live results across real store data ──
  const hits: SearchHit[] = useMemo(() => {
    const q = globalSearch.trim();
    if (q === '') return [];
    const out: SearchHit[] = [];
    const push = (group: string, list: Omit<SearchHit, 'group'>[]) => out.push(...list.slice(0, 4).map((h) => ({ ...h, group })));

    push('Reports', reports.filter((r) => matchesQuery(q, citizenReportFields(r))).map((r) => ({
      key: `rep-${r.id}`, title: r.title.length > 48 ? `${r.title.slice(0, 48)}…` : r.title,
      sub: `${r.address} · ${r.status}`,
      run: () => { dispatch(setGlobalSearch(r.title.slice(0, 24))); navigate('/reports'); },
    })));
    push('Incidents', incidents.filter((i) => matchesQuery(q, [i.title, i.description, i.address, i.category, i.status])).map((i) => ({
      key: `inc-${i.id}`, title: i.title.length > 48 ? `${i.title.slice(0, 48)}…` : i.title,
      sub: `${i.address} · ${i.severity}`,
      run: () => { dispatch(setGlobalSearch(i.title.slice(0, 24))); navigate('/incidents'); },
    })));
    if (tasks.length > 0) {
      push('Review queue', tasks.filter((t) => matchesQuery(q, safeIssueFields(t))).map((t) => ({
        key: `tsk-${t.id}`, title: t.description.length > 48 ? `${t.description.slice(0, 48)}…` : t.description,
        sub: t.status.replace(/_/g, ' '),
        run: () => { navigate(user?.role === 'ADMIN' ? '/admin' : '/tasks'); },
      })));
    }
    // Distinct matching addresses → jump the city map there.
    const locs = new Map<string, { lat: number; lng: number }>();
    for (const i of incidents) {
      if (i.lat === null || i.lng === null) continue;
      if (matchesQuery(q, [i.address]) && !locs.has(i.address)) locs.set(i.address, { lat: i.lat, lng: i.lng });
      if (locs.size >= 3) break;
    }
    push('Locations', [...locs.entries()].map(([addr, c]) => ({
      key: `loc-${addr}`, title: addr, sub: 'Open on city map',
      run: () => { dispatch(setCenter([c.lat, c.lng])); navigate('/map'); },
    })));
    return out.slice(0, 12);
  }, [globalSearch, reports, incidents, tasks, dispatch, navigate, user?.role]);

  const handleLogout = async () => {
    setOpenMenu('none');
    navigate('/', { replace: true });
    await dispatch(logoutThunk());
    navigate('/', { replace: true });
  };

  const toggle = (m: 'feed' | 'profile') => {
    dispatch(closePanel());
    setOpenMenu((prev) => (prev === m ? 'none' : m));
  };

  const profileLinks =
    user?.role === 'ADMIN'
      ? [
        { label: 'System Overview', to: '/admin-dashboard' },
        { label: 'Admin Review', to: '/admin' },
        { label: 'Reports', to: '/reports' },
      ]
      : user?.role === 'AUTHORITY'
        ? [
          { label: 'Reports to Review', to: '/reports' },
          { label: 'My Tasks', to: '/tasks' },
        ]
        : [{ label: 'My Reports', to: '/reports' }];

  return (
    <header className="min-h-16 bg-cream border-b border-line flex flex-wrap items-center gap-x-2 gap-y-2 px-2 sm:px-4 py-2 sticky top-0 z-30">
      <button className="lg:hidden p-2 rounded-lg hover:bg-canvas shrink-0" onClick={() => dispatch(toggleMobileMenu())} aria-label="Open menu"><Menu size={20} /></button>
      <button className="hidden lg:block p-2 rounded-lg hover:bg-canvas shrink-0" onClick={() => dispatch(toggleSidebar())} aria-label="Toggle sidebar"><Menu size={20} /></button>
      {/* Compact brand — the sidebar is hidden on small screens, so the navbar carries it */}
      <button
        onClick={() => navigate(user ? homeForRole(user.role) : '/')}
        title="UrbanShieldAI — City Resilience"
        aria-label="UrbanShieldAI home"
        className="lg:hidden flex items-center gap-1.5 shrink-0 px-1"
      >
        <ShieldCheck size={22} className="text-brand shrink-0" />
        <span className="hidden min-[420px]:block text-left leading-none">
          <span className="block font-extrabold text-sm">UrbanShieldAI</span>
          <span className="block text-[10px] text-mute">City Resilience</span>
        </span>
      </button>

      {/* ── Global search with live grouped results ── */}
      <div className="relative order-3 basis-full sm:order-none sm:basis-auto sm:flex-1 sm:min-w-0 sm:max-w-md min-w-0">
        {(searchOpen || openMenu !== 'none') && (
          <button
            aria-label="Dismiss menus"
            onClick={() => { setSearchOpen(false); setOpenMenu('none'); }}
            className="fixed inset-0 z-30 cursor-default bg-transparent"
          />
        )}
        <div className="relative z-40 flex items-center gap-2 h-11 bg-canvas border border-line rounded-xl pl-3 pr-1.5 min-w-0 transition-colors focus-within:border-brand">
          <Search size={16} className="text-mute shrink-0" />
          <input
            ref={searchRef}
            placeholder="Search issues, reports, people…"
            aria-label="Global search (Ctrl+K)"
            title="Search reports, incidents, tasks and places — Ctrl+K"
            value={globalSearch}
            onChange={(e) => { dispatch(setGlobalSearch(e.target.value)); onSearch?.(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { setSearchOpen(false); goToResults(); }
              if (e.key === 'Escape') setSearchOpen(false);
            }}
            className="no-focus-outline bg-transparent border-none outline-none ring-0 focus:border-none focus:outline-none focus:ring-0 text-sm text-ink placeholder:text-mute w-full min-w-0"
          />
          {globalSearch && (
            <button onClick={() => dispatch(setGlobalSearch(''))} aria-label="Clear search" className="shrink-0 p-1 rounded text-mute hover:text-brand">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden md:inline-block text-[10px] font-bold text-mute border border-line rounded px-1.5 py-0.5 shrink-0">Ctrl K</kbd>
          <button onClick={() => { setSearchOpen(false); goToResults(); }} title="Search"
            className="shrink-0 w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center hover:bg-brand-warm transition-all duration-150 active:scale-90">
            <Search size={15} />
          </button>
        </div>
        {searchOpen && globalSearch.trim() !== '' && (
          <div className="absolute z-40 left-0 right-0 mt-2 bg-card border border-line rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
            {hits.length === 0 ? (
              <p className="px-4 py-5 text-xs text-mute text-center">No matches for “{globalSearch.trim()}” — try “flood”, “heat” or a place name.</p>
            ) : (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-mute uppercase tracking-widest">Search results</p>
                {(() => {
                  let lastGroup = '';
                  return hits.map((h) => {
                    const header = h.group !== lastGroup ? h.group : null;
                    lastGroup = h.group;
                    return (
                      <div key={h.key}>
                        {header && <p className="px-4 pt-2 text-[10px] font-extrabold text-brand uppercase tracking-wide">{header}</p>}
                        <button
                          onClick={() => { setSearchOpen(false); h.run(); }}
                          className="block w-full text-left px-4 py-2 hover:bg-canvas"
                        >
                          <span className="block text-[13px] font-bold truncate">{h.title}</span>
                          <span className="block text-[11px] text-mute truncate">{h.sub}</span>
                        </button>
                      </div>
                    );
                  });
                })()}
              </>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* ── Live city feed ── */}
        <div className="relative">
          <button
            onClick={() => toggle('feed')}
            title="Recent city activity"
            aria-expanded={openMenu === 'feed'}
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full bg-brand-soft text-brand border border-brand/20 hover:border-brand"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" /> LIVE CITY FEED <ChevronDown size={12} />
          </button>
          {openMenu === 'feed' && (
            <div className="absolute z-40 right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-line rounded-2xl shadow-xl overflow-hidden">
              <p className="px-4 pt-3 pb-1 text-[10px] font-extrabold text-mute uppercase tracking-widest">Recent activity</p>
              <div className="max-h-72 overflow-y-auto divide-y divide-line">
                {notifications.slice(0, 6).map((n) => (
                  <div key={n.id} className="px-4 py-2.5">
                    <p className="text-[13px] font-bold truncate">{n.title}</p>
                    <p className="text-[11px] text-soft truncate">{n.message}</p>
                    <p className="text-[10px] text-mute mt-0.5">{n.time} · {n.category ?? 'SYSTEM'}</p>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="px-4 py-5 text-xs text-mute text-center">No activity yet.</p>
                )}
              </div>
              <button
                onClick={() => { setOpenMenu('none'); dispatch(togglePanel()); }}
                className="block w-full text-center text-xs font-bold text-brand px-4 py-2.5 border-t border-line hover:bg-canvas"
              >
                Open notification center
              </button>
            </div>
          )}
        </div>

        <button onClick={() => dispatch(toggleTheme())} title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="p-2.5 rounded-xl hover:bg-canvas">
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button className="relative p-2.5 rounded-xl hover:bg-canvas" aria-label={`Notifications, ${unread} unread`} onClick={() => { setOpenMenu('none'); dispatch(togglePanel()); }}>
          <Bell size={19} />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center">{unread}</span>}
        </button>

        {/* ── Role badge from authenticated user ── */}
        {user && (
          <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${user.role === 'AUTHORITY' ? 'bg-[#e8efff] text-[#4482ea]' : user.role === 'ADMIN' ? 'bg-[#e9f2e2] text-[#51933a]' : 'bg-[#fff1e6] text-[#f84424]'}`}>
            <RoleIcon size={12} /> {user.role}
          </span>
        )}

        {/* ── Profile menu ── */}
        <div className="relative">
          <button
            onClick={() => toggle('profile')}
            title={user ? `${user.name} (${user.email})` : 'User'}
            aria-expanded={openMenu === 'profile'}
            aria-label="Profile menu"
            className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm hover:bg-brand-warm"
          >
            {initials}
          </button>
          {openMenu === 'profile' && user && (
            <div className="absolute z-40 right-0 mt-2 w-60 bg-card border border-line rounded-2xl shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="font-extrabold text-sm truncate">{user.name}</p>
                <p className="text-xs text-mute truncate">{user.email}</p>
                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                  <RoleIcon size={11} /> {user.role}
                </span>
              </div>
              <div className="p-1.5">
                {profileLinks.map((l) => (
                  <button
                    key={l.label}
                    onClick={() => { setOpenMenu('none'); navigate(l.to); }}
                    className="flex items-center gap-2 w-full text-left text-[13px] font-bold px-3 py-2 rounded-xl hover:bg-canvas"
                  >
                    {l.label === 'My Reports' || l.label === 'Reports to Review' || l.label === 'Reports'
                      ? <FileText size={15} className="text-mute" />
                      : <ShieldCheck size={15} className="text-mute" />}
                    {l.label}
                  </button>
                ))}
                <button
                  onClick={() => { setOpenMenu('none'); navigate(homeForRole(user.role)); }}
                  className="flex items-center gap-2 w-full text-left text-[13px] font-bold px-3 py-2 rounded-xl hover:bg-canvas"
                >
                  <UserIcon size={15} className="text-mute" /> Dashboard
                </button>
                <button
                  onClick={() => { setOpenMenu('none'); dispatch(togglePanel()); }}
                  className="flex items-center gap-2 w-full text-left text-[13px] font-bold px-3 py-2 rounded-xl hover:bg-canvas"
                >
                  <Bell size={15} className="text-mute" /> Notifications
                  {unread > 0 && <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-brand text-white">{unread}</span>}
                </button>
              </div>
              <div className="p-1.5 border-t border-line">
                <button
                  onClick={handleLogout}
                  title="Logout — back to Home"
                  className="flex items-center gap-2 w-full text-left text-[13px] font-bold px-3 py-2 rounded-xl text-brand hover:bg-brand-soft"
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={handleLogout} title="Logout — back to Home"
          className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border border-line bg-card hover:border-brand hover:text-brand">
          <LogOut size={15} /><span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
