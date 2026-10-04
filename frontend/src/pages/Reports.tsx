import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchReports } from '../store/slices/reportsSlice';
import ReportCard from '../components/reports/ReportCard';
import ReportsMap from '../components/reports/ReportsMap';
import ReportFormModal from '../components/reports/ReportFormModal';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

export default function Reports() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.reports);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  useGsapEntrance('.gs-in', [items.length]);
  useEffect(() => { dispatch(fetchReports()); }, [dispatch]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Tapping a card highlights its pin + centers the map; on phones scrolls the map into view. */
  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    if (window.innerWidth < 640) {
      mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (loading && items.length === 0) return <Loader />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-extrabold">My Reports ({items.length})</h1>
        <button onClick={() => setFormOpen(true)} className="shrink-0 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">+ New Report</button>
      </div>
      <p className="text-xs text-mute">Live from GET /api/issues/my — track REPORTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED on each card.</p>

      {/* City map on top, report list below (phone-first stacking) */}
      <div ref={mapRef} className="scroll-mt-20">
        <ReportsMap reports={items} selectedId={selectedId} onSelect={handleSelect} />
      </div>
      <p className="text-[11px] text-mute">Tap a pin or a card below to locate a report on the map.</p>

      {error && (
        <div className="flex items-center justify-between gap-3 text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">
          <span className="whitespace-pre-line">{error}</span>
          <button onClick={() => dispatch(fetchReports())} className="shrink-0 underline">Retry</button>
        </div>
      )}
      {items.length === 0 && !loading && !error && (
        <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
          No reports yet — click “+ New Report” to file your first issue.
        </p>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {items.map((r) => (
          <div
            key={r.id}
            onClick={() => handleSelect(r.id)}
            className={`cursor-pointer rounded-2xl transition-shadow ${selectedId === r.id ? 'ring-2 ring-brand shadow-md' : ''}`}
          >
            <ReportCard report={r} />
          </div>
        ))}
      </div>
      {formOpen && (
        <ReportFormModal
          onClose={(newId) => {
            setFormOpen(false);
            if (newId) {
              setToast(`Report ${newId.slice(0, 8)} submitted — REPORTED, pending review.`);
              dispatch(fetchReports());
            }
          }}
        />
      )}
      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-civic-green text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-xl w-[calc(100%-2rem)] max-w-md justify-center text-center">
          <CheckCircle2 size={17} className="shrink-0" />{toast}
        </div>
      )}
    </div>
  );
}
