import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchIncidents, setSeverityFilter } from '../store/slices/incidentsSlice';
import IncidentCard from '../components/incidents/IncidentCard';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

export default function Incidents() {
  const dispatch = useAppDispatch();
  const { items, loading, severityFilter } = useAppSelector((s) => s.incidents);
  const search = useAppSelector((s) => s.ui.globalSearch);
  useGsapEntrance('.gs-in', [items.length, severityFilter]);

  useEffect(() => { dispatch(fetchIncidents()); }, [dispatch]);

  const filtered = items.filter((i) =>
    (severityFilter === 'all' || i.severity === severityFilter) &&
    (search === '' || (i.title + i.address + i.category).toLowerCase().includes(search.toLowerCase())),
  );

  if (loading && items.length === 0) return <Loader />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-extrabold">Incidents ({filtered.length})</h1>
      <div className="flex gap-2 flex-wrap">
        {(['all', 'low', 'medium', 'high', 'critical'] as const).map((s) => (
          <button key={s} onClick={() => dispatch(setSeverityFilter(s))}
            className={`text-xs font-bold px-3 py-2 rounded-full border ${severityFilter === s ? 'bg-panel text-white border-panel' : 'bg-card text-soft border-line'}`}>
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((i) => <IncidentCard key={i.id} incident={i} />)}
      </div>
      {filtered.length === 0 && <p className="text-sm text-mute">No incidents match the current filters.</p>}
    </div>
  );
}
