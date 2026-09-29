import { useCallback, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearMarker,
  loadMapData,
  resetLayers,
  selectMarker,
  setBaseLayer,
  setViewport,
  toggleLayer,
} from '../redux/slices/mapSlice.js'
import { selectApiFilters } from '../redux/selectors.js'
import {
  selectBaseLayer,
  selectLayerControls,
  selectMapError,
  selectMapLoading,
  selectMapSeverityCounts,
  selectSelectedMarker,
  selectViewport,
  selectVisibleLayerData,
} from '../redux/slices/mapSlice.js'

/**
 * Loads every map layer for the active global filters and exposes the toggle,
 * selection and viewport actions. `RiskMap` stays a pure renderer.
 */
export function useMapData({ enabled = true } = {}) {
  const dispatch = useDispatch()
  const filters = useSelector(selectApiFilters)

  const loading = useSelector(selectMapLoading)
  const error = useSelector(selectMapError)
  const layers = useSelector(selectLayerControls)
  const layerData = useSelector(selectVisibleLayerData)
  const severityCounts = useSelector(selectMapSeverityCounts)
  const selectedMarker = useSelector(selectSelectedMarker)
  const baseLayer = useSelector(selectBaseLayer)
  const viewport = useSelector(selectViewport)

  useEffect(() => {
    if (enabled) dispatch(loadMapData(filters))
  }, [dispatch, enabled, filters])

  const toggle = useCallback((key) => dispatch(toggleLayer(key)), [dispatch])
  const select = useCallback((marker) => dispatch(selectMarker(marker)), [dispatch])
  const clearSelection = useCallback(() => dispatch(clearMarker()), [dispatch])
  const changeBaseLayer = useCallback((layer) => dispatch(setBaseLayer(layer)), [dispatch])
  const updateViewport = useCallback((next) => dispatch(setViewport(next)), [dispatch])
  const reset = useCallback(() => dispatch(resetLayers()), [dispatch])
  const reload = useCallback(() => dispatch(loadMapData(filters)), [dispatch, filters])

  const activeLayerKeys = useMemo(() => layers.filter((layer) => layer.active).map((layer) => layer.key), [layers])

  return {
    loading,
    error,
    layers,
    activeLayerKeys,
    severityCounts,
    selectedMarker,
    baseLayer,
    viewport,
    ...layerData,
    toggleLayer: toggle,
    selectMarker: select,
    clearMarker: clearSelection,
    setBaseLayer: changeBaseLayer,
    setViewport: updateViewport,
    resetLayers: reset,
    reload,
  }
}

export default useMapData
