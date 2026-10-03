import { severityColor } from '../../utils/format';

export default function Badge({ level, label }: { level: string; label?: string }) {
  const c = severityColor[level] ?? 'var(--brand)';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: c + '18', color: c }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {label ?? level.toUpperCase()}
    </span>
  );
}
