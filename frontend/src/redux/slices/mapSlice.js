import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as mapApi from '../api/mapApi.js'
import { CITY, DEFAULT_MAP_LAYERS, MAP_LAYERS } from '../../utils/constants.js'

/**
 * Map store.
 *
 * Owns every geographic layer plus the layer visibility flags. The `RiskMap`
 * component is a pure renderer: it receives data from these selectors and never
 * holds marker data of its own.
 */

export const loadMapData = createAsyncThunk('map/load', async (filters, { rejectWithValue }) => {
  try {
    return await mapApi.fetchMapBundle(filters)
  } catch (error) {
    return rejectWithValue(error.message)
  }
})

const initialState = {
  risks: [],
  reports: [],
  infrastructure: [],
  boundaries: null,
  departments: [],
  layers: { ...DEFAULT_MAP_LAYERS },
  selectedMarker: null,
  loading: false,
  error: null,
  center: CITY.center,
  zoom: CITY.zoom,
  baseLayer: 'streets',
}

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    toggleLayer(state, action) {
      const key = action.payload
      if (key in state.layers) state.layers[key] = !state.layers[key]
    },
    setLayer(state, action) {
      state.layers[action.payload.key] = action.payload.value
    },
    setLayers(state, action) {
      state.layers = { ...state.layers, ...action.payload }
    },
    resetLayers(state) {
      state.layers = { ...DEFAULT_MAP_LAYERS }
    },
    selectMarker(state, action) {
      state.selectedMarker = action.payload
    },
    clearMarker(state) {
      state.selectedMarker = null
    },
    setBaseLayer(state, action) {
      state.baseLayer = action.payload
    },
    setViewport(state, action) {
      if (action.payload.center) state.center = action.payload.center
      if (action.payload.zoom) state.zoom = action.payload.zoom
    },
    /** Realtime push - appends or refreshes a risk zone without a refetch. */
    riskReceived(state, action) {
      const incoming = action.payload
      if (!incoming?.id) return
      const index = state.risks.findIndex((risk) => risk.id === incoming.id)
      if (index === -1) state.risks.unshift(incoming)
      else state.risks[index] = { ...state.risks[index], ...incoming }
    },
    riskRemoved(state, action) {
      state.risks = state.risks.filter((risk) => risk.id !== action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMapData.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(loadMapData.fulfilled, (state, action) => {
        const { risks, reports, infrastructure, boundaries, departments } = action.payload
        state.risks = risks
        state.reports = reports
        state.infrastructure = infrastructure
        state.boundaries = boundaries
        state.departments = departments
        state.loading = false
      })
      .addCase(loadMapData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? 'Could not load map data.'
      })
  },
})

export const {
  toggleLayer,
  setLayer,
  setLayers,
  resetLayers,
  selectMarker,
  clearMarker,
  setBaseLayer,
  setViewport,
  riskReceived,
  riskRemoved,
} = mapSlice.actions

export default mapSlice.reducer

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export const selectMapLoading = (state) => state.map.loading
export const selectMapError = (state) => state.map.error
export const selectMapLayers = (state) => state.map.layers
export const selectSelectedMarker = (state) => state.map.selectedMarker
export const selectBaseLayer = (state) => state.map.baseLayer
export const selectViewport = createSelector([(state) => state.map.center, (state) => state.map.zoom], (center, zoom) => ({ center, zoom }))
export const selectWardBoundaries = (state) => state.map.boundaries

/** Grouped by layer key so `RiskMap` can render one `<LayerGroup>` per entry. */
export const selectRiskZones = (state) => state.map.risks
export const selectMapReports = (state) => state.map.reports
export const selectInfrastructure = (state) => state.map.infrastructure
export const selectDepartmentStations = (state) => state.map.departments

/** Risk zones for one map layer key (`heat`, `water`, ...). */
export const selectRiskZonesByType = (type) =>
  createSelector([selectRiskZones], (zones) => zones.filter((zone) => zone.type === type))

/** Only the layers the user has switched on. */
export const selectVisibleLayerData = createSelector(
  [selectRiskZones, selectMapReports, selectInfrastructure, selectWardBoundaries, selectDepartmentStations, selectMapLayers],
  (risks, reports, infrastructure, boundaries, departments, layers) => ({
    /** Every zone - `RiskMap` applies the heat/water split per layer flag. */
    riskZones: risks,
    heat: layers.heat ? risks.filter((zone) => zone.type === 'heat') : [],
    water: layers.water ? risks.filter((zone) => zone.type === 'water') : [],
    otherRisks: layers.heat || layers.water
      ? risks.filter((zone) => !['heat', 'water'].includes(zone.type))
      : [],
    reports: layers.reports ? reports : [],
    infrastructure: layers.infrastructure ? infrastructure : [],
    boundaries: layers.boundaries ? boundaries : null,
    departments: layers.departments ? departments : [],
  }),
)

/** Severity tally straight from the map, used by the legend counters. */
export const selectMapSeverityCounts = createSelector([selectRiskZones], (zones) =>
  zones.reduce(
    (acc, zone) => {
      const level = zone.score >= 70 ? 'high' : zone.score >= 40 ? 'medium' : zone.score >= 20 ? 'low' : 'minimal'
      acc[level] += 1
      return acc
    },
    { high: 0, medium: 0, low: 0, minimal: 0 },
  ),
)

/** The toggle list rendered by `MapControls`. */
export const selectLayerControls = createSelector([selectMapLayers], (layers) =>
  MAP_LAYERS.map((layer) => ({ ...layer, active: layers[layer.key] })),
)
