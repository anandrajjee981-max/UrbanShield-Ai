import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  fetchMeRequest,
  getApiErrorMessage,
  loginRequest,
  logoutRequest,
  registerRequest,
  type BackendUser,
} from '../../services/api';

// Connected to the real backend (backend/src/controller/auth.controller.ts).
// Session = HTTP-only `access_token` cookie, so nothing is stored in
// localStorage. `fetchCurrentUser` (GET /auth/me) restores the session on reload.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'CITIZEN' | 'AUTHORITY' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean; // login/register/logout in flight
  sessionChecked: boolean; // true once GET /auth/me has resolved (app boot)
  sessionLoading: boolean;
  error: string | null;
}

const toAuthUser = (u: BackendUser): AuthUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
});

export const loginUser = createAsyncThunk<AuthUser, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const user = await loginRequest({ email: email.trim().toLowerCase(), password });
      return toAuthUser(user);
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Login failed. Please try again.'));
    }
  },
);

export const registerUser = createAsyncThunk<
  AuthUser,
  { name: string; email: string; password: string; role: 'CITIZEN' | 'AUTHORITY' },
  { rejectValue: string }
>('auth/register', async ({ name, email, password, role }, { rejectWithValue }) => {
  try {
    const user = await registerRequest({ name: name.trim(), email: email.trim().toLowerCase(), password, role });
    return toAuthUser(user);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Registration failed. Please try again.'));
  }
});

/** GET /auth/me — restores the cookie session after a page reload. */
export const fetchCurrentUser = createAsyncThunk<AuthUser, void, { rejectValue: string }>(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      return toAuthUser(await fetchMeRequest());
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Session expired.'));
    }
  },
);

/** POST /auth/logout — clears the cookie server-side, then clears Redux. */
export const logoutThunk = createAsyncThunk<void, void>('auth/logout', async () => {
  try {
    await logoutRequest();
  } catch {
    /* cookie may already be gone — still log out locally */
  }
});

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  sessionChecked: false,
  sessionLoading: true,
  error: null,
};

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Legacy local logout (kept for compat) — prefer `logoutThunk`. */
    logoutUser: (s) => {
      s.isAuthenticated = false;
      s.user = null;
      s.error = null;
    },
    clearAuthError: (s) => {
      s.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(loginUser.fulfilled, (s, a) => {
      s.loading = false;
      s.isAuthenticated = true;
      s.user = a.payload;
      s.sessionChecked = true;
    });
    b.addCase(loginUser.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? 'Login failed. Please try again.';
    });
    b.addCase(registerUser.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(registerUser.fulfilled, (s, a) => {
      s.loading = false;
      s.isAuthenticated = true; // backend sets the cookie on register too
      s.user = a.payload;
      s.sessionChecked = true;
    });
    b.addCase(registerUser.rejected, (s, a) => {
      s.loading = false;
      s.error = a.payload ?? 'Registration failed. Please try again.';
    });
    b.addCase(fetchCurrentUser.pending, (s) => { s.sessionLoading = true; });
    b.addCase(fetchCurrentUser.fulfilled, (s, a) => {
      s.sessionLoading = false;
      s.sessionChecked = true;
      s.isAuthenticated = true;
      s.user = a.payload;
    });
    b.addCase(fetchCurrentUser.rejected, (s) => {
      s.sessionLoading = false;
      s.sessionChecked = true;
      s.isAuthenticated = false;
      s.user = null;
    });
    b.addCase(logoutThunk.pending, (s) => { s.loading = true; });
    b.addCase(logoutThunk.fulfilled, (s) => {
      s.loading = false;
      s.isAuthenticated = false;
      s.user = null;
      s.error = null;
      // Session is now definitively logged out — keep the boot gate open
      // so ProtectedRoute redirects (until the logout handler navigates home).
      s.sessionLoading = false;
      s.sessionChecked = true;
    });
    b.addCase(logoutThunk.rejected, (s) => {
      // Never leave `loading` stuck; treat a failed logout as logged out
      // locally so the user still lands on Home instead of hanging.
      s.loading = false;
      s.isAuthenticated = false;
      s.user = null;
      s.error = null;
      s.sessionLoading = false;
      s.sessionChecked = true;
    });
  },
});

export const { logoutUser, clearAuthError } = slice.actions;
export default slice.reducer;
