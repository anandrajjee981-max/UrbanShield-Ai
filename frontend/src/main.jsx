import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import { store } from './redux/store.js'
import { loadSession } from './redux/slices/authSlice.js'
import { loadNotifications } from './redux/slices/notificationSlice.js'
import { attachRealtimeListeners } from './redux/realtime.js'

/**
 * Entry point.
 *
 * The shell renders first with the preloaded demo identity, then bootstrap
 * confirms the real session and attaches realtime listeners. Doing it in this
 * order keeps first paint instant while still having the guards run against a
 * settled user a tick later.
 */

const bootstrap = async () => {
  await store.dispatch(loadSession())
  await store.dispatch(loadNotifications())

  const detach = attachRealtimeListeners(store)

  window.addEventListener('beforeunload', detach)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

bootstrap()
