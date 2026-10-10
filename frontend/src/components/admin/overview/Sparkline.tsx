/**
 * Tiny dependency-free SVG sparkline (no new npm package needed).
 * Decorative only — wrap usage in aria-hidden, the StatCard trend pill
 * already carries the accessible delta text.
 */
export function Sparkline({
  data,
  width = 120,
  height = 28,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(' ');
  const last = data[data.length - 1]!;
  const lx = width.toFixed(1);
  const ly = (height - 3 - ((last - min) / span) * (height - 6)).toFixed(1);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="var(--brand)" />
    </svg>
  );
}
