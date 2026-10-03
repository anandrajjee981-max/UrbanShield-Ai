import { MapPin, Clock } from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import type { Incident } from '../../types';
import { timeAgo } from '../../utils/format';

export default function IncidentCard({ incident }: { incident: Incident }) {
  return (
    <Card className="gs-in p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-bold text-sm min-w-0 break-words">{incident.title}</h4>
        <span className="shrink-0"><Badge level={incident.severity} /></span>
      </div>
      <p className="text-xs text-soft mt-1 line-clamp-2 break-words">{incident.description}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-mute">
        <span className="flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{incident.address}</span></span>
        <span className="flex items-center gap-1 shrink-0"><Clock size={12} />{timeAgo(incident.reportedAt)}</span>
        <span className="ml-auto font-bold uppercase text-brand shrink-0">{incident.status}</span>
      </div>
    </Card>
  );
}
