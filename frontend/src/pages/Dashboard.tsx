import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchDashboard } from '../store/slices/dashboardSlice';
import { fetchIncidents } from '../store/slices/incidentsSlice';
import KpiCard from '../components/dashboard/KpiCard';
import WorkflowBanner from '../components/dashboard/WorkflowBanner';
import TrendChart from '../components/dashboard/TrendChart';
import RiskPie from '../components/dashboard/RiskPie';
import IncidentCard from '../components/incidents/IncidentCard';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

export default function Dashboard() {
  const dispatch = useAppDispatch();
  const { kpis, trend, distribution, loading } = useAppSelector((s) => s.dashboard);
  const incidents = useAppSelector((s) => s.incidents.items);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const role = useAppSelector((s) => s.auth.user?.role ?? 'CITIZEN');
  const q = globalSearch.trim().toLowerCase();
  const visibleIncidents = incidents.filter((i) =>
    q === '' || `${i.title} ${i.address} ${i.category} ${i.description} ${i.status}`.toLowerCase().includes(q),
  );
  useGsapEntrance('.gs-in', [kpis.length]);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchIncidents());
  }, [dispatch]);

  if (loading && kpis.length === 0) return <Loader label="Loading city overview…" />;

  return (
    <div className="space-y-4">
      <div><h1 className="text-xl sm:text-2xl font-extrabold">City Resilience Overview</h1><p className="text-xs sm:text-sm text-mute">Live frontend demo · New Delhi · mock data, API-ready</p></div>
      <WorkflowBanner role={role} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">{kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}</div>
      <div className="grid xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><TrendChart data={trend} /></div>
        <RiskPie data={distribution} />
      </div>
      <div>
        <h2 className="font-bold mb-2">Latest active incidents{q && ` — matching “${globalSearch.trim()}”`}</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visibleIncidents.slice(0, 6).map((i) => <IncidentCard key={i.id} incident={i} />)}
        </div>
        {visibleIncidents.length === 0 && (
          <p className="text-sm text-mute">No incidents match the current search.</p>
        )}
      </div>
    </div>
  );
}
