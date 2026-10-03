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
 * The shell renders in its authentication-checking state while bootstrap
 * confirms the cookie session, then loads protected data and realtime updates.
 */

const bootstrap = async () => {
  await store.dispatch(loadSession())

  if (store.getState().auth.status !== 'authenticated') return

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
