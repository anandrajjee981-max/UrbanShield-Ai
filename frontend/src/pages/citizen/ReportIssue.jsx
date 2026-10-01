import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Droplet,
  ImageOff,
  Leaf,
  Lightbulb,
  MapPin,
  Road,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
} from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Button, { ButtonLink } from '../../components/common/Button.jsx'
import LocationPicker from '../../components/reports/LocationPicker.jsx'
import { useReports } from '../../hooks/useReports.js'
import { addToast } from '../../redux/slices/uiSlice.js'
import { selectCurrentUser } from '../../redux/selectors.js'
import { ISSUE_TYPES, PRIORITIES, WARDS } from '../../utils/constants.js'
import { CITY } from '../../utils/constants.js'

/**
 * Report an issue.
 *
 * A four step form - what happened, where, evidence, contact - with client side
 * validation before anything is submitted. Photos stay as object URLs in this
 * build; a real deployment would upload them first and send the returned keys.
 */

const ISSUE_ICONS = {
  sun: Sun,
  'droplet-off': Droplet,
  droplet: Droplet,
  'trash-2': Trash2,
  'lightbulb-off': Lightbulb,
  construction: Road,
  leaf: Leaf,
  'circle-alert': TriangleAlert,
}

const STEPS = ['What happened', 'Where', 'Evidence', 'Review']

const EMPTY_FORM = {
  issueType: '',
  description: '',
  ward: '',
  address: '',
  location: null,
  photos: [],
  priority: 'medium',
  contactPhone: '',
  contactEmail: '',
  anonymous: false,
}

