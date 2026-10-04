import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { deleteReport, fetchReports } from '../store/slices/reportsSlice';
import { setGlobalSearch } from '../store/slices/uiSlice';
import { citizenReportFields, matchesQuery } from '../utils/issueSearch';
import ReportCard from '../components/reports/ReportCard';
import ReportFormModal from '../components/reports/ReportFormModal';
import Loader from '../components/common/Loader';
import { useGsapEntrance } from '../hooks/useGsapEntrance';

export default function Reports() {
  const dispatch = useAppDispatch();
  const { items, loading, error, deletingId } = useAppSelector((s) => s.reports);
  const globalSearch = useAppSelector((s) => s.ui.globalSearch);
  const filtered = items.filter((r) => matchesQuery(globalSearch, citizenReportFields(r)));
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useGsapEntrance('.gs-in', [items.length]);
  useEffect(() => { dispatch(fetchReports()); }, [dispatch]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  /** Tapping a card highlights it (toggle ring). */
  const handleSelect = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  /** Confirmed delete → DELETE /api/issues/:id, then drop the row from the list. */
  const handleDelete = async (id: string) => {
    const res = await dispatch(deleteReport(id));
    setSelectedId((prev) => (prev === id ? null : prev));
    if (deleteReport.fulfilled.match(res)) {
      setToast(`Report ${id.slice(0, 8)} deleted.`);
    } else {
      setToast((res.payload as string) ?? 'Could not delete the report.');
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
      {globalSearch.trim() && (
        <p className="text-xs font-semibold text-soft flex items-center gap-2 flex-wrap">
          <span>Showing {filtered.length} of {items.length} for “{globalSearch.trim()}”</span>
          <button onClick={() => dispatch(setGlobalSearch(''))} className="underline text-brand">Clear search</button>
        </p>
      )}

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
      {items.length > 0 && filtered.length === 0 && !loading && (
        <p className="text-sm text-soft border border-dashed border-line rounded-xl p-6 text-center">
          No reports match “{globalSearch.trim()}” — try “flood”, “heat”, “resolved” or a place name.
        </p>
      )}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((r) => (
          <div
            key={r.id}
            onClick={() => handleSelect(r.id)}
            className={`cursor-pointer rounded-2xl transition-shadow ${selectedId === r.id ? 'ring-2 ring-brand shadow-md' : ''}`}
          >
            <ReportCard report={r} onDelete={handleDelete} deleting={deletingId === r.id} />
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
