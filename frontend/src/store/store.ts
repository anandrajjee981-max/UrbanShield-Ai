import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import dashboard from './slices/dashboardSlice';
import incidents from './slices/incidentsSlice';
import reports from './slices/reportsSlice';
import map from './slices/mapSlice';
import analytics from './slices/analyticsSlice';
import notifications from './slices/notificationsSlice';
import ui from './slices/uiSlice';

export const store = configureStore({
  reducer: { auth, dashboard, incidents, reports, map, analytics, notifications, ui },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
