import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice.js'
import reportReducer from './slices/reportSlice.js'
import mapReducer from './slices/mapSlice.js'
import analyticsReducer from './slices/analyticsSlice.js'
import dashboardReducer from './slices/dashboardSlice.js'
import notificationReducer from './slices/notificationSlice.js'
import uiReducer from './slices/uiSlice.js'

/**
 * Single store for the whole platform.
 *
 * Slice names here are the contract every selector in
 * `redux/selectors.js` relies on.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    reports: reportReducer,
    map: mapReducer,
    analytics: analyticsReducer,
    dashboard: dashboardReducer,
    notifications: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Report payloads carry base64 photo previews, so the default 32 KB cap
      // is too small once several are in flight.
      serializableCheck: { ignoredActionPaths: ['payload.photos', 'meta.arg'] },
    }),
})

export default store
