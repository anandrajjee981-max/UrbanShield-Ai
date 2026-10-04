import { CloudOff, RotateCw } from 'lucide-react';

function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="bg-card border border-line rounded-2xl p-5 shadow-sm animate-pulse"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="h-4 w-20 rounded bg-line" />
          <div className="h-3 w-28 rounded bg-line mt-2" />
        </div>
        <div className="h-16 w-16 rounded-full bg-line" />
      </div>
      <div className="h-9 w-24 rounded bg-line mt-4" />
      <div className="h-3 w-full rounded bg-line mt-3" />
      <div className="h-3 w-4/5 rounded bg-line mt-2" />
      <div className="grid grid-cols-2 gap-2 mt-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-canvas border border-line" />
        ))}
      </div>
    </div>
  );
}

/** Three shimmering placeholder cards shown while weather data loads. */
export function WeatherSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading weather data"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

/** Friendly error panel — never leaks API keys or backend details. */
export function WeatherError({
  message,
  onRetry,
  loading,
}: {
  message: string;
  onRetry: () => void;
  loading: boolean;
}) {
  return (
    <div className="bg-card border border-line rounded-2xl p-8 shadow-sm text-center max-w-md mx-auto">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft flex items-center justify-center text-brand">
        <CloudOff size={24} />
      </div>
      <p className="font-extrabold mt-4">Unable to load weather data</p>
      <p className="text-sm text-soft mt-1">{message || 'Please try again.'}</p>
      <button
        onClick={onRetry}
        disabled={loading}
        className="mt-5 inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-50"
      >
        <RotateCw size={15} className={loading ? 'animate-spin' : ''} />
        Retry
      </button>
    </div>
  );
}
