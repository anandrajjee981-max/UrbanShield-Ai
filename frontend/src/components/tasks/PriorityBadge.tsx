import type { AssignedTaskPriority } from '../../services/api';

const styles: Record<AssignedTaskPriority, string> = {
  LOW: 'bg-civic-green/10 text-civic-green border-civic-green/30',
  MEDIUM: 'bg-civic-amber/15 text-civic-amber-dark border-civic-amber/40',
  HIGH: 'bg-brand/10 text-brand border-brand/30',
  CRITICAL: 'bg-brand text-white border-transparent',
};

export default function PriorityBadge({ value }: { value: AssignedTaskPriority | string }) {
  const key = (String(value ?? 'MEDIUM').toUpperCase()) as AssignedTaskPriority;
  return (
    <span
      className={`shrink-0 inline-flex items-center text-[10px] font-extrabold uppercase tracking-wide px-2 py-1 rounded-full border ${styles[key] ?? styles.MEDIUM}`}
    >
      {key}
    </span>
  );
}
