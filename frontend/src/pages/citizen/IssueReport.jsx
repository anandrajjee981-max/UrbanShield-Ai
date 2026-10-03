import { useEffect, useState } from 'react'
import { Camera, MapPin, Send } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/common/Button.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import PageShell from '../../components/common/PageShell.jsx'
import { createIssue } from '../../redux/api/issuesApi.js'

const ISSUE_TYPES = [
  { value: 'WATER_LEAKAGE', label: 'Water Leakage' },
  { value: 'WATER_SHORTAGE', label: 'Water Shortage' },
  { value: 'EXTREME_HEAT', label: 'Extreme Heat' },
  { value: 'FLOODING', label: 'Flooding' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'OTHER', label: 'Other' },
]

export default function IssueReport() {
  const navigate = useNavigate()
  const [issueType, setIssueType] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!previewUrl) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  function chooseImage(event) {
    const file = event.target.files?.[0] ?? null
    setImage(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : '')
  }

  function trackLocation() {
    if (!navigator.geolocation) {
      setFormError('Location services are not available in this browser.')
      return
    }
    setLocating(true)
    setFormError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoordinates({ latitude: coords.latitude, longitude: coords.longitude })
        setLocating(false)
      },
      (error) => {
        setFormError(error.message || 'Could not read your location. Enter an address instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (!issueType || !description.trim()) {
      setFormError('Choose an issue type and add a description.')
      return
    }
    if (!coordinates && !address.trim()) {
      setFormError('Track your location or enter a manual address.')
      return
    }

    setSubmitting(true)
    try {
      await createIssue({
        issueType,
        description: description.trim(),
        image,
        locationType: coordinates ? 'GPS' : 'MANUAL',
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        address,
      })
      navigate('/citizen/reports', { replace: true })
    } catch (error) {
      setFormError(error.status === 403 ? "You don't have permission to access this page." : error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Citizen workspace" title="Report an Issue" subtitle="Describe the problem and help the response team find it." />
      <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-5 rounded-lg border border-line bg-white p-4 sm:p-6">
        <div>
          <label htmlFor="issue-type" className="text-sm font-semibold text-ink">Issue Type <span className="text-risk-high">*</span></label>
          <select id="issue-type" required value={issueType} onChange={(event) => setIssueType(event.target.value)} className="input mt-1.5 text-sm">
            <option value="">Choose an issue type</option>
            {ISSUE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="issue-description" className="text-sm font-semibold text-ink">Description <span className="text-risk-high">*</span></label>
          <textarea id="issue-description" required value={description} onChange={(event) => setDescription(event.target.value)} rows={4} maxLength={2000} className="input mt-1.5 resize-y text-sm" placeholder="What happened, and where should the team look?" />
        </div>

        <div>
          <label htmlFor="issue-image" className="text-sm font-semibold text-ink">Add Image <span className="font-normal text-muted">(optional)</span></label>
          <label htmlFor="issue-image" className="mt-1.5 flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-body hover:bg-slate-50">
            <Camera size={17} aria-hidden="true" />
            {image?.name ?? 'Choose a file or take a photo'}
          </label>
          <input id="issue-image" type="file" accept="image/*" capture="environment" onChange={chooseImage} className="sr-only" />
          {previewUrl ? <img src={previewUrl} alt="Selected issue evidence" className="mt-3 max-h-64 w-full rounded-lg border border-line object-contain" /> : null}
        </div>

        <section aria-labelledby="issue-location-title" className="space-y-3 border-t border-line pt-5">
          <div>
            <h2 id="issue-location-title" className="text-sm font-semibold text-ink">Location <span className="text-risk-high">*</span></h2>
            <p className="mt-1 text-xs text-muted">Track your current location or enter the address manually.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" icon={MapPin} loading={locating} onClick={trackLocation}>
            Track My Location
          </Button>
          {coordinates ? <p className="text-xs text-brand-700">GPS: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}</p> : null}
          <label htmlFor="issue-address" className="block text-xs font-semibold text-body">Or Enter Manually</label>
          <input id="issue-address" value={address} onChange={(event) => setAddress(event.target.value)} onFocus={() => setCoordinates(null)} placeholder="Street, landmark, or neighbourhood" className="input text-sm" />
        </section>

        {formError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800">{formError}</p> : null}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" icon={Send} loading={submitting}>Submit Report</Button>
        </div>
      </form>
    </PageShell>
  )
}