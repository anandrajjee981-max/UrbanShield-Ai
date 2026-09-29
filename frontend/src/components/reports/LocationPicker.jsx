import { MapPin, Navigation, X } from 'lucide-react'
import RiskMap from '../map/RiskMap.jsx'
import Button from '../common/Button.jsx'
import { useGeolocation } from '../../hooks/useGeolocation.js'

/**
 * Location step of the reporting form.
 *
 * Uses the shared `RiskMap` in `pickMode`, so the coordinate a citizen confirms
 * here is captured on exactly the same map the authority will later work on.
 */
export default function LocationPicker({ value, onChange, error }) {
  const { position, locate, isLocating, status, error: geoError } = useGeolocation({ auto: false })

  function handlePick(coords) {
    onChange(coords)
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-line">
        <RiskMap
          height="h-[340px]"
          riskZones={[]}
          reports={[]}
          layers={[]}
          pickMode
          interactive={false}
          showLegend={false}
          focus={value ? [value.latitude, value.longitude] : null}
          onPick={handlePick}
        />

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] flex -translate-x-1/2 -translate-y-full flex-col items-center">
          <span className="rounded-full bg-navy-900 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
            {value ? 'Location pinned' : 'Tap the map to pin'}
          </span>
          <MapPin size={22} className="mt-0.5 text-risk-high drop-shadow" aria-hidden="true" />
        </div>

        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-3 top-3 z-[600] flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-body shadow-raised transition hover:text-ink"
            aria-label="Clear pinned location"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 text-[12px]">
          {value ? (
            <p className="truncate text-body">
              <span className="font-semibold text-ink">Pinned:</span> {value.latitude}, {value.longitude}
            </p>
          ) : (
            <p className="text-muted">No location pinned yet. Tap anywhere on the map.</p>
          )}

          {status === 'denied' || status === 'unsupported' ? (
            <p className="mt-0.5 text-[11px] text-risk-medium">
              {status === 'unsupported' ? 'Geolocation is not available in this browser' : 'Location permission denied'} — pin
              manually instead.
            </p>
          ) : null}
          {geoError && status !== 'denied' && status !== 'unsupported' ? (
            <p className="mt-0.5 text-[11px] text-risk-medium">{geoError}</p>
          ) : null}
          {error ? <p className="mt-1 text-[11px] font-medium text-risk-high">{error}</p> : null}
        </div>

        <Button variant="secondary" size="sm" icon={Navigation} loading={isLocating} onClick={locate}>
          Use my location
        </Button>
      </div>

      {position ? (
        <p className="text-[11px] text-muted">
          Device location: {position.latitude}, {position.longitude} — pinning on the map is still more accurate.
        </p>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {value ? `Location set to ${value.latitude}, ${value.longitude}` : 'No location set'}
      </p>
    </div>
  )
}
