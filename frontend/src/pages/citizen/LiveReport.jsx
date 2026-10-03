import { useState } from 'react'
import { ArrowLeft, Camera, CheckCircle2, MapPin, Phone, Siren, Upload, X } from 'lucide-react'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'
import Button, { ButtonLink } from '../../components/common/Button.jsx'
import LocationPicker from '../../components/reports/LocationPicker.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import { useReports } from '../../hooks/useReports.js'
import { ISSUE_TYPES, WARDS } from '../../utils/constants.js'
import { CITY } from '../../utils/constants.js'

export default function LiveReport() {
  const { createReport, submitting } = useReports({ auto: false })
  const geolocation = useGeolocation({ auto: false })
  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [ward, setWard] = useState('')
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState(null)
  const [photos, setPhotos] = useState([])
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [errors, setErrors] = useState({})
  const [photoError, setPhotoError] = useState('')
  const [submitted, setSubmitted] = useState(null)

  const selectedType = ISSUE_TYPES.find((type) => type.value === issueType)

  function addPhotos(event) {
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

    const remaining = Math.max(0, 4 - photos.length)
    if (remaining === 0) {
      setPhotoError('You can attach up to four photos.')
      return
    }
    const files = selectedFiles.slice(0, remaining)
    setPhotos((current) => [
      ...current,
      ...files.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ])
    setPhotoError(selectedFiles.length > remaining ? 'Only four photos can be attached.' : '')
  }

  function removePhoto(id) {
    const photo = photos.find((item) => item.id === id)
    if (photo?.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url)
    setPhotos((current) => current.filter((item) => item.id !== id))
  }

  function startNewReport() {
    photos.forEach((photo) => {
      if (photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url)
    })
    setIssueType('')
    setDescription('')
    setWard('')
    setAddress('')
    setLocation(null)
    setPhotos([])
    setShowMapPicker(false)
    setErrors({})
    setSubmitted(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (!selectedType) nextErrors.issueType = 'Choose an issue type.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const result = await createReport({
      issueType: selectedType.value,
      issueLabel: selectedType.label,
      category: selectedType.category,
      title: address.trim() || ward ? `${selectedType.label} - ${address.trim() || ward}` : selectedType.label,
      description: description.trim(),
      ward,
      address: address.trim(),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      photos,
      priority: 'high',
      contactPhone: '',
      contactEmail: '',
      anonymous: true,
    })

    if (result.meta.requestStatus === 'fulfilled') setSubmitted(result.payload)
  }

  if (submitted) {
    return (
      <PageShell>
        <section className="card mx-auto max-w-xl p-6 text-center sm:p-8">
          <CheckCircle2 className="mx-auto text-brand-600" size={34} aria-hidden="true" />
          <h1 className="mt-4 text-xl font-bold text-ink">Live report sent</h1>
          <p className="mt-2 text-sm text-body">Your report is in the verification queue.</p>
          <p className="mt-4 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-4 py-3 font-mono font-bold text-brand-700">
            {submitted.trackingId}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <ButtonLink to="/citizen/reports" variant="primary">View my reports</ButtonLink>
            <Button variant="secondary" onClick={startNewReport}>
              New live report
            </Button>
          </div>
        </section>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow={`${CITY.name} · Quick reporting`}
        title="Live Report"
        subtitle="Submit a civic issue anonymously. Only issue type is required; description, ward, location, and photos are optional. No name, phone, or email is attached."
        actions={
          <ButtonLink to="/citizen/report" variant="secondary" size="sm" icon={ArrowLeft}>
            Full report form
          </ButtonLink>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <form className="card min-w-0 space-y-5 p-4 sm:p-6" onSubmit={handleSubmit} noValidate>
          <div>
            <div>
              <label htmlFor="live-issue-type" className="text-[12px] font-semibold text-ink">
                Issue type <span className="text-risk-high">*</span>
              </label>
              <select
                id="live-issue-type"
                value={issueType}
                onChange={(event) => setIssueType(event.target.value)}
                aria-invalid={Boolean(errors.issueType)}
                className="input mt-1.5 text-[13px]"
              >
                <option value="">Choose an issue</option>
                {ISSUE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
              {errors.issueType ? <p className="mt-1 text-[11px] text-risk-high">{errors.issueType}</p> : null}
            </div>
          </div>

          <div>
            <label htmlFor="live-description" className="text-[12px] font-semibold text-ink">
              What is happening? <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="live-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={600}
              placeholder="Briefly describe the issue and any immediate risk."
              aria-invalid={Boolean(errors.description)}
              className="input mt-1.5 resize-y text-[13px]"
            />
            <div className="mt-1 flex justify-between gap-3 text-[11px]">
              <span className={errors.description ? 'text-risk-high' : 'text-muted'}>
                {errors.description ?? 'Optional description.'}
              </span>
              <span className="shrink-0 text-muted">{description.length}/600</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="live-ward" className="text-[12px] font-semibold text-ink">
                Ward <span className="font-normal text-muted">(optional)</span>
              </label>
              <select
                id="live-ward"
                value={ward}
                onChange={(event) => setWard(event.target.value)}
                aria-invalid={Boolean(errors.ward)}
                className="input mt-1.5 text-[13px]"
              >
                <option value="">Select ward</option>
                {WARDS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {errors.ward ? <p className="mt-1 text-[11px] text-risk-high">{errors.ward}</p> : null}
            </div>
            <div>
              <label htmlFor="live-address" className="text-[12px] font-semibold text-ink">Street or landmark</label>
              <input
                id="live-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Nearby road or landmark"
                className="input mt-1.5 text-[13px]"
              />
            </div>
          </div>

          <section aria-labelledby="live-location-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="live-location-heading" className="text-[12px] font-semibold text-ink">Report location <span className="font-normal text-muted">(optional)</span></h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : 'Use GPS or place a pin manually.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={MapPin}
                  loading={geolocation.isLocating}
                  onClick={async () => {
                    const position = await geolocation.locate()
                    if (position) setLocation(position)
                  }}
                >
                  Use my location
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowMapPicker((visible) => !visible)}>
                  {showMapPicker ? 'Hide map' : 'Pin manually'}
                </Button>
              </div>
            </div>
            {geolocation.error ? <p className="mt-2 text-[11px] text-risk-medium">{geolocation.error}</p> : null}
            {showMapPicker ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-line">
                <LocationPicker value={location} onChange={setLocation} />
              </div>
            ) : null}
          </section>

          <section aria-labelledby="live-evidence-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="live-evidence-heading" className="text-[12px] font-semibold text-ink">Photos <span className="font-normal text-muted">(optional)</span></h2>
                <p className="mt-0.5 text-[11px] text-muted">Attach up to four images, 10 MB each.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-body transition hover:bg-slate-50">
                  <Camera size={14} aria-hidden="true" />
                  Take photo
                  <input type="file" accept="image/*" capture="environment" onChange={addPhotos} disabled={photos.length >= 4} className="sr-only" />
                </label>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-body transition hover:bg-slate-50">
                  <Upload size={14} aria-hidden="true" />
                  Upload
                  <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={photos.length >= 4} className="sr-only" />
                </label>
              </div>
            </div>
            {photoError ? <p role="alert" className="mt-2 text-[11px] font-medium text-risk-high">{photoError}</p> : null}
            {photos.length ? (
              <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {photos.map((photo) => (
                  <li key={photo.id} className="relative overflow-hidden rounded-lg border border-line">
                    <img src={photo.url} alt={photo.name} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      aria-label={`Remove ${photo.name}`}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-md bg-white/95 text-risk-high shadow"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                    <p className="truncate px-2 py-1.5 text-[10px] text-muted">{photo.name}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <ButtonLink to="/citizen" variant="ghost" size="sm" icon={ArrowLeft}>Cancel</ButtonLink>
            <Button type="submit" variant="primary" icon={Siren} loading={submitting}>
              Send live report
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="text-[12px] font-semibold text-ink">Immediate danger?</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-body">For an emergency, call the helpline before submitting a civic report.</p>
            <a
              href="tel:112"
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-risk-high px-4 text-sm font-semibold text-white transition hover:bg-red-600"
            >
              <Phone size={16} aria-hidden="true" />
              Call 112
            </a>
          </section>

          <section className="rounded-lg border border-line bg-slate-50 p-5">
            <p className="text-[12px] font-semibold text-ink">Need more details?</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-body">The full form includes priority selection and an extra review step.</p>
            <ButtonLink to="/citizen/report" variant="secondary" size="sm" className="mt-3 w-full">
              Open full report form
            </ButtonLink>
          </section>
        </aside>
      </div>
    </PageShell>
  )
}