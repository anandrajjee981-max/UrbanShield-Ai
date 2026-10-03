import { Bell, Menu, Search, LogOut, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleMobileMenu, toggleSidebar, toggleTheme } from '../../store/slices/uiSlice';
import { togglePanel } from '../../store/slices/notificationsSlice';
import { logoutThunk } from '../../store/slices/authSlice';

export default function Topbar({ onSearch }: { onSearch?: (q: string) => void }) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const unread = useAppSelector((s) => s.notifications.items.filter((n) => !n.read).length);
  const user = useAppSelector((s) => s.auth.user);
  const theme = useAppSelector((s) => s.ui.theme);
  const initials = (user?.name ?? 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const handleLogout = () => {
    // Navigate FIRST while still authenticated: '/' is a public route, so
    // ProtectedRoute unmounts. Then clearing the session cannot trigger its
    // `<Navigate to="/login">` anymore (that redirect was overriding this
    // navigation because the last navigation wins).
    navigate('/', { replace: true });
    dispatch(logoutThunk());
  };
  return (
    <header className="min-h-16 bg-cream border-b border-line flex flex-wrap items-center gap-x-2 gap-y-2 px-2 sm:px-4 py-2 sticky top-0 z-30">
      <button className="lg:hidden p-2 rounded-lg hover:bg-canvas shrink-0" onClick={() => dispatch(toggleMobileMenu())}><Menu size={20} /></button>
      <button className="hidden lg:block p-2 rounded-lg hover:bg-canvas shrink-0" onClick={() => dispatch(toggleSidebar())}><Menu size={20} /></button>
      {/* Full-width second row on phones, inline on sm+ */}
      <div className="flex items-center gap-2 bg-canvas border border-line rounded-xl px-3 py-2 order-3 basis-full sm:order-none sm:basis-auto sm:flex-1 sm:min-w-0 sm:max-w-md min-w-0">
        <Search size={16} className="text-mute shrink-0" />
        <input placeholder="Search incidents, zones, reports…" className="bg-transparent outline-none text-sm w-full min-w-0"
          onChange={(e) => onSearch?.(e.target.value)} />
      </div>
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <span className="hidden md:inline-flex text-xs font-semibold px-2.5 py-1.5 rounded-full bg-brand-soft text-brand">● LIVE CITY FEED</span>
        <button onClick={() => dispatch(toggleTheme())} title={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          className="p-2.5 rounded-xl hover:bg-canvas">
          {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button className="relative p-2.5 rounded-xl hover:bg-canvas" onClick={() => dispatch(togglePanel())}>
          <Bell size={19} />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 bg-brand text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{unread}</span>}
        </button>
        {user && (
          <span className={`hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-full ${user.role === 'AUTHORITY' ? 'bg-[#e8efff] text-[#4482ea]' : 'bg-[#fff1e6] text-[#f84424]'}`}>
            {user.role}
          </span>
        )}
        <div title={user ? `${user.name} (${user.email})` : 'User'}
          className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm">
          {initials}
        </div>
        <button onClick={handleLogout} title="Logout — back to Home"
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border border-line bg-card hover:border-brand hover:text-brand">
          <LogOut size={15} /><span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
