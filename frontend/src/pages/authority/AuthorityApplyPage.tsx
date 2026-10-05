import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, CheckCircle2, Clock3, FileText, RefreshCw, UploadCloud, XCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  clearSubmitState,
  fetchApplicationOptions,
  fetchMyApplication,
  submitApplication,
} from '../../store/slices/authoritySlice';
import type { SubmitApplicationInput } from '../../services/authority.service';

const inputCls =
  'w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20';
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-soft';

const ACCEPTED_DOCS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_DOC_BYTES = 8 * 1024 * 1024;

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-mute">{label}</p>
      <p className="text-sm text-ink mt-0.5 break-words">{value}</p>
    </div>
  );
}

/**
 * /authority/apply — the candidate's verification doorway, driven entirely by
 * backend data: dropdowns from GET /application/options, state from
 * GET /application, submit to POST /application (multipart + `document`).
 */
export default function AuthorityApplyPage() {
  const dispatch = useAppDispatch();
  const {
    options, optionsFetch, application, applicationFetch,
    submitLoading, submitError, lastSubmitted,
  } = useAppSelector((s) => s.authority);

  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [governmentIdType, setGovernmentIdType] = useState('');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [jurisdictionType, setJurisdictionType] = useState('');
  const [jurisdictionName, setJurisdictionName] = useState('');
  const [availability, setAvailability] = useState('');
  const [document, setDocument] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchApplicationOptions());
    dispatch(fetchMyApplication());
    return () => {
      dispatch(clearSubmitState());
    };
  }, [dispatch]);

  // Default every select to the first backend-offered value once options land.
  useEffect(() => {
    if (!options) return;
    setGovernmentIdType((v) => v || options.governmentIdTypes[0] || '');
    setDepartment((v) => v || options.departments[0] || '');
    setDesignation((v) => v || options.designations[0] || '');
    setJurisdictionType((v) => v || options.jurisdictionTypes[0] || '');
  }, [options]);

  const isResubmit = application?.verificationStatus === 'REJECTED';

  const toggleSkill = (skill: string) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));

  const docHint = useMemo(() => {
    if (!document) return 'JPG, PNG, WebP or PDF · max 8 MB';
    return `${document.name} · ${(document.size / 1024 / 1024).toFixed(2)} MB`;
  }, [document]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim() || !dateOfBirth || !phone.trim() || !email.trim() || !address.trim()
      || !governmentIdType || !governmentIdNumber.trim() || !department || !designation
      || !jurisdictionType || !jurisdictionName.trim()) {
      setFormError('Please fill in every required field.');
      return;
    }
    if (skills.length === 0) {
      setFormError('Select at least one skill.');
      return;
    }
    if (!document) {
      setFormError('A government identity document is required.');
      return;
    }
    if (!ACCEPTED_DOCS.includes(document.type)) {
      setFormError('Document must be JPG, PNG, WebP or PDF.');
      return;
    }
    if (document.size > MAX_DOC_BYTES) {
      setFormError('Document must be at most 8 MB.');
      return;
    }
    const input: SubmitApplicationInput = {
      fullName, dateOfBirth, phone, email, address,
      governmentIdType, governmentIdNumber, department, designation,
      skills, jurisdictionType, jurisdictionName,
      ...(availability ? { availability } : {}),
      document,
    };
    const res = await dispatch(submitApplication(input));
    if (submitApplication.fulfilled.match(res)) {
      setDocument(null);
    }
  };

  if ((optionsFetch.loading && !options) || (applicationFetch.loading && application === undefined)) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading verification">
        <div className="h-8 w-56 rounded bg-line animate-pulse" />
        <div className="bg-card border border-line rounded-2xl p-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-xl bg-canvas animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if ((optionsFetch.error && !options) || (applicationFetch.error && application === undefined)) {
    return (
      <div className="bg-card border border-brand/30 rounded-2xl p-8 text-center">
        <p className="font-bold text-ink text-sm">Unable to load verification.</p>
        <p className="text-xs text-mute mt-1">{optionsFetch.error ?? applicationFetch.error}</p>
        <button
          onClick={() => { dispatch(fetchApplicationOptions()); dispatch(fetchMyApplication()); }}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm"
        >
          <RefreshCw size={15} /> Try Again
        </button>
      </div>
    );
  }

  // ── VERIFIED ──
  if (application?.verificationStatus === 'VERIFIED') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Authority Verification</h1>
          <p className="text-xs sm:text-sm text-mute">Your verified-authority standing.</p>
        </div>
        <div className="bg-card border border-civic-green/40 rounded-2xl p-5 sm:p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-civic-green/10 text-civic-green flex items-center justify-center mb-3">
            <BadgeCheck size={24} />
          </div>
          <p className="font-extrabold text-ink">Verified Authority</p>
          <p className="text-xs text-mute mt-1">
            {application.fullName} · {application.department.replace(/_/g, ' ')}
            {application.verifiedAt ? ` · since ${new Date(application.verifiedAt).toLocaleDateString()}` : ''}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-5">
            <Link to="/tasks" className="flex-1 text-center font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm">
              Open Review Queue
            </Link>
            <Link to="/authority/profile" className="flex-1 text-center font-bold text-sm px-4 py-3 rounded-xl border border-line hover:border-brand">
              View Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── PENDING ──
  if (application?.verificationStatus === 'PENDING') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold">Authority Verification</h1>
          <p className="text-xs sm:text-sm text-mute">Your application is with the admin team.</p>
        </div>
        <div className="bg-card border border-line rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-civic-amber/15 text-civic-amber-dark flex items-center justify-center shrink-0">
              <Clock3 size={20} />
            </div>
            <div>
              <p className="font-extrabold text-ink">Under Review</p>
              <p className="text-xs text-mute">Submitted {new Date(application.submittedAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <Field label="Full Name" value={application.fullName} />
            <Field label="Department" value={application.department.replace(/_/g, ' ')} />
            <Field label="Government ID" value={`${application.governmentIdType.replace(/_/g, ' ')} · ${application.governmentIdMasked}`} />
            <Field label="Document" value={application.hasDocument ? `Attached (${application.documentMimeType ?? 'file'})` : '—'} />
          </div>
          <button
            onClick={() => dispatch(fetchMyApplication())}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-card hover:border-brand"
          >
            <RefreshCw size={15} /> Check status
          </button>
        </div>
      </div>
    );
  }

  // ── NEW or RESUBMIT FORM ──
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold">
          {isResubmit ? 'Correct & Re-submit Application' : 'Become a Verified Authority'}
        </h1>
        <p className="text-xs sm:text-sm text-mute">
          {isResubmit
            ? 'Your previous application was rejected — fix the details below and submit again with a fresh document.'
            : 'Submit your details and identity proof. An admin reviews every application.'}
        </p>
      </div>

      {isResubmit && application?.rejectionReason && (
        <div className="flex items-start gap-2 text-sm bg-brand-soft border border-brand/30 rounded-xl px-4 py-3" role="alert">
          <XCircle size={17} className="shrink-0 mt-0.5 text-brand" />
          <p className="text-ink"><span className="font-bold">Rejection reason: </span>{application.rejectionReason}</p>
        </div>
      )}
      {lastSubmitted && (
        <div className="flex items-center gap-2 text-sm font-semibold bg-civic-green/10 border border-civic-green/30 text-civic-green rounded-xl px-4 py-3" role="status">
          <CheckCircle2 size={17} className="shrink-0" /> Application submitted — now under review.
        </div>
      )}
      {(formError || submitError) && (
        <div className="text-sm font-semibold bg-brand-soft border border-brand/30 text-brand rounded-xl px-4 py-3 whitespace-pre-line" role="alert">
          {formError ?? submitError}
        </div>
      )}

      {!options ? (
        <p className="text-sm text-soft">Options unavailable — please retry.</p>
      ) : (
        <form onSubmit={submit} className="bg-card border border-line rounded-2xl p-4 sm:p-6 space-y-5">
          <section>
            <h2 className="font-extrabold text-sm text-ink mb-3">Personal details</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={labelCls}>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="As on your government ID" maxLength={120} className={`${inputCls} mt-1.5 normal-case font-normal`} /></label>
              <label className={labelCls}>Date of birth<input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={`${inputCls} mt-1.5`} /></label>
              <label className={labelCls}>Phone<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10–15 digits" maxLength={20} inputMode="tel" className={`${inputCls} mt-1.5`} /></label>
              <label className={labelCls}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@department.gov" maxLength={320} className={`${inputCls} mt-1.5`} /></label>
              <label className={`${labelCls} sm:col-span-2`}>Address<textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} maxLength={500} placeholder="Residential address" className={`${inputCls} mt-1.5 resize-y`} /></label>
            </div>
          </section>

          <section>
            <h2 className="font-extrabold text-sm text-ink mb-3">Identity proof</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={labelCls}>ID type
                <select value={governmentIdType} onChange={(e) => setGovernmentIdType(e.target.value)} className={`${inputCls} mt-1.5`}>
                  {options.governmentIdTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className={labelCls}>ID number<input value={governmentIdNumber} onChange={(e) => setGovernmentIdNumber(e.target.value)} placeholder="Min 8 characters" maxLength={64} className={`${inputCls} mt-1.5`} /></label>
            </div>
            <label className={`${labelCls} mt-3 block`}>Identity document
              <span className="mt-1.5 flex items-center gap-2 bg-canvas border border-dashed border-line rounded-xl px-3 py-3 cursor-pointer hover:border-brand">
                <UploadCloud size={18} className="text-brand shrink-0" />
                <span className="text-xs font-semibold text-soft normal-case tracking-normal">{docHint}</span>
                <input
                  type="file"
                  accept={ACCEPTED_DOCS.join(',')}
                  onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </span>
            </label>
          </section>

          <section>
            <h2 className="font-extrabold text-sm text-ink mb-3">Professional information</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className={labelCls}>Department
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`${inputCls} mt-1.5`}>
                  {options.departments.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className={labelCls}>Designation
                <select value={designation} onChange={(e) => setDesignation(e.target.value)} className={`${inputCls} mt-1.5`}>
                  {options.designations.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className={labelCls}>Jurisdiction type
                <select value={jurisdictionType} onChange={(e) => setJurisdictionType(e.target.value)} className={`${inputCls} mt-1.5`}>
                  {options.jurisdictionTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
              <label className={labelCls}>Jurisdiction name<input value={jurisdictionName} onChange={(e) => setJurisdictionName(e.target.value)} placeholder="e.g. Ranchi Ward 4" maxLength={200} className={`${inputCls} mt-1.5`} /></label>
              <label className={labelCls}>Availability
                <select value={availability} onChange={(e) => setAvailability(e.target.value)} className={`${inputCls} mt-1.5`}>
                  <option value="">Default ({options.availabilities[0]?.replace(/_/g, ' ') ?? 'Available'})</option>
                  {options.availabilities.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="mt-3">
              <legend className={labelCls}>Skills (at least one)</legend>
              <div className="flex flex-wrap gap-2 mt-2">
                {options.skills.map((s) => (
                  <label
                    key={s}
                    className={`text-xs font-bold px-3 py-2 rounded-full border cursor-pointer transition-colors ${
                      skills.includes(s) ? 'bg-brand text-white border-transparent' : 'bg-canvas text-soft border-line hover:border-brand'
                    }`}
                  >
                    <input type="checkbox" checked={skills.includes(s)} onChange={() => toggleSkill(s)} className="sr-only" />
                    {s.replace(/_/g, ' ')}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <button
            type="submit"
            disabled={submitLoading}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3.5 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-60"
          >
            <FileText size={16} />{submitLoading ? 'Submitting…' : isResubmit ? 'Re-submit Application' : 'Submit Application'}
          </button>
        </form>
      )}
    </div>
  );
}
