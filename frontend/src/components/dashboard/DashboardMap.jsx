import { Link } from 'react-router-dom'
import { Expand, Layers as LayersIcon, Radio } from 'lucide-react'
import RiskMap from '../map/RiskMap.jsx'
import { MapSkeleton } from '../common/Skeleton.jsx'
import ErrorState from '../common/ErrorState.jsx'
import { useMapData } from '../../hooks/useMapData.js'

/**
 * Dashboard map preview.
 *
 * A deliberately small read-only instance of the shared `RiskMap` - the same
 * layers and the same Redux state as the full city map, minus the heavy
 * controls, so the dashboard stays fast.
 */
export default function DashboardMap({
  height = 'h-[380px]',
  showLegend = true,
  title,
  mapPath = '/authority/map',
  authority = true,
}) {
  const map = useMapData()

  if (map.error) {
    return <ErrorState title="Map unavailable" message={map.error} onRetry={map.reload} compact className={height} />
  }

  if (map.loading && !map.riskZones.length) {
    return <MapSkeleton className={height} />
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          {title ?? (authority ? 'City Map · Live View' : 'Your City · Live View')}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
            <Radio size={10} className="animate-pulse" aria-hidden="true" />
            Live
          </span>
        </h2>

        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="hidden items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-body sm:inline-flex">
            <LayersIcon size={11} aria-hidden="true" />
            {map.activeLayerKeys.length} layers
          </span>
          <Link
            to={mapPath}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 font-semibold text-body transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
          >
            <Expand size={12} aria-hidden="true" />
            Full map
          </Link>
        </div>
      </div>

      <RiskMap
        height={height}
        riskZones={map.riskZones}
        reports={map.reports}
        infrastructure={map.infrastructure}
        departments={map.departments}
        boundaries={map.boundaries}
        layers={map.layers}
        severityCounts={map.severityCounts}
        showLegend={showLegend}
        showControls={false}
        interactive={false}
        legend="severity"
        authority={authority}
      />
    </div>
  )
}
