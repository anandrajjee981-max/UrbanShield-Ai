import { useEffect, useRef, useState } from 'react';
import { X, MapPin, LocateFixed, ImagePlus, Trash2, CheckCircle2, Camera, RefreshCcw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { submitReport } from '../../store/slices/reportsSlice';
import { getCurrentPosition } from '../../services/mapService';
import { popIn } from '../../animations/gsap';
import type { IncidentCategory } from '../../types';

const CATEGORIES: { value: IncidentCategory; label: string; color: string }[] = [
  { value: 'flood', label: 'Flood / Water', color: '#4482ea' },
  { value: 'heat', label: 'Heat', color: '#f36d24' },
  { value: 'fire', label: 'Fire / Other', color: '#f84424' },
  { value: 'air', label: 'Air / Other', color: '#8a7f63' },
  { value: 'infrastructure', label: 'Roads / Drainage', color: '#fb9c47' },
  { value: 'medical', label: 'Medical / Other', color: '#51933a' },
];

const inputCls =
  'w-full bg-canvas border border-line rounded-xl px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-mute/70';

export default function ReportFormModal({ onClose }: { onClose: (newId?: string) => void }) {
  const dispatch = useAppDispatch();
  const submitting = useAppSelector((s) => s.reports.submitting);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('flood');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [doneId, setDoneId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Live camera capture state.
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    popIn('.report-modal');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  };

  // Always release the camera when the modal unmounts.
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** Attach the live stream to the <video> once it is rendered. */
  useEffect(() => {
    if (cameraOn && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { /* autoplay blocked — user can tap play */ });
    }
  }, [cameraOn]);

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera is not supported in this browser. Please upload a photo instead.');
      return;
    }
    setError('');
    setCameraStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch {
      setError('Could not open the camera. Allow camera permission (needs HTTPS or localhost), or upload a photo instead.');
    } finally {
      setCameraStarting(false);
    }
  };

  /** Grab the current video frame → JPEG file → same upload path as gallery. */
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError('Camera is not ready yet — wait a second and retry.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture the photo — please retry.');
          return;
        }
        stopCamera();
        onPhoto(new File([blob], `live-photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.85,
    );
  };

  const useLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setCoords(pos);
    } catch {
      setError('Could not access your location. Please type the address manually.');
    } finally {
      setLocating(false);
    }
  };

  const onPhoto = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('Image must be at most 5 MB (backend limit).'); return; }
    setError('');
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) { setError('Please add a title and a short description.'); return; }
    if (!address.trim() && !coords) { setError('Please add an address or use your current location.'); return; }
    setError('');
    // Backend has no `title` column — merge it into the description.
    const fullDescription = `${title.trim()}\n\n${description.trim()}`;
    const res = await dispatch(
      submitReport({ category, description: fullDescription, coords, address, photo: photoFile }),
    );
    if (submitReport.fulfilled.match(res)) {
      setDoneId(res.payload.id);
    } else {
      setError((res.payload as string) ?? 'Could not submit the report.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="report-modal bg-card border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-line sticky top-0 bg-card rounded-t-3xl z-10">
          <div>
            <h2 className="font-extrabold text-lg leading-tight">Report an Issue</h2>
            <p className="text-xs text-mute">Saved to the backend — status starts as REPORTED (pending review).</p>
          </div>
          <button onClick={() => onClose()} className="p-2 rounded-lg hover:bg-canvas" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {doneId ? (
          <div className="p-6 text-center">
            <CheckCircle2 size={48} className="mx-auto text-civic-green" />
            <h3 className="font-extrabold text-lg mt-3">Report submitted!</h3>
            <p className="text-sm text-soft mt-1">
              Reference <span className="font-bold text-ink">{doneId}</span> · status{' '}
              <span className="font-bold px-2 py-0.5 rounded-full bg-[#fdf0c8] text-[#965d13] text-xs">PENDING REVIEW</span>
            </p>
            <button
              onClick={() => onClose(doneId)}
              className="mt-5 w-full font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm"
            >
              Done — view in list
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-soft">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-2 rounded-xl border transition-colors ${
                      category === c.value
                        ? 'text-white border-transparent'
                        : 'bg-canvas text-soft border-line'
                    }`}
                    style={category === c.value ? { background: c.color } : undefined}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: category === c.value ? '#fff' : c.color }} />
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-mute mt-1.5">Mapped to backend types: flood→FLOODING, heat→EXTREME_HEAT, roads→DRAINAGE, rest→OTHER.</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-soft">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Drain overflowing near Block C" className={`${inputCls} mt-1.5`} maxLength={80} />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-soft">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is happening? Since when? Who is affected?" rows={3} className={`${inputCls} mt-1.5 resize-none`} maxLength={2000} />
              <p className="text-[11px] text-mute text-right mt-1">{description.length}/2000</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-soft">Location *</label>
              <div className="flex gap-2 mt-1.5">
                <div className="relative flex-1">
                  <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street / landmark / ward" className={`${inputCls} pl-9!`} />
                </div>
                <button type="button" onClick={useLocation} disabled={locating}
                  className="flex items-center gap-1.5 shrink-0 text-xs font-bold px-3 py-2.5 rounded-xl border border-line bg-canvas text-ink hover:border-brand disabled:opacity-60">
                  <LocateFixed size={14} />{locating ? '…' : 'GPS'}
                </button>
              </div>
              {coords && (
                <p className="text-[11px] font-semibold text-civic-blue mt-1.5">
                  Pinned at {coords[0].toFixed(4)}, {coords[1].toFixed(4)} — sent as GPS coordinates
                </p>
              )}
              {!coords && (
                <p className="text-[11px] text-mute mt-1.5">No GPS fix — address is sent as MANUAL location.</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-soft">Photo (optional, max 5 MB)</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              {photoPreview ? (
                <div className="relative mt-1.5">
                  <img src={photoPreview} alt="Report attachment" className="w-full h-40 object-cover rounded-xl border border-line" />
                  <button type="button" onClick={clearPhoto}
                    className="absolute top-2 right-2 p-2 rounded-lg bg-brand text-white shadow">
                    <Trash2 size={15} />
                  </button>
                </div>
              ) : cameraOn ? (
                <div className="mt-1.5 space-y-2">
                  <div className="relative">
                    <video ref={videoRef} playsInline muted autoPlay
                      className="w-full h-56 object-cover rounded-xl border border-line bg-black" />
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-1 rounded-full bg-black/60 text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={capturePhoto}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl bg-brand text-white hover:bg-brand-warm">
                      <Camera size={16} /> Capture photo
                    </button>
                    <button type="button" onClick={stopCamera}
                      className="flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl border border-line bg-canvas hover:border-brand">
                      <X size={15} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-line rounded-xl py-5 text-sm font-semibold text-mute hover:border-tag hover:text-civic-amber-dark">
                    <ImagePlus size={18} /> Gallery
                  </button>
                  <button type="button" onClick={startCamera} disabled={cameraStarting}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-line rounded-xl py-5 text-sm font-semibold text-mute hover:border-brand hover:text-brand disabled:opacity-60">
                    {cameraStarting ? (
                      <RefreshCcw size={18} className="animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                    {cameraStarting ? 'Opening…' : 'Live photo'}
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-xs font-semibold px-3 py-2.5 rounded-xl bg-[#fde8e2] text-brand">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full font-bold text-sm px-4 py-3 rounded-xl bg-brand text-white hover:bg-brand-warm disabled:opacity-70 flex items-center justify-center gap-2">
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Submitting…' : 'Submit Report'}
            </button>
            <p className="text-[11px] text-center text-mute">POST /api/issues — with photo it sends multipart `image`, otherwise JSON.</p>
          </form>
        )}
      </div>
    </div>
  );
}
