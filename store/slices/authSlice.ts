import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { User } from '../../types/database';
import { authService } from '../../services/authService';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  requiresEmailConfirmation: boolean;
  pendingConfirmationEmail?: string;
}

const initialState: AuthState = {
  user: null,
  loading: true, // Start with loading true to check initial session
  error: null,
  isAuthenticated: false,
  requiresEmailConfirmation: false,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await authService.login(email, password);
    return response;
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ email, password, name }: { email: string; password: string; name: string }) => {
    const response = await authService.register(email, password, name);
    return response;
  }
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const checkAuthStatus = createAsyncThunk('auth/checkStatus', async () => {
  const user = await authService.getCurrentUser();
  return user;
});

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email: string) => {
    await authService.forgotPassword(email);
    return email;
  }
);

export const resendConfirmation = createAsyncThunk(
  'auth/resendConfirmation',
  async (email: string) => {
    await authService.resendConfirmation(email);
    return email;
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ userId, updates }: { userId: string; updates: { name?: string } }) => {
    const updatedUser = await authService.updateUserProfile(userId, updates);
    return updatedUser;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.loading = false; // Set loading to false when we set a user
    },
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.loading = false;
    },
    clearEmailConfirmation: (state) => {
      state.requiresEmailConfirmation = false;
      state.pendingConfirmationEmail = undefined;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.requiresEmailConfirmation = false;
          state.pendingConfirmationEmail = undefined;
        } else if (action.payload.requiresEmailConfirmation) {
          state.user = null;
          state.isAuthenticated = false;
          state.requiresEmailConfirmation = true;
          state.error = action.payload.message || 'Email confirmation required';
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.requiresEmailConfirmation = false;
          state.pendingConfirmationEmail = undefined;
        } else if (action.payload.requiresEmailConfirmation) {
          state.user = null;
          state.isAuthenticated = false;
          state.requiresEmailConfirmation = true;
          state.error = action.payload.message || 'Email confirmation required';
          // Store the email for potential resend functionality
          state.pendingConfirmationEmail = action.meta.arg.email;
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
      })
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Logout failed';
      })
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true;
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Password reset failed';
      })
      .addCase(resendConfirmation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendConfirmation.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resendConfirmation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Resend confirmation failed';
      })
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.user = { ...state.user, ...action.payload };
        }
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Profile update failed';
      });
  },
});

export const { clearError, setUser, clearAuth, clearEmailConfirmation } = authSlice.actions;
export default authSlice.reducer;