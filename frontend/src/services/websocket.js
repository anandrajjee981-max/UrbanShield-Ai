import { SOCKET_EVENTS } from '../utils/constants.js'

/**
 * Real-time transport.
 *
 * The app is WebSocket-ready: a single `connectRealtime` factory produces a
 * transport with a uniform `on/off/emit` surface. In mock mode a simulated
 * transport drives the same event names, so every reducer that handles
 * `NEW_REPORT` or `REPORT_STATUS_CHANGED` is already exercised without a
 * server. Swapping in Socket.IO later only changes this file.
 */

const SOCKET_URL = import.meta.env.VITE_WS_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const USE_MOCK_SOCKET = import.meta.env.VITE_USE_MOCK === 'true'

/** In-process event emitter shared by the mock and real transports. */
function createEmitter() {
  const listeners = new Map()

  return {
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
      return () => this.off(event, handler)
    },
    off(event, handler) {
      listeners.get(event)?.delete(handler)
    },
    emit(event, payload) {
      listeners.get(event)?.forEach((handler) => handler(payload))
      listeners.get('*')?.forEach((handler) => handler(event, payload))
    },
    clear() {
      listeners.clear()
    },
  }
}

const bus = createEmitter()

/** A real `WebSocket` transport, with a no-op fallback when unsupported. */
function createSocketTransport(url) {
  const state = { socket: null, connected: false }

  const transport = {
    mode: 'websocket',
    isConnected: () => state.connected,
    on: bus.on,
    off: bus.off,
    emit: bus.emit,

    connect() {
      if (typeof WebSocket === 'undefined') return transport
      try {
        state.socket = new WebSocket(url)
        state.socket.onopen = () => {
          state.connected = true
          bus.emit('__connection__', true)
        }
        state.socket.onclose = () => {
          state.connected = false
          bus.emit('__connection__', false)
        }
        state.socket.onmessage = (event) => {
          try {
            const { event: name, data } = JSON.parse(event.data)
            if (name) bus.emit(name, data)
          } catch {
            // Ignore malformed frames rather than crashing the app.
          }
        }
      } catch {
        state.connected = false
      }
      return transport
    },

    disconnect() {
      state.socket?.close()
      state.socket = null
      state.connected = false
      bus.emit('__connection__', false)
    },

    send(event, data) {
      if (state.socket?.readyState === 1) {
        state.socket.send(JSON.stringify({ event, data }))
      }
    },
  }

  return transport
}

/**
 * A simulated transport. Emits the exact same event names on a timer so the
 * Redux reducers and every live UI update are proven to work offline.
 */
function createMockTransport() {
  const timers = new Set()

  const schedule = (event, factory, minMs, maxMs) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      bus.emit(event, factory())
      schedule(event, factory, minMs, maxMs)
    }, minMs + Math.random() * (maxMs - minMs))
    timers.add(timer)
  }

  const transport = {
    mode: 'mock',
    isConnected: () => true,
    on: bus.on,
    off: bus.off,
    emit: bus.emit,

    connect() {
      bus.emit('__connection__', true)

      // Occasional city-wide activity, purely to demonstrate live updates.
      schedule(
        SOCKET_EVENTS.NEW_RISK_DETECTED,
        () => ({
          id: `risk-live-${Date.now()}`,
          type: ['heat', 'water', 'garbage', 'infrastructure'][Math.floor(Math.random() * 4)],
          ward: `Ward ${1 + Math.floor(Math.random() * 12)}`,
          score: 35 + Math.floor(Math.random() * 60),
          latitude: 25.5941 + (Math.random() - 0.5) * 0.14,
          longitude: 85.1376 + (Math.random() - 0.5) * 0.13,
          radiusMeters: 400 + Math.floor(Math.random() * 800),
          status: 'watch',
          updatedAt: new Date().toISOString(),
          isLive: true,
        }),
        25000,
        55000,
      )

      return transport
    },

    disconnect() {
      timers.forEach(clearTimeout)
      timers.clear()
      bus.emit('__connection__', false)
    },

    send(event, data) {
      // Loop the action back so local optimism can be verified against the bus.
      setTimeout(() => bus.emit(event, data), 120)
    },
  }

  return transport
}

let transport = null

/** Connects once and returns the shared transport. */
export function connectRealtime() {
  if (transport) return transport
  transport = (USE_MOCK_SOCKET ? createMockTransport() : createSocketTransport(SOCKET_URL)).connect()
  return transport
}

/** Subscribes to a realtime event for the lifetime of a component. */
export function subscribe(event, handler) {
  const active = connectRealtime()
  return active.on(event, handler)
}

/** Publishes a local event - used to replay optimistic mutations. */
export function publish(event, data) {
  connectRealtime().emit(event, data)
}

export function getTransport() {
  return transport ?? connectRealtime()
}

export function isRealtimeConnected() {
  return getTransport().isConnected()
}

export { SOCKET_EVENTS }
