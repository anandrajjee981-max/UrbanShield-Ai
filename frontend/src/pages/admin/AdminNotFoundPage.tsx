import { Link } from 'react-router-dom';

/** Fallback for unknown /admin/* paths. */
export default function AdminNotFoundPage() {
  return (
    <div className="bg-card border border-line rounded-2xl p-10 text-center max-w-lg mx-auto">
      <p className="text-4xl font-extrabold text-ink">404</p>
      <p className="font-bold text-ink mt-2">This admin page does not exist.</p>
      <p className="text-xs text-mute mt-1">Check the URL or return to the overview.</p>
      <Link
        to="/admin"
        className="mt-4 inline-block text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
      >
        Back to Overview
      </Link>
    </div>
  );
}
