import { X, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { closePanel, markAllRead, markOneRead, togglePanel } from '../../store/slices/notificationsSlice';
import { popIn } from '../../animations/gsap';
import { useEffect } from 'react';
import type { AppNotification } from '../../types';

const categoryStyle: Record<string, string> = {
  REPORT: 'bg-[#e8efff] text-[#4482ea]',
  INCIDENT: 'bg-[#fde8e2] text-[#f84424]',
  'AUTHORITY ACTION': 'bg-[#e9f2e2] text-[#51933a]',
  SYSTEM: 'bg-canvas text-mute border border-line',
};

const dotColor: Record<AppNotification['type'], string> = {
  critical: 'bg-brand',
  warning: 'bg-civic-amber',
  success: 'bg-civic-green',
  info: 'bg-civic-blue',
};

export default function NotificationsPanel() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { open, items } = useAppSelector((s) => s.notifications);
  useEffect(() => { if (open) popIn('.notif-panel'); }, [open ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch(closePanel());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dispatch]);

  if (!open) return null;

  const openItem = (n: AppNotification) => {
    dispatch(markOneRead(n.id));
    dispatch(closePanel());
    if (n.link) navigate(n.link);
  };

  return (
    <div className="notif-panel fixed right-4 top-20 w-80 max-w-[calc(100vw-2rem)] bg-card text-ink border border-line rounded-2xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <div>
          <p className="font-bold text-sm">Notifications</p>
          <p className="text-[10px] text-mute">Demo feed + your session activity — no backend endpoint yet</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => dispatch(markAllRead())} className="p-1.5 rounded-lg hover:bg-canvas text-xs font-bold text-brand" title="Mark all as read">
            <span className="flex items-center gap-1"><CheckCheck size={16} /> Mark all read</span>
          </button>
          <button onClick={() => dispatch(togglePanel())} aria-label="Close notifications" className="p-1.5 rounded-lg hover:bg-canvas"><X size={16} /></button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-line">
        {items.length === 0 && (
          <p className="px-4 py-8 text-xs text-mute text-center">No notifications yet — activity from your session will appear here.</p>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => openItem(n)}
            className={`block w-full text-left px-4 py-3 hover:bg-canvas transition-colors ${n.read ? '' : 'bg-brand-soft/50'}`}
          >
            <span className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[n.type]}`} />
              <span className="font-bold text-[13px] min-w-0 truncate">{n.title}</span>
              {!n.read && <span className="ml-auto w-2 h-2 rounded-full bg-brand shrink-0" />}
            </span>
            <span className="block text-xs text-soft mt-0.5">{n.message}</span>
            <span className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${categoryStyle[n.category ?? 'SYSTEM']}`}>
                {n.category ?? 'SYSTEM'}
              </span>
              <span className="text-[11px] text-mute">{n.time}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
