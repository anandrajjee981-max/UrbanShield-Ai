import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

const STATUS_LINES = [
  'Connecting to live city feed…',
  'Scanning risk zones…',
  'Syncing reports & tasks…',
];

/**
 * Unique full-screen loader for UrbanShieldAI — radar-sweep shield with
 * expanding sonar rings, shimmer wordmark, cycling status lines and an
 * indeterminate progress bar. Used on app boot / session gate.
 */
export default function BrandLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % STATUS_LINES.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={
        fullScreen
          ? 'fixed inset-0 z-[100] flex items-center justify-center bg-canvas'
          : 'flex items-center justify-center py-16'
      }
      role="status"
      aria-label="Loading UrbanShieldAI"
    >
      <div className="flex flex-col items-center px-6 text-center">
        {/* Radar shield */}
        <div className="us-loader-radar">
          <span className="us-loader-ring us-loader-ring-1" />
          <span className="us-loader-ring us-loader-ring-2" />
          <span className="us-loader-ring us-loader-ring-3" />
          <span className="us-loader-sweep" />
          <span className="us-loader-orbit">
            <span className="us-loader-dot" />
          </span>
          <span className="us-loader-core">
            <ShieldCheck size={44} strokeWidth={2.2} />
          </span>
        </div>

        {/* Wordmark */}
        <p className="us-loader-word mt-6 text-2xl font-extrabold tracking-tight">
          UrbanShield<span className="text-brand">AI</span>
        </p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.25em] text-mute">
          City Resilience
        </p>

        {/* Cycling status */}
        <p key={line} className="us-loader-status mt-4 text-sm font-semibold text-soft">
          {STATUS_LINES[line]}
        </p>

        {/* Progress bar */}
        <div className="us-loader-bar mt-4 h-1.5 w-52 overflow-hidden rounded-full bg-line/60">
          <span className="us-loader-bar-fill" />
        </div>
      </div>
    </div>
  );
}
