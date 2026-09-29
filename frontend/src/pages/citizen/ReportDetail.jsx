import ReportDetail from '../authority/ReportDetail.jsx'

/**
 * Citizen report detail.
 *
 * The authority detail screen already knows how to render itself for a
 * resident - same record, no action bar, no internal notes - so the citizen
 * route is a thin wrapper rather than a second implementation that could drift.
 */
export default function CitizenReportDetail() {
  return <ReportDetail authority={false} />
}
