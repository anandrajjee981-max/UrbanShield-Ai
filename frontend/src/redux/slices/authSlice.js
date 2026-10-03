import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { MOCK_USERS } from '../../mock/users.js'
import { USE_MOCK } from '../../services/api.js'
import { fetchCurrentUser, logout as requestLogout } from '../../api/auth.js'

/**
 * Session state.
 *
 * The identity comes from `GET /api/auth/me`; explicit demo mode resolves a
 * sample citizen. `role` is the single source of truth
 * for route guards, sidebar menus and permission checks.
 */

export const loadSession = createAsyncThunk('auth/loadSession', async (_, { rejectWithValue }) => {
  if (USE_MOCK) return MOCK_USERS.citizen

  try {
    return await fetchCurrentUser()
  } catch (error) {
    if (error.status === 401 || error.status === 403) return null
    return rejectWithValue(error.message)
  }
})

export const logoutUser = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    await requestLogout()
  } catch (error) {
    return rejectWithValue(error.message ?? 'Sign out failed. Please try again.')
  }
})

const initialState = {
  user: null,
  status: 'loading',
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn(state, action) {
      state.user = action.payload
      state.status = 'authenticated'
      state.error = null
    },
    signedOut(state) {
      state.user = null
      state.status = 'unauthenticated'
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSession.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(loadSession.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = action.payload ? 'authenticated' : 'unauthenticated'
        state.error = null
      })
      .addCase(loadSession.rejected, (state) => {
        state.user = null
        state.status = 'unauthenticated'
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null
        state.status = 'unauthenticated'
        state.error = null
      })
  },
})

export const { signedIn, signedOut } = authSlice.actions

export default authSlice.reducer
