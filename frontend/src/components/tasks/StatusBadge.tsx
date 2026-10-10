import type { AssignedTaskStatus } from '../../services/api';

const styles: Record<AssignedTaskStatus, string> = {
  ASSIGNED: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  IN_PROGRESS: 'bg-[#e8efff] text-[#4482ea] border-[#4482ea]/30',
  COMPLETED: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  CANCELLED: 'bg-brand/10 text-brand border-brand/30',
};

const labels: Record<AssignedTaskStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Rejected',
};

export default function StatusBadge({ value }: { value: AssignedTaskStatus | string }) {
  const key = (value ?? 'ASSIGNED') as AssignedTaskStatus;
  return (
    <span
      className={`shrink-0 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full border ${styles[key] ?? styles.ASSIGNED}`}
    >
      {labels[key] ?? String(value).replace(/_/g, ' ')}
    </span>
  );
}
