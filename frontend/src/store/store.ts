import { configureStore } from '@reduxjs/toolkit';
import auth from './slices/authSlice';
import authority from './slices/authoritySlice';
import authorityTasks from './slices/authorityTasksSlice';
import incidents from './slices/incidentsSlice';
import reports from './slices/reportsSlice';
import map from './slices/mapSlice';
import analytics from './slices/analyticsSlice';
import admin from './slices/adminSlice';
import notifications from './slices/notificationsSlice';
import ui from './slices/uiSlice';
import weather from './slices/weatherSlice';
import workflow from './slices/workflowSlice';

export const store = configureStore({
  reducer: { auth, authority, authorityTasks, admin, incidents, reports, map, analytics, notifications, ui, weather, workflow },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
