import { PhoneCall, Hospital, Flame, Droplets } from 'lucide-react';
import Card from '../common/Card';

const contacts = [
  { name: 'Fire Control Room', num: '101', icon: Flame, color: 'var(--brand)' },
  { name: 'Flood Helpline', num: '1077', icon: Droplets, color: 'var(--blue)' },
  { name: 'Medical Emergency', num: '108', icon: Hospital, color: 'var(--green)' },
  { name: 'City Command Center', num: '1800-123-456', icon: PhoneCall, color: 'var(--ink)' },
];

export default function EmergencyPanel() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {contacts.map((c) => (
        <Card key={c.name} className="gs-in p-4 sm:p-5 flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: c.color }}>
            <c.icon size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm break-words">{c.name}</p>
            <p className="text-xl font-extrabold break-all" style={{ color: c.color }}>{c.num}</p>
          </div>
          <a href={`tel:${c.num}`} className="shrink-0 text-xs font-bold px-3 py-2 rounded-lg bg-panel text-white">CALL</a>
        </Card>
      ))}
      <Card className="gs-in p-5 sm:col-span-2 bg-panel border-panel! text-white">
        <p className="font-bold">SOS Broadcast (frontend demo)</p>
        <p className="text-sm text-[#e8d9b5] mt-1">In production this triggers a backend alert pipeline. Here it only simulates the UI flow.</p>
        <button onClick={() => alert('SOS broadcast simulated (frontend only).')} className="mt-3 font-bold text-sm px-4 py-2.5 rounded-xl bg-brand text-white">Broadcast SOS</button>
      </Card>
    </div>
  );
}
