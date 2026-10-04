import { Bot, Clock, Wrench } from 'lucide-react';

/**
 * Shows the AI analysis briefing for an issue: required skill crew,
 * complexity band and estimated field effort. Rendered for citizens (their
 * own reports), admins (review screen) and authorities (task briefing) from
 * the same backend fields.
 */
export default function AnalysisCard({
  skillRequired,
  complexity,
  effortHours,
  compact = false,
}: {
  skillRequired: string | null;
  complexity: string | null;
  effortHours: number | null;
  compact?: boolean;
}) {
  if (!skillRequired && !complexity && effortHours === null) {
    return (
      <p className="text-[11px] text-mute flex items-center gap-1.5">
        <Bot size={13} /> AI analysis pending — runs after admin verification.
      </p>
    );
  }
  const complexityStyle =
    complexity === 'HIGH'
      ? 'bg-[#fde8e2] text-[#f84424]'
      : complexity === 'MEDIUM'
        ? 'bg-[#fdf0c8] text-[#965d13]'
        : 'bg-[#e9f2e2] text-[#51933a]';
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? 'text-[11px]' : 'text-xs'} font-bold`}>
      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#e8efff] text-[#4482ea]">
        <Wrench size={12} /> {skillRequired?.replace(/_/g, ' ') ?? '—'}
      </span>
      {complexity && (
        <span className={`px-2 py-1 rounded-full ${complexityStyle}`}>{complexity}</span>
      )}
      {effortHours !== null && (
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-canvas text-soft border border-line">
          <Clock size={12} /> ~{effortHours}h effort
        </span>
      )}
    </div>
  );
}
