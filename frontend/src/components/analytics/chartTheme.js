/**
 * Recharts axis + grid defaults.
 *
 * Kept out of `ChartCard` so the component module only exports components, and
 * so every chart in the product shares one visual treatment.
 */

export const AXIS_PROPS = {
  stroke: '#94A3B8',
  fontSize: 10,
  tickLine: false,
  axisLine: false,
}

export const GRID_PROPS = {
  stroke: '#E2E8F0',
  strokeDasharray: '3 3',
  vertical: false,
}
