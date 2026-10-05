import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import {
  fetchApplicationOptionsRequest,
  fetchAuthorityProfileRequest,
  fetchMyApplicationRequest,
  getApiErrorMessage,
  submitApplicationRequest,
  type AuthorityApplicationOptions,
  type AuthorityProfile,
  type MyAuthorityApplication,
  type SubmitApplicationInput,
} from '../../services/authority.service';

/**
 * Redux state for the authority candidate flow (/authority/apply, /authority/profile).
 * API logic lives in services/authority.service.ts — never inside components.
 */

interface AsyncSection {
  loading: boolean;
  error: string | null;
}

interface AuthorityState {
  options: AuthorityApplicationOptions | null;
  optionsFetch: AsyncSection;
  application: MyAuthorityApplication | null | undefined;
  /** undefined = not loaded yet; null = never applied. */
  applicationFetch: AsyncSection;
  submitLoading: boolean;
  submitError: string | null;
  lastSubmitted: boolean;
  profile: AuthorityProfile | null | undefined;
  profileFetch: AsyncSection;
  /** True when the backend answered 403 AUTHORITY_NOT_VERIFIED. */
  notVerified: boolean;
}

const idle = (): AsyncSection => ({ loading: false, error: null });

const initialState: AuthorityState = {
  options: null,
  optionsFetch: idle(),
  application: undefined,
  applicationFetch: idle(),
  submitLoading: false,
  submitError: null,
  lastSubmitted: false,
  profile: undefined,
  profileFetch: idle(),
  notVerified: false,
};

/** Sentinel when the backend answers 403 AUTHORITY_NOT_VERIFIED. */
export const NOT_VERIFIED = 'AUTHORITY_NOT_VERIFIED';

const isNotVerifiedError = (err: unknown): boolean =>
  err instanceof AxiosError && err.response?.status === 403;

export const fetchApplicationOptions = createAsyncThunk<
  AuthorityApplicationOptions,
  void,
  { rejectValue: string }
>('authority/fetchOptions', async (_, { rejectWithValue }) => {
  try {
    return await fetchApplicationOptionsRequest();
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load application options.'));
  }
});

export const fetchMyApplication = createAsyncThunk<
  MyAuthorityApplication | null,
  void,
  { rejectValue: string }
>('authority/fetchMine', async (_, { rejectWithValue }) => {
  try {
    return await fetchMyApplicationRequest();
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load your application.'));
  }
});

export const submitApplication = createAsyncThunk<
  MyAuthorityApplication,
  SubmitApplicationInput,
  { rejectValue: string }
>('authority/submit', async (input, { rejectWithValue }) => {
  try {
    return await submitApplicationRequest(input);
  } catch (err) {
    return rejectWithValue(getApiErrorMessage(err, 'Could not submit the application.'));
  }
});

export const fetchAuthorityProfile = createAsyncThunk<
  AuthorityProfile | null,
  void,
  { rejectValue: string }
>('authority/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    return await fetchAuthorityProfileRequest();
  } catch (err) {
    if (isNotVerifiedError(err)) return rejectWithValue(NOT_VERIFIED);
    return rejectWithValue(getApiErrorMessage(err, 'Unable to load your profile.'));
  }
});

const slice = createSlice({
  name: 'authority',
  initialState,
  reducers: {
    clearSubmitState: (s) => {
      s.submitError = null;
      s.lastSubmitted = false;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchApplicationOptions.pending, (s) => {
      s.optionsFetch = { loading: true, error: null };
    });
    b.addCase(fetchApplicationOptions.fulfilled, (s, a) => {
      s.optionsFetch = idle();
      s.options = a.payload;
    });
    b.addCase(fetchApplicationOptions.rejected, (s, a) => {
      s.optionsFetch = { loading: false, error: a.payload ?? 'Unable to load options.' };
    });
    b.addCase(fetchMyApplication.pending, (s) => {
      s.applicationFetch = { loading: true, error: null };
    });
    b.addCase(fetchMyApplication.fulfilled, (s, a) => {
      s.applicationFetch = idle();
      s.application = a.payload;
    });
    b.addCase(fetchMyApplication.rejected, (s, a) => {
      s.applicationFetch = { loading: false, error: a.payload ?? 'Unable to load application.' };
      s.application = undefined;
    });
    b.addCase(submitApplication.pending, (s) => {
      s.submitLoading = true;
      s.submitError = null;
      s.lastSubmitted = false;
    });
    b.addCase(submitApplication.fulfilled, (s, a) => {
      s.submitLoading = false;
      s.lastSubmitted = true;
      s.application = a.payload;
    });
    b.addCase(submitApplication.rejected, (s, a) => {
      s.submitLoading = false;
      s.submitError = a.payload ?? 'Could not submit the application.';
    });
    b.addCase(fetchAuthorityProfile.pending, (s) => {
      s.profileFetch = { loading: true, error: null };
      s.notVerified = false;
    });
    b.addCase(fetchAuthorityProfile.fulfilled, (s, a) => {
      s.profileFetch = idle();
      s.profile = a.payload;
      s.notVerified = false;
    });
    b.addCase(fetchAuthorityProfile.rejected, (s, a) => {
      const message = a.payload ?? 'Unable to load your profile.';
      s.notVerified = message === NOT_VERIFIED;
      s.profileFetch = { loading: false, error: s.notVerified ? null : message };
      s.profile = undefined;
    });
  },
});

export const { clearSubmitState } = slice.actions;
export default slice.reducer;
