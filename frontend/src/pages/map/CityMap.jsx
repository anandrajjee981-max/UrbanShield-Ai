import { useState } from 'react'
import { useSearchParams, useLocation, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Layers, Locate, Map as MapIcon, MousePointerClick } from 'lucide-react'
import PageShell from '../../components/common/PageShell.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import RiskMap from '../../components/map/RiskMap.jsx'
import MapControls from '../../components/map/MapControls.jsx'
import ErrorState from '../../components/common/ErrorState.jsx'
import { MapSkeleton } from '../../components/common/Skeleton.jsx'
import Button from '../../components/common/Button.jsx'
import { useMapData } from '../../hooks/useMapData.js'
import { useGeolocation } from '../../hooks/useGeolocation.js'
import { selectRole } from '../../redux/selectors.js'

/**
 * The full city map.
 *
 * One page, three entry points: the authority console, the citizen explorer and
 * deep links from a report (`?focus=<id>`) or a risk zone. All three use the
 * same `RiskMap` and the same Redux layers, so behaviour never diverges.
 */
export default function CityMapPage({ title, subtitle, authority }) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const role = useSelector(selectRole)
  const map = useMapData()
  const geo = useGeolocation({ auto: false })
  const [selected, setSelected] = useState(null)

  // Mounted by both areas; the route decides which view this is unless the
  // caller says otherwise.
  const isAuthority = authority ?? location.pathname.startsWith('/authority')

  // Deep link: `?focus=<id>` selects a report or a risk zone. Resolved during
  // render so the map pans as soon as the data lands, with no intermediate paint.
  const focusParam = params.get('focus')
  const deepLinked =
    (focusParam && map.reports.find((item) => item.id === focusParam) && {
      ...map.reports.find((item) => item.id === focusParam),
      kind: 'report',
    }) ||
    (focusParam && map.riskZones.find((item) => item.id === focusParam) && {
      ...map.riskZones.find((item) => item.id === focusParam),
      kind: 'risk',
    }) ||
    null

  const active = deepLinked ?? selected

  const focus =
    active?.latitude != null
      ? [active.latitude, active.longitude]
      : geo.position
        ? [geo.position.latitude, geo.position.longitude]
        : null

  return (
    <PageShell>
      <PageHeader
        eyebrow="Live map"
        title={title ?? (isAuthority ? 'City Map · Command View' : 'Explore Your City')}
        subtitle={
          subtitle ??
          (isAuthority
            ? 'Toggle layers to work the live risk picture, then open any marker for the full incident record.'
            : 'See what is happening in each ward - heat, water, infrastructure and open citizen reports.')
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={Locate}
              loading={geo.isLocating}
              onClick={() => geo.locate().then((position) => position && setSelected(null))}
            >
              My location
            </Button>
            <Button variant="ghost" size="sm" icon={MousePointerClick} onClick={() => setSelected(null)}>
              Clear selection
            </Button>
          </>
        }
      />

      {map.error ? (
        <ErrorState title="Map data unavailable" message={map.error} onRetry={map.reload} />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_260px]">
          <div className="card overflow-hidden">
            {map.loading && !map.riskZones.length ? (
              <MapSkeleton className="h-[560px]" />
            ) : (
              <RiskMap
                height="h-[min(560px,60svh)] min-h-[360px] lg:h-[560px]"
                riskZones={map.riskZones}
                reports={map.reports}
                infrastructure={map.infrastructure}
                departments={map.departments}
                boundaries={map.boundaries}
                layers={map.layers}
                severityCounts={map.severityCounts}
                baseLayer={map.baseLayer}
                showLegend
                showControls
                legend="severity"
                interactive
                focus={focus}
                authority={isAuthority}
                userPosition={geo.position}
                onMarkerClick={setSelected}
              />
            )}
          </div>

          <div className="space-y-4">
            <MapControls layers={map.layers} onToggle={map.toggleLayer} />

            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-body">
                <MapIcon size={12} aria-hidden="true" />
                Base layer
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {['streets', 'satellite'].map((layer) => (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => map.setBaseLayer(layer)}
                    className={`rounded-lg border px-3 py-2 text-[12px] font-medium capitalize transition ${
                      map.baseLayer === layer
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-line text-body hover:bg-slate-50'
                    }`}
                  >
                    {layer}
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-body">
                <Layers size={12} aria-hidden="true" />
                In this view
              </p>
              <dl className="mt-3 space-y-2 text-[12px]">
                {[
                  ['Risk zones', map.riskZones.length],
                  ['Citizen reports', map.reports.length],
                  ['Infrastructure', map.infrastructure.length],
                  ['Departments', map.departments.length],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-body">{label}</dt>
                    <dd className="font-semibold text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {active ? (
              <div className="card p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-600">Selected</p>
                <p className="mt-1.5 text-[13px] font-semibold text-ink">
                  {active.kind === 'report' ? active.issueLabel : `${active.type} · ${active.ward}`}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {active.latitude}, {active.longitude}
                </p>
                {isAuthority && active.kind === 'report' ? (
                  <Link
                    to={`/authority/reports/${active.id}`}
                    className="mt-3 block rounded-lg bg-brand-500 px-3 py-2 text-center text-[11px] font-semibold text-navy-900 transition hover:bg-brand-600"
                  >
                    Open report
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setSelected(null)
                    if (focusParam) setParams({}, { replace: true })
                  }}
                  className="mt-2 w-full rounded-lg border border-line px-3 py-2 text-[11px] font-semibold text-body transition hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
            ) : null}

            {!isAuthority && role === 'citizen' ? (
              <Link
                to="/citizen/report"
                className="block rounded-xl bg-navy-900 px-4 py-3 text-center text-[12px] font-semibold text-white transition hover:bg-navy-800"
              >
                Report an issue here
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  )
}
