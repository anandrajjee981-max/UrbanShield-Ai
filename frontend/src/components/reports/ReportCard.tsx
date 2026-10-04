import { useEffect, useRef, useState } from 'react';
import { ThumbsUp, MapPin, Trash2, Loader2 } from 'lucide-react';
import Card from '../common/Card';
import AnalysisCard from '../workflow/AnalysisCard';
import WorkflowTracker from '../workflow/WorkflowTracker';
import type { CitizenReport } from '../../types';

const statusStyle: Record<string, string> = {
  pending: 'bg-[#fdf0c8] text-[#965d13]',
  verified: 'bg-[#e8efff] text-[#4482ea]',
  actioned: 'bg-[#e9f2e2] text-[#51933a]',
  rejected: 'bg-[#fde8e2] text-[#f84424]',
};

export default function ReportCard({
  report,
  onDelete,
  deleting = false,
}: {
  report: CitizenReport;
  onDelete: (id: string) => void;
  deleting?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (deleting) setConfirming(false);
  }, [deleting]);

  return (
    <Card className="gs-in p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-sm min-w-0 break-words">{report.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full uppercase ${statusStyle[report.status]}`}>{report.status}</span>
          {confirming ? (
            <span className="flex items-center gap-1">
              <button
                ref={confirmRef}
                onClick={() => onDelete(report.id)}
                disabled={deleting}
                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="text-[11px] font-bold px-2 py-1 rounded-lg border border-line text-soft hover:bg-canvas disabled:opacity-60"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={deleting}
              aria-label={`Delete report ${report.id.slice(0, 8)}`}
              className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-[#fde8e2] disabled:opacity-60"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-xs text-soft mt-1 line-clamp-3 break-words">{report.description}</p>
      {report.imageUrl && (
        <img src={report.imageUrl} alt="Issue evidence" className="w-full h-36 object-cover rounded-xl border border-line mt-3" loading="lazy" />
      )}
      {report.rawStatus && (
        <div className="mt-3">
          <WorkflowTracker status={report.rawStatus} />
        </div>
      )}
      {(report.skillRequired || report.complexity || report.effortHours !== null) && (
        <div className="mt-2">
          <AnalysisCard
            skillRequired={report.skillRequired ?? null}
            complexity={report.complexity ?? null}
            effortHours={report.effortHours ?? null}
            compact
          />
        </div>
      )}
      {report.resolutionNote && (
        <p className="text-[11px] text-soft italic mt-2">“{report.resolutionNote}”</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-mute">
        <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{report.address}</span></span>
        <span className="ml-auto flex items-center gap-1 font-semibold shrink-0"><ThumbsUp size={12} />{report.votes}</span>
        {deleting && (
          <span className="flex items-center gap-1 font-semibold text-brand shrink-0">
            <Loader2 size={12} className="animate-spin" />Deleting…
          </span>
        )}
      </div>
    </Card>
  );
}