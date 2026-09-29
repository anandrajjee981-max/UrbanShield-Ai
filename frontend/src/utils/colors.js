/**
 * Centralised colour tokens.
 *
 * Values are mirrored in `index.css` under `@theme`, so Tailwind classes such
 * as `bg-brand-500` and `text-risk-high` exist. This module exists for the
 * places that need the raw string: Recharts `fill`/`stroke`, Leaflet
 * `pathOptions`, inline SVG and any third-party prop that will not read a
 * class name.
 */

export const COLORS = {
  // Brand
  primaryGreen: '#10B981',
  darkGreen: '#059669',
  lightGreen: '#D1FAE5',

  // Navy
  darkNavy: '#062A3A',
  secondaryNavy: '#083B4D',

  // Surfaces
  mainBackground: '#F5F9FC',
  white: '#FFFFFF',
  border: '#E2E8F0',

  // Type
  primaryText: '#0F172A',
  secondaryText: '#64748B',
  mutedText: '#94A3B8',

  // Risk severity
  highRisk: '#EF4444',
  mediumRisk: '#F59E0B',
  lowRisk: '#22C55E',
  minimalRisk: '#10B981',
}

/** Risk category -> colour, shared by the map legend, markers and charts. */
export const RISK_CATEGORY_COLORS = {
  heat: '#EF4444',
  water: '#3B82F6',
  garbage: '#10B981',
  road: '#F59E0B',
  infrastructure: '#8B5CF6',
  environment: '#14B8A6',
}

/** Risk severity level -> colour. */
export const RISK_LEVEL_COLORS = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
  minimal: '#10B981',
}

/** AI surfaces always use the violet accent, never the brand green. */
export const AI_COLOR = '#7C3AED'

/** Charts read better on a muted grid than on pure white. */
export const CHART_COLORS = {
  grid: '#E2E8F0',
  axis: '#94A3B8',
  label: '#64748B',
  tooltipBg: '#0F172A',
  series: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#22C55E'],
}

export const MAP_TILES = {
  streets: {
    name: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  // Esri World Imagery is free to use as an OpenStreetMap-based satellite view.
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
}
