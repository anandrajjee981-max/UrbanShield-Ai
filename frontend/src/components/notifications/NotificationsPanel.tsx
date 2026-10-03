import { X, CheckCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { togglePanel, markAllRead } from '../../store/slices/notificationsSlice';
import { popIn } from '../../animations/gsap';
import { useEffect } from 'react';

export default function NotificationsPanel() {
  const dispatch = useAppDispatch();
  const { open, items } = useAppSelector((s) => s.notifications);
  useEffect(() => { if (open) popIn('.notif-panel'); }, [open ]);
  if (!open) return null;
  return (
    <div className="notif-panel fixed right-4 top-20 w-80 max-w-[calc(100vw-2rem)] bg-white border border-line rounded-2xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-bold text-sm">Notifications</p>
        <div className="flex gap-1">
          <button onClick={() => dispatch(markAllRead())} className="p-1.5 rounded-lg hover:bg-cream" title="Mark all read"><CheckCheck size={16} /></button>
          <button onClick={() => dispatch(togglePanel())} className="p-1.5 rounded-lg hover:bg-cream"><X size={16} /></button>
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto divide-y divide-line">
        {items.map((n) => (
          <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? '' : 'bg-brand-soft'}`}>
            <p className="font-bold text-[13px]">{n.title}</p>
            <p className="text-xs text-soft">{n.message}</p>
            <p className="text-[11px] text-mute mt-1">{n.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
