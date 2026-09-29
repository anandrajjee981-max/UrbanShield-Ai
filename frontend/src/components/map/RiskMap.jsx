import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Circle, CircleMarker, GeoJSON, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { divIcon } from 'leaflet'
import { Crosshair, Expand, LocateFixed, Minus, Plus } from 'lucide-react'
import { MAP_TILES, RISK_CATEGORY_COLORS } from '../../utils/colors.js'
import { CITY } from '../../utils/constants.js'
import { scoreToLevel } from '../../utils/riskCalculator.js'
import MapLegend from './MapLegend.jsx'
import { ReportMarker, RiskMarker } from './RiskMarker.jsx'
import MapPopup from './MapPopup.jsx'

/**
 * The platform's single map renderer.
 *
 * It receives data as props and holds no geospatial state of its own - the
 * dashboard preview, the full city map, the analytics heatmap and the report
 * location picker all mount this same component.
 *
 * Data flow: API -> Redux -> selectors -> useMapData -> RiskMap -> React Leaflet.
 */

/* ------------------------------ helpers ------------------------------ */

const severityColor = (score) => {  const level = scoreToLevel(score)
  return { high: '#EF4444', medium: '#F59E0B', low: '#22C55E', minimal: '#10B981' }[level]
}

const severityOpacity = (score) => {
  const level = scoreToLevel(score)
  return { high: 0.28, medium: 0.22, low: 0.16, minimal: 0.1 }[level]
}

