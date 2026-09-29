import { SOCKET_EVENTS as EVENTS, connectRealtime } from '../services/websocket.js'
import { reportReceived } from './slices/reportSlice.js'
import { riskReceived } from './slices/mapSlice.js'
import { notificationReceived, setConnected } from './slices/notificationSlice.js'
import { addToast } from './slices/uiSlice.js'
import { REPORT_STATUS_LABELS } from '../utils/constants.js'

/**
 * Bridges the realtime transport into Redux.
 *
 * This is the only place that knows about WebSocket events. Components never
 * subscribe to the socket directly, so replacing the transport with Socket.IO
 * later touches this file and nothing else.
 *
 * Flow: WebSocket -> Redux -> selectors -> map, charts and dashboard.
 *
 * @returns {() => void} detaches every listener registered here.
 */
export function attachRealtimeListeners(store) {
  const transport = connectRealtime()
  const teardown = []

  const on = (event, handler) => teardown.push(transport.on(event, handler))

  on(EVENTS.NEW_REPORT, (report) => {
    store.dispatch(reportReceived(report))
    store.dispatch(
      notificationReceived({
        id: `ntf-live-${report.id}`,
        type: 'authority_update',
        title: 'New report received',
        body: `${report.trackingId} - ${report.issueLabel} in ${report.ward}.`,
        severity: 'info',
        reportId: report.id,
        trackingId: report.trackingId,
      }),
    )
    store.dispatch(addToast({ tone: 'info', title: 'New report', message: `${report.trackingId} just arrived.` }))
  })

  on(EVENTS.REPORT_UPDATED, (report) => {
    store.dispatch(reportReceived(report))
  })

  on(EVENTS.REPORT_STATUS_CHANGED, (report) => {
    store.dispatch(reportReceived(report))
    const label = REPORT_STATUS_LABELS[report?.status] ?? 'Updated'
    store.dispatch(
      notificationReceived({
        id: `ntf-status-${report?.id}-${Date.now()}`,
        type: 'report_status_changed',
        title: `Report ${label.toLowerCase()}`,
        body: `${report?.trackingId ?? 'A report'} is now ${label.toLowerCase()}.`,
        severity: 'low',
        reportId: report?.id,
      }),
    )
    store.dispatch(addToast({ tone: 'success', title: label, message: `${report?.trackingId ?? 'Report'} updated in real time.` }))
  })

  on(EVENTS.NEW_RISK_DETECTED, (risk) => {
    store.dispatch(riskReceived(risk))
    store.dispatch(
      addToast({
        tone: risk.score >= 70 ? 'danger' : 'warning',
        title: 'New risk zone',
        message: `${risk.type?.toUpperCase() ?? 'Risk'} risk detected in ${risk.ward} (score ${risk.score}).`,
      }),
    )
  })

  on(EVENTS.RISK_LEVEL_CHANGED, (risk) => {
    store.dispatch(riskReceived(risk))
  })

  on(EVENTS.NEW_NOTIFICATION, (notification) => {
    store.dispatch(notificationReceived(notification))
  })

  on('__connection__', (connected) => {
    store.dispatch(setConnected(connected))
  })

  return () => teardown.forEach((unsubscribe) => unsubscribe())
}
