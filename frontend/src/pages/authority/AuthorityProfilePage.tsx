import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAuthorityProfile, NOT_VERIFIED } from '../../store/slices/authoritySlice';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
    </div>
  );
}

/**
 * /authority/profile — the verified-authority view (GET /profile).
 * A PENDING/REJECTED candidate gets 403 AUTHORITY_NOT_VERIFIED and sees
 * where to go instead of a raw error.
 */
export default function AuthorityProfilePage() {
  const dispatch = useAppDispatch();
  const { profile, profileFetch, notVerified } = useAppSelector((s) => s.authority);

  useEffect(() => {
    dispatch(fetchAuthorityProfile());
  }, [dispatch]);

  const reload = () => dispatch(fetchAuthorityProfile());

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">Authority Profile</h1>
        <p className="text-xs sm:text-sm text-mute">Your verified profile — the record the assignment engine reads.</p>
      </div>

      {profileFetch.loading && profile === undefined ? (
        <div className="bg-card border border-line rounded-2xl p-5 space-y-2 animate-pulse" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-canvas" />
          ))}
        </div>
      ) : notVerified ? (
        <div className="bg-card border border-civic-amber/40 rounded-2xl p-6 sm:p-8 text-center">
          <div className="mx-auto w-11 h-11 rounded-full bg-civic-amber/15 text-civic-amber-dark flex items-center justify-center mb-3">
            <ShieldAlert size={20} />
          </div>
          <p className="font-extrabold text-ink">Not verified yet</p>
          <p className="text-xs text-mute mt-1 max-w-md mx-auto">
            Your authority account has not been verified by an administrator yet. The review queue and this profile unlock after verification.
          </p>
          <Link
            to="/authority/apply"
            className="mt-4 inline-block text-sm font-bold px-5 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            Check application status
          </Link>
        </div>
      ) : profileFetch.error && profile === undefined ? (
        <div className="bg-card border border-brand/30 rounded-2xl p-8 text-center">
          <p className="font-bold text-ink text-sm">Unable to load your profile.</p>
          <p className="text-xs text-mute mt-1">{profileFetch.error}</p>
          <button
            onClick={reload}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </div>
      ) : !profile ? (
        <div className="bg-card border border-dashed border-line rounded-2xl p-8 text-center">
          <p className="font-bold text-soft text-sm">No application on record.</p>
          <Link to="/authority/apply" className="mt-3 inline-block text-sm font-bold text-brand hover:underline">
            Apply for verification →
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-civic-green/10 text-civic-green flex items-center justify-center shrink-0">
              <BadgeCheck size={22} />
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-ink truncate">{profile.fullName}</p>
              <p className="text-xs text-mute truncate">{profile.email} · {profile.phone}</p>
            </div>
            <span className="ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full bg-civic-green/10 text-civic-green border border-civic-green/30 shrink-0">
              VERIFIED
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            <Field label="Department" value={profile.department.replace(/_/g, ' ')} />
            <Field label="Designation" value={profile.designation.replace(/_/g, ' ')} />
            <Field label="Jurisdiction" value={`${profile.jurisdictionType.replace(/_/g, ' ')} — ${profile.jurisdictionName}`} />
            <Field label="Skills" value={profile.skills.map((s) => s.replace(/_/g, ' ')).join(', ') || '—'} />
            <Field label="Availability" value={profile.availability.replace(/_/g, ' ')} />
            <Field
              label="Verified Since"
              value={profile.verifiedAt ? new Date(profile.verifiedAt).toLocaleDateString() : '—'}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <Link to="/tasks" className="flex-1 text-center font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm">
              Open Review Queue
            </Link>
            <Link to="/reports" className="flex-1 text-center font-bold text-sm px-4 py-3 rounded-xl border border-line hover:border-brand">
              Browse Reports
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Re-exported so pages can branch on it without importing the slice.
export { NOT_VERIFIED };