function createUserIcon() {
  return divIcon({
    className: 'usai-user-marker',
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#3B82F6;border:3px solid #fff;box-shadow:0 0 0 6px rgba(59,130,246,0.22),0 2px 6px rgba(15,23,42,0.35);"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

/** Bridges imperative Leaflet calls to React state. */
function MapController({ userPosition, focus, onMapReady, zoomDelta }) {
  const map = useMap()

  useEffect(() => {
    onMapReady?.(map)
  }, [map, onMapReady])

  // Recentre only when the caller asks for a different focus target.
  useEffect(() => {
    if (!focus) return
    const target = Array.isArray(focus) ? focus : [focus.latitude, focus.longitude]
    map.flyTo(target, Math.max(map.getZoom(), zoomDelta ?? 15), { duration: 0.8 })
  }, [focus, map, zoomDelta])

  useEffect(() => {
    if (!userPosition) return
    map.flyTo([userPosition.latitude, userPosition.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 })
  }, [userPosition, map])

  return null
}

/** Click-to-pick, used by the report location step. */
function ClickCapture({ enabled, onPick }) {
  useMapEvents({
    click(event) {
      if (enabled) onPick?.({ latitude: Number(event.latlng.lat.toFixed(5)), longitude: Number(event.latlng.lng.toFixed(5)) })
    },
  })
  return null
}

function ZoomButtons() {
  const map = useMap()

  const buttonClass =
    'flex h-9 w-9 items-center justify-center bg-white text-body transition hover:bg-slate-50 hover:text-ink disabled:opacity-40'

  return (
    <div className="absolute bottom-4 right-4 z-[500] flex flex-col overflow-hidden rounded-lg border border-line shadow-raised">
      <button type="button" onClick={() => map.zoomIn()} className={buttonClass} aria-label="Zoom in">
        <Plus size={16} />
      </button>
      <div className="h-px bg-line" />
      <button type="button" onClick={() => map.zoomOut()} className={buttonClass} aria-label="Zoom out">
        <Minus size={16} />
      </button>
      <div className="h-px bg-line" />
      <button
        type="button"
        onClick={() => map.locate({ enableHighAccuracy: true, maxZoom: 16 })}
        className={buttonClass}
        aria-label="Locate me"
      >
        <LocateFixed size={16} />
      </button>
    </div>
  )
}

/* ------------------------------ component ------------------------------ */

/**
 * @param {object}  props
 * @param {Array}   props.riskZones
 * @param {Array}   props.reports
 * @param {Array}   props.infrastructure
 * @param {Array}   props.departments
 * @param {object}  props.boundaries  GeoJSON FeatureCollection
 * @param {Array}   props.layers      `[{ key, active }]` from Redux
 * @param {object}  props.severityCounts
 * @param {string}  props.baseLayer   'streets' | 'satellite'
 * @param {boolean} props.showLegend
 * @param {boolean} props.showControls
 * @param {boolean} props.interactive
 * @param {boolean} props.pickMode     Turns map clicks into a location callback
 * @param {Array}   props.focus        [lat, lng] to fly to
 * @param {object}  props.userPosition
 * @param {boolean} props.authority    Authority chrome and links inside popups
 */
export default function RiskMap({
  riskZones = [],
  reports = [],
  infrastructure = [],
  departments = [],
  boundaries = null,
  layers = [],
  severityCounts = null,
  baseLayer = 'streets',
  legend = 'severity',
  showLegend = true,
  showControls = false,
  interactive = true,
  pickMode = false,
  onPick,
  onMarkerClick,
  focus = null,
  userPosition = null,
  authority = true,
  className = '',
  height = 'h-[420px]',
}) {
  const wrapperRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const zoomDelta = 15

  const isActive = useCallback((key) => Boolean(layers.find((layer) => layer.key === key)?.active), [layers])

  const heatZones = useMemo(() => riskZones.filter((zone) => zone.type === 'heat'), [riskZones])
  const waterZones = useMemo(() => riskZones.filter((zone) => zone.type === 'water'), [riskZones])
  const otherZones = useMemo(
    () => riskZones.filter((zone) => !['heat', 'water'].includes(zone.type)),
    [riskZones],
  )

  const boundaryStyle = useMemo(
    () => () => ({
      color: '#062A3A',
      weight: 1,
      opacity: 0.5,
      fillColor: '#94A3B8',
      fillOpacity: 0.05,
      dashArray: '4 4',
    }),
    [],
  )

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current?.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch {
      // Fullscreen is blocked in some embedded contexts - ignore silently.
    }
  }

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const tile = MAP_TILES[baseLayer] ?? MAP_TILES.streets

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden bg-slate-100 ${height} ${isFullscreen ? 'h-screen w-screen rounded-none' : ''} ${className}`}
    >
      <MapContainer
        center={CITY.center}
        zoom={CITY.zoom}
        minZoom={10}
        maxZoom={19}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={false}
        attributionControl
        className="h-full w-full"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer key={baseLayer} url={tile.url} attribution={tile.attribution} />

        <MapController focus={focus} userPosition={userPosition} zoomDelta={zoomDelta} />
        <ClickCapture enabled={pickMode} onPick={onPick} />

        {/* Ward boundaries */}
        {isActive('boundaries') && boundaries ? (
          <GeoJSON data={boundaries} style={boundaryStyle} onEachFeature={(feature, layer) => {
            const name = feature?.properties?.name
            if (name) layer.bindTooltip(name, { sticky: true, direction: 'top', className: 'usai-ward-tooltip' })
          }} />
        ) : null}

        {/* Heat risk zones */}
        {isActive('heat')
          ? heatZones.map((zone) => (
              <Circle
                key={zone.id}
                center={[zone.latitude, zone.longitude]}
                radius={zone.radiusMeters ?? 600}
                pathOptions={{
                  color: RISK_CATEGORY_COLORS.heat,
                  fillColor: RISK_CATEGORY_COLORS.heat,
                  fillOpacity: severityOpacity(zone.score),
                  weight: 1.5,
                  opacity: 0.7,
                }}
              >
                <Popup>
                  <MapPopup data={zone} kind="risk" authority={authority} />
                </Popup>
              </Circle>
            ))
          : null}

        {/* Water risk zones */}
        {isActive('water')
          ? waterZones.map((zone) => (
              <Circle
                key={zone.id}
                center={[zone.latitude, zone.longitude]}
                radius={zone.radiusMeters ?? 600}
                pathOptions={{
                  color: RISK_CATEGORY_COLORS.water,
                  fillColor: RISK_CATEGORY_COLORS.water,
                  fillOpacity: severityOpacity(zone.score),
                  weight: 1.5,
                  opacity: 0.7,
                }}
              >
                <Popup>
                  <MapPopup data={zone} kind="risk" authority={authority} />
                </Popup>
              </Circle>
            ))
          : null}

        {/* Other risk categories as severity-coloured points */}
        {(isActive('heat') || isActive('water') || isActive('infrastructure'))
          ? otherZones.map((zone) => (
              <CircleMarker
                key={zone.id}
                center={[zone.latitude, zone.longitude]}
                radius={7 + Math.round((zone.score / 100) * 8)}
                pathOptions={{
                  color: '#ffffff',
                  weight: 1.5,
                  fillColor: severityColor(zone.score),
                  fillOpacity: 0.85,
                }}
                eventHandlers={{ click: () => onMarkerClick?.({ ...zone, kind: 'risk' }) }}
              >
                <Tooltip direction="top" offset={[0, -6]}>
                  <span className="text-xs font-semibold">
                    {zone.type} · {zone.ward} · {zone.score}/100
                  </span>
                </Tooltip>
                <Popup>
                  <MapPopup data={zone} kind="risk" authority={authority} />
                </Popup>
              </CircleMarker>
            ))
          : null}

        {/* Citizen reports */}
        {isActive('reports')
          ? reports.map((report) => (
              <ReportMarker key={report.id} report={report} onSelect={onMarkerClick} authority={authority} />
            ))
          : null}

        {/* Infrastructure */}
        {isActive('infrastructure')
          ? infrastructure.map((item) => (
              <Marker
                key={item.id}
                position={[item.latitude, item.longitude]}
                eventHandlers={{ click: () => onMarkerClick?.({ ...item, kind: 'infrastructure' }) }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-[11px] capitalize text-slate-500">{item.type.replace('_', ' ')}</p>
                    <dl className="mt-2 space-y-1 text-[11px] text-slate-600">
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Health</dt>
                        <dd className="font-semibold">{item.healthScore}/100</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Status</dt>
                        <dd className="font-semibold capitalize">{item.status}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-slate-400">Ward</dt>
                        <dd className="font-semibold">{item.ward}</dd>
                      </div>
                    </dl>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {/* Department sites */}
        {isActive('departments')
          ? departments.map((station) => (
              <Marker
                key={station.id}
                position={[station.latitude, station.longitude]}
                eventHandlers={{ click: () => onMarkerClick?.({ ...station, kind: 'department' }) }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="text-sm font-semibold text-slate-900">{station.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{station.ward}</p>
                    <p className="mt-2 text-[11px] text-slate-600">{station.phone}</p>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {/* Pick marker for the report flow */}
        {pickMode && userPosition ? (
          <Marker position={[userPosition.latitude, userPosition.longitude]} icon={createUserIcon()} draggable={!interactive} />
        ) : null}

        {/* Detected device location */}
        {userPosition ? (
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={8}
            pathOptions={{ color: '#3B82F6', fillColor: '#3B82F6', fillOpacity: 0.25, weight: 2 }}
          />
        ) : null}

        <ZoomButtons />
      </MapContainer>

      {/* Legend overlay */}
      {showLegend ? <MapLegend severityCounts={severityCounts} reports={reports} show={legend} className="absolute bottom-4 left-4 z-[500] max-w-[180px]" /> : null}

      {/* Controls overlay */}
      {showControls ? (
        <div className="absolute right-4 top-4 z-[500] flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-body shadow-raised transition hover:bg-slate-50 hover:text-ink"
          >
            <Expand size={16} />
          </button>
          <button
            type="button"
            onClick={() => wrapperRef.current?.scrollIntoView({ behavior: 'smooth' })}
            aria-label="Center map"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-body shadow-raised transition hover:bg-slate-50 hover:text-ink"
          >
            <Crosshair size={16} />
          </button>
        </div>
      ) : null}
    </div>
  )
}