export default function ReportIssue() {
  const dispatch = useDispatch()
  const user = useSelector(selectCurrentUser)
  const { createReport, submitting } = useReports({ auto: false })

  const [step, setStep] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(null)
  const [photoError, setPhotoError] = useState('')

  useEffect(() => {
    document.title = 'Report an Issue · UbranShieldAI'
  }, [])

  const selectedType = useMemo(() => ISSUE_TYPES.find((type) => type.value === form.issueType), [form.issueType])

  const errors = useMemo(() => {
    const next = {}
    if (step === 0) {
      if (!form.issueType) next.issueType = 'Choose the issue that best matches what you saw.'
      if (form.description.trim().length < 20) next.description = 'Please describe the issue in at least 20 characters.'
    }
    if (step === 1) {
      if (!form.location) next.location = 'Pin the location on the map so the team can find it.'
      if (!form.ward) next.ward = 'Select the ward.'
    }
    if (step === 3) {
      if (!form.anonymous && !form.contactPhone.trim() && !form.contactEmail.trim()) {
        next.contact = 'Add a phone number or email, or tick "submit anonymously".'
      }
    }
    return next
  }, [form, step])

  const update = (patch) => setForm((current) => ({ ...current, ...patch }))
  const markTouched = (key) => setTouched((current) => ({ ...current, [key]: true }))

  const stepErrors = Object.keys(errors).filter((key) => touched[key])

  function goNext() {
    const stepKeys = { 0: ['issueType', 'description'], 1: ['location', 'ward'] }
    const keys = stepKeys[step] ?? []
    const nextTouched = { ...touched }
    keys.forEach((key) => {
      nextTouched[key] = true
    })
    setTouched(nextTouched)

    if (keys.some((key) => errors[key])) return
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function handleFiles(event) {
    const selectedFiles = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (selectedFiles.some((file) => !file.type.startsWith('image/'))) {
      setPhotoError('Choose image files only.')
      return
    }
    if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      setPhotoError('Each photo must be 10 MB or smaller.')
      return
    }

    const remaining = 4 - form.photos.length
    if (remaining <= 0) {
      setPhotoError('You can attach up to four photos.')
      return
    }

    const files = selectedFiles.slice(0, remaining)
    const withUrls = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }))
    update({ photos: [...form.photos, ...withUrls] })
    setPhotoError(selectedFiles.length > remaining ? 'Only four photos can be attached.' : '')
  }

  function removePhoto(id) {
    const target = form.photos.find((photo) => photo.id === id)
    if (target?.url?.startsWith('blob:')) URL.revokeObjectURL(target.url)
    update({ photos: form.photos.filter((photo) => photo.id !== id) })
  }

  async function handleSubmit() {
    setTouched((current) => ({ ...current, contact: true }))
    if (errors.contact || !selectedType || !form.location) return

    const payload = {
      issueType: selectedType.value,
      issueLabel: selectedType.label,
      category: selectedType.category,
      title: `${selectedType.label} - ${form.address || form.ward}`,
      description: form.description.trim(),
      ward: form.ward,
      address: form.address.trim(),
      latitude: form.location.latitude,
      longitude: form.location.longitude,
      photos: form.photos,
      priority: form.priority,
      contactPhone: form.contactPhone.trim(),
      contactEmail: form.contactEmail.trim(),
      anonymous: form.anonymous,
    }

    const result = await createReport(payload)
    if (result.meta.requestStatus === 'fulfilled') setSubmitted(result.payload)
  }

  /* ---------------------------- confirmation ---------------------------- */

  if (submitted) {
    return (
      <PageShell>
        <div className="card mx-auto max-w-xl p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <CheckCircle2 size={28} aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-xl font-bold text-ink">Report submitted</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-body">
            Your report is in the verification queue. An officer will verify it before it is assigned to a department.
            Keep this tracking id for your records.
          </p>

          <p className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-4 py-3 font-mono text-base font-bold tracking-wide text-brand-700">
            {submitted.trackingId}
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <ButtonLink to="/citizen/reports" variant="primary" size="md">
              View my reports
            </ButtonLink>
            <Button
              variant="secondary"
              size="md"
              icon={Camera}
              onClick={() => {
                setForm(EMPTY_FORM)
                setTouched({})
                setStep(0)
                setSubmitted(null)
              }}
            >
              Report another issue
            </Button>
          </div>

          <p className="mt-5 text-[11px] text-muted">
            Submitted by {form.anonymous ? 'an anonymous resident' : (user?.name ?? 'you')} · {form.ward}
          </p>
        </div>
      </PageShell>
    )
  }

  /* -------------------------------- form -------------------------------- */

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${CITY.name} · Civic reporting`}
        title="Report an Issue"
        subtitle="Four short steps. The more precise the location and description, the faster it gets resolved."
        actions={
          <ButtonLink to="/citizen" variant="ghost" size="sm" icon={ArrowLeft}>
            Back to home
          </ButtonLink>
        }
      />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Progress">
        {STEPS.map((label, index) => {
          const state = index === step ? 'current' : index < step ? 'done' : 'todo'
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(index)}
                disabled={index >= step}
                aria-label={index < step ? `Return to ${label}` : undefined}
                className={`flex items-center gap-2 text-left ${index < step ? 'cursor-pointer' : 'cursor-default'}`}
              >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  state === 'current'
                    ? 'bg-brand-500 text-navy-900'
                    : state === 'done'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-slate-100 text-muted'
                }`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                {state === 'done' ? '✓' : index + 1}
              </span>
              <span className={`text-[12px] ${state === 'current' ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</span>
              </button>
              {index < STEPS.length - 1 ? <span className="mx-1 h-px w-5 bg-line sm:w-8" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>

      <form
        className="grid gap-5 lg:grid-cols-[1fr_300px]"
        onSubmit={(event) => {
          event.preventDefault()
          if (step < STEPS.length - 1) {
            goNext()
            return
          }
          handleSubmit()
        }}
        noValidate
      >
        <div className="space-y-5">
          {/* STEP 1 - what happened */}
          {step === 0 ? (
            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink">What happened?</h2>
              <p className="mt-1 text-[12px] text-muted">Pick the closest match, then describe it in your own words.</p>

              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {ISSUE_TYPES.map((type) => {
                  const Icon = ISSUE_ICONS[type.icon] ?? TriangleAlert
                  const selected = form.issueType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => update({ issueType: type.value })}
                      aria-pressed={selected}
                      className={`flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition ${
                        selected
                          ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500'
                          : 'border-line bg-white text-body hover:border-brand-200 hover:bg-brand-50/40'
                      }`}
                    >
                      <Icon size={19} aria-hidden="true" />
                      <span className="text-[11px] font-semibold leading-tight">{type.label}</span>
                    </button>
                  )
                })}
              </div>
              {touched.issueType && errors.issueType ? (
                <p className="mt-2 text-[11px] font-medium text-risk-high">{errors.issueType}</p>
              ) : null}

              <div className="mt-5">
                <label htmlFor="report-description" className="text-[12px] font-semibold text-ink">
                  Description
                </label>
                <textarea
                  id="report-description"
                  value={form.description}
                  onChange={(event) => {
                    update({ description: event.target.value })
                    markTouched('description')
                  }}
                  onBlur={() => markTouched('description')}
                  rows={5}
                  maxLength={600}
                  placeholder="What did you see, when did it start, and is anyone at risk? Mention anything that helps a crew prepare."
                  aria-invalid={Boolean(touched.description && errors.description)}
                  aria-describedby="report-description-help"
                  className={`input mt-1.5 resize-y text-[13px] ${touched.description && errors.description ? 'border-risk-high' : ''}`}
                />
                <div className="mt-1 flex items-center justify-between">
                  <p id="report-description-help" className={`text-[11px] ${touched.description && errors.description ? 'font-medium text-risk-high' : 'text-muted'}`}>
                    {touched.description && errors.description ? errors.description : 'Minimum 20 characters.'}
                  </p>
                  <p className="text-[11px] text-muted">{form.description.trim().length} / 600</p>
                </div>
              </div>

              <div className="mt-5">
                <span className="text-[12px] font-semibold text-ink">How urgent is it?</span>
                <p className="mt-0.5 text-[11px] text-muted">
                  This sets the initial priority. An officer can change it after verification.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRIORITIES.map((priority) => (
                    <button
                      key={priority.value}
                      type="button"
                      onClick={() => update({ priority: priority.value })}
                      aria-pressed={form.priority === priority.value}
                      className={`rounded-lg border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition ${
                        form.priority === priority.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-line bg-white text-body hover:border-brand-200'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {/* STEP 2 - where */}
          {step === 1 ? (
            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink">Where is it?</h2>
              <p className="mt-1 text-[12px] text-muted">Pin the exact spot, then tell us the ward and the street.</p>

              <div className="mt-4">
                <LocationPicker value={form.location} error={touched.location ? errors.location : null} onChange={(location) => update({ location })} />
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="report-ward" className="text-[12px] font-semibold text-ink">
                    Ward <span className="text-risk-high">*</span>
                  </label>
                  <select
                    id="report-ward"
                    value={form.ward}
                    onChange={(event) => {
                      update({ ward: event.target.value })
                      markTouched('ward')
                    }}
                    onBlur={() => markTouched('ward')}
                    className={`input mt-1.5 text-[13px] ${touched.ward && errors.ward ? 'border-risk-high' : ''}`}
                  >
                    <option value="">Select a ward</option>
                    {WARDS.map((ward) => (
                      <option key={ward} value={ward}>
                        {ward}
                      </option>
                    ))}
                  </select>
                  {touched.ward && errors.ward ? <p className="mt-1 text-[11px] font-medium text-risk-high">{errors.ward}</p> : null}
                </div>

                <div>
                  <label htmlFor="report-address" className="text-[12px] font-semibold text-ink">
                    Street or landmark
                  </label>
                  <input
                    id="report-address"
                    type="text"
                    value={form.address}
                    onChange={(event) => update({ address: event.target.value })}
                    placeholder="e.g. 4th Cross, near the temple"
                    className="input mt-1.5 text-[13px]"
                  />
                </div>
              </div>
            </section>
          ) : null}

          {/* STEP 3 - evidence */}
          {step === 2 ? (
            <section className="card p-5">
              <h2 className="text-base font-semibold text-ink">Add evidence</h2>
              <p className="mt-1 text-[12px] text-muted">Photos are optional. Add up to four if they help show the issue.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-slate-50/60 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                  <Camera size={22} className="text-brand-600" aria-hidden="true" />
                  <span className="mt-2 text-[13px] font-semibold text-ink">Take a photo</span>
                  <span className="mt-0.5 text-[11px] text-muted">Open your camera</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFiles} disabled={form.photos.length >= 4} className="sr-only" />
                </label>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-slate-50/60 px-4 py-6 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                  <Upload size={22} className="text-brand-600" aria-hidden="true" />
                  <span className="mt-2 text-[13px] font-semibold text-ink">Upload photos</span>
                  <span className="mt-0.5 text-[11px] text-muted">Choose up to 4 images, 10 MB each</span>
                  <input type="file" accept="image/*" multiple onChange={handleFiles} disabled={form.photos.length >= 4} className="sr-only" />
                </label>
              </div>
              {photoError ? <p role="alert" className="mt-2 text-[11px] font-medium text-risk-high">{photoError}</p> : null}
              {form.photos.length ? (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.photos.map((photo) => (
                    <li key={photo.id} className="group relative overflow-hidden rounded-xl border border-line">
                      <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label={`Remove ${photo.name}`}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-risk-high opacity-0 shadow transition group-hover:opacity-100 focus:opacity-100"
                      >
                        <ImageOff size={13} />
                      </button>
                      <p className="truncate px-2 py-1.5 text-[10px] text-muted">{photo.name}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}

          {/* STEP 4 - review */}
          {step === 3 ? (
            <section className="space-y-5">
              <div className="card p-5">
                <h2 className="text-base font-semibold text-ink">Review and submit</h2>
                <p className="mt-1 text-[12px] text-muted">Check the details before sending this to the city.</p>

                <dl className="mt-4 divide-y divide-line">
                  {[
                    ['Issue', form.issueType ? selectedType.label : '—'],
                    ['Priority', form.priority],
                    ['Description', form.description.trim() || '—'],
                    ['Ward', form.ward || '—'],
                    ['Address', form.address.trim() || '—'],
                    ['Coordinates', form.location ? `${form.location.latitude}, ${form.location.longitude}` : '—'],
                    ['Photos', form.photos.length ? `${form.photos.length} attached` : 'None attached'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-4 py-2.5">
                      <dt className="w-28 shrink-0 text-[12px] text-muted">{label}</dt>
                      <dd className="min-w-0 flex-1 text-[13px] font-medium capitalize text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="card p-5">
                <h2 className="text-base font-semibold text-ink">How can we reach you?</h2>
                <p className="mt-1 text-[12px] text-muted">
                  Officers use this only if they need to clarify the report before resolving it.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="report-phone" className="text-[12px] font-semibold text-ink">
                      Phone
                    </label>
                    <input
                      id="report-phone"
                      type="tel"
                      value={form.contactPhone}
                      onChange={(event) => {
                        update({ contactPhone: event.target.value })
                        markTouched('contact')
                      }}
                      placeholder={user?.phone ?? '+91 98765 43210'}
                      className="input mt-1.5 text-[13px]"
                    />
                  </div>
                  <div>
                    <label htmlFor="report-email" className="text-[12px] font-semibold text-ink">
                      Email
                    </label>
                    <input
                      id="report-email"
                      type="email"
                      value={form.contactEmail}
                      onChange={(event) => {
                        update({ contactEmail: event.target.value })
                        markTouched('contact')
                      }}
                      placeholder={user?.email ?? 'you@example.com'}
                      className="input mt-1.5 text-[13px]"
                    />
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.anonymous}
                    onChange={(event) => update({ anonymous: event.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded border-line text-brand-500 focus:ring-brand-400"
                  />
                  <span className="text-[12px] text-body">
                    <span className="font-semibold text-ink">Submit anonymously</span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      Your name is withheld from the report. The issue is still tracked and resolved normally.
                    </span>
                  </span>
                </label>

                {touched.contact && errors.contact ? (
                  <p className="mt-2 text-[11px] font-medium text-risk-high">{errors.contact}</p>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={ArrowLeft}
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
              disabled={step === 0}
            >
              Back
            </Button>

            <div className="flex items-center gap-3">
              {stepErrors.length ? <p className="text-[11px] font-medium text-risk-high">Fix the highlighted fields</p> : null}
              <Button type="submit" variant="primary" size="md" icon={MapPin} loading={submitting}>
                {step < STEPS.length - 1 ? 'Continue' : 'Submit report'}
              </Button>
            </div>
          </div>
        </div>

        {/* Side rail */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <MapPin size={13} className="text-brand-600" aria-hidden="true" />
              What happens next
            </p>
            <ol className="mt-3 space-y-3">
              {[
                ['Reported', 'Your report enters the verification queue.'],
                ['Verified', 'An officer confirms it is real and sets the priority.'],
                ['Assigned', 'It goes to the department that owns that issue type.'],
                ['In progress', 'A field team is dispatched and you can see their updates.'],
                ['Resolved', 'The work is marked complete with a closing note.'],
              ].map(([stage, body], index) => (
                <li key={stage} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-ink">{stage}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <p className="text-[12px] font-semibold text-ink">Reporting an emergency?</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-body">
              This platform routes civic issues, not emergencies. For immediate danger call the city helpline before
              submitting.
            </p>
            <button
              type="button"
              onClick={() => dispatch(addToast({ tone: 'info', title: 'City helpline', message: 'Dial 112 for emergencies.' }))}
              className="mt-2.5 text-[11px] font-semibold text-brand-600 hover:underline"
            >
              Show helpline number
            </button>
          </div>
        </aside>
      </form>
    </PageShell>
  )
}
