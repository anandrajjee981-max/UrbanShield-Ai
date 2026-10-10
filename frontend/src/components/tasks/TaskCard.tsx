import { CalendarClock, MapPin, User } from 'lucide-react';
import type { AssignedTask } from '../../services/api';
import { timeAgo } from '../../utils/format';
import PriorityBadge from './PriorityBadge';
import StatusBadge from './StatusBadge';

export function dueLabel(task: AssignedTask): { text: string; overdue: boolean } {
  if (!task.dueDate) return { text: 'No due date', overdue: false };
  const due = new Date(task.dueDate).getTime();
  if (Number.isNaN(due)) return { text: 'No due date', overdue: false };
  const terminal = task.status === 'COMPLETED' || task.status === 'CANCELLED';
  const overdue = !terminal && due < Date.now();
  const rel = timeAgo(task.dueDate);
  return { text: overdue ? `Overdue · due ${rel}` : `Due ${rel}`, overdue };
}

export default function TaskCard({
  task,
  onOpen,
}: {
  task: AssignedTask;
  onOpen: (task: AssignedTask) => void;
}) {
  const due = dueLabel(task);
  const title = task.title?.trim() || task.description.slice(0, 90);
  const address =
    task.location.type === 'MANUAL' ? task.location.address || 'Location not provided' : 'GPS report';
  return (
    <button
      onClick={() => onOpen(task)}
      className="gs-in w-full text-left bg-card border border-line rounded-2xl p-4 space-y-2.5 hover:border-brand transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold text-sm line-clamp-2 min-w-0">{title}</p>
        <StatusBadge value={task.status} />
      </div>
      <p className="text-[11px] text-mute line-clamp-2">{task.description.slice(0, 140)}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={task.priority} />
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold ${due.overdue ? 'text-brand' : 'text-mute'}`}
        >
          <CalendarClock size={12} /> {due.text}
        </span>
      </div>
      <p className="text-[11px] text-mute flex items-center gap-1 truncate">
        <MapPin size={12} className="shrink-0" /> {address}
      </p>
      <p className="text-[11px] text-mute flex items-center gap-1 truncate">
        <User size={12} className="shrink-0" /> Assigned by {task.assignedBy ?? 'Admin'}
        {' · '}
        {task.issueType.replace(/_/g, ' ')}
      </p>
    </button>
  );
}
