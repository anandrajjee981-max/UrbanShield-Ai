import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Map, AlertTriangle, FileText, BarChart3, Bot, Siren, ShieldCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closeMobileMenu } from '../../store/slices/uiSlice';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/map', label: 'City Map', icon: Map },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/ai', label: 'AI Insights', icon: Bot },
  { to: '/emergency', label: 'Emergency', icon: Siren },
];

export default function Sidebar() {
  const dispatch = useAppDispatch();
  const open = useAppSelector((s) => s.ui.sidebarOpen);
  const mobile = useAppSelector((s) => s.ui.mobileMenuOpen);
  const close = () => dispatch(closeMobileMenu());
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
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} onClick={close}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/10'}`}>
              <l.icon size={18} className="shrink-0" />{(open || mobile) && <span className="truncate">{l.label}</span>}
            </NavLink>
          ))}
        </nav>
        {(open || mobile) && <div className="p-4 text-[11px] text-slate-400">Frontend-only build<br />API-ready mock layer</div>}
      </aside>
    </>
  );
}
