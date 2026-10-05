import { Check, X } from 'lucide-react';

const STAGES: { key: string; label: string }[] = [
  { key: 'REPORTED', label: 'Reported' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

const ORDER: string[] = ['REPORTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'];

/**
 * Citizen-facing lifecycle strip for one issue.
 * REPORTED → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED, with REJECTED
 * shown as a terminal branch off the report step.
 */
export default function WorkflowTracker({ status }: { status: string }) {
  if (status === 'REJECTED') {
    return (
      <div className="flex items-center gap-2 text-xs font-bold">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#e9f2e2] text-[#51933a]">
          <Check size={12} /> Reported
        </span>
        <span className="text-mute">→</span>
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#fde8e2] text-[#f84424]">
          <X size={12} /> Rejected
        </span>
      </div>
    );
  }

  const current = ORDER.indexOf(status);
  return (
    <ol className="flex flex-wrap items-center gap-y-1.5 gap-x-1 text-[11px] font-bold">
      {STAGES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-mute mx-0.5">→</span>}
            <span
              className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                done
                  ? 'bg-[#e9f2e2] text-[#51933a]'
                  : active
                    ? 'bg-[#e8efff] text-[#4482ea] ring-1 ring-[#4482ea]/40'
                    : 'bg-canvas text-mute border border-line'
              }`}
            >
              {done && <Check size={12} />}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
