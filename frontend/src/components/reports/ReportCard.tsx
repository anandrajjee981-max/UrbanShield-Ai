import { ThumbsUp, MapPin } from 'lucide-react';
import Card from '../common/Card';
import type { CitizenReport } from '../../types';

const statusStyle: Record<string, string> = {
  pending: 'bg-[#fdf0c8] text-[#965d13]',
  verified: 'bg-[#e8efff] text-[#4482ea]',
  actioned: 'bg-[#e9f2e2] text-[#51933a]',
  rejected: 'bg-[#fde8e2] text-[#f84424]',
};

export default function ReportCard({ report }: { report: CitizenReport }) {
  return (
    <Card className="gs-in p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-sm min-w-0 break-words">{report.title}</h4>
        <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full uppercase ${statusStyle[report.status]}`}>{report.status}</span>
      </div>
      <p className="text-xs text-soft mt-1 line-clamp-3 break-words">{report.description}</p>
      {report.imageUrl && (
        <img src={report.imageUrl} alt="Issue evidence" className="w-full h-36 object-cover rounded-xl border border-line mt-3" loading="lazy" />
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-mute">
        <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{report.address}</span></span>
        <span className="ml-auto flex items-center gap-1 font-semibold shrink-0"><ThumbsUp size={12} />{report.votes}</span>
      </div>
    </Card>
  );
}
