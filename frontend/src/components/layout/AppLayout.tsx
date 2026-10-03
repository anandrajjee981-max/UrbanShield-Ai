import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationsPanel from '../notifications/NotificationsPanel';
import { useAppDispatch } from '../../store/hooks';
import { setSearch } from '../../store/slices/incidentsSlice';

export default function AppLayout() {
  const dispatch = useAppDispatch();
  return (
    <div className="flex h-screen bg-canvas text-ink overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onSearch={(q) => dispatch(setSearch(q))} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationsPanel />
    </div>
  );
}
