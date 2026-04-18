import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ApiError, api, User } from "../../api/client";

// Shape of a server-side error as it's stored in the slice. `code` is the
// i18n-key selector (e.g. `unauthorized`, `conflict`, `rate_limited`), and
// `message` is the English fallback that components render when no i18n key
// matches the code. We intentionally do NOT call `t(...)` here — the slice
// is locale-agnostic; the component resolves the key so a mid-session
// locale toggle updates the banner immediately.
export type AuthErrorPayload = {
  code: string | null;
  message: string;
};

type AuthState = {
  user: User | null;
  status: "idle" | "loading" | "error";
  initialized: boolean;
  error: AuthErrorPayload | null;
};

const initialState: AuthState = {
  user: null,
  status: "idle",
  initialized: false,
  error: null,
};

function errPayload(e: unknown): AuthErrorPayload {
  if (e instanceof ApiError) return { code: e.code, message: e.message };
  if (e instanceof Error) return { code: null, message: e.message };
  return { code: null, message: "Request failed" };
}

export const login = createAsyncThunk<
  User,
  { email: string; password: string },
  { rejectValue: AuthErrorPayload }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.login(payload.email, payload.password);
    return res.user;
  } catch (e) {
    return rejectWithValue(errPayload(e));
  }
});

export const register = createAsyncThunk<
  User,
  { name: string; email: string; password: string },
  { rejectValue: AuthErrorPayload }
>("auth/register", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.register(payload);
    return res.user;
  } catch (e) {
    return rejectWithValue(errPayload(e));
  }
});

export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    await api.logout();
  } catch {
    // ignore — we're clearing client state regardless
  }
});

export const bootstrap = createAsyncThunk("auth/bootstrap", async () => {
  try {
    return await api.me();
  } catch {
    return null;
  }
});

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.fulfilled, (state, action: PayloadAction<User | null>) => {
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(bootstrap.rejected, (state) => {
        state.initialized = true;
      })
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? {
          code: null,
          message: action.error.message ?? "Login failed",
        };
      })
      .addCase(register.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = "idle";
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? {
          code: null,
          message: action.error.message ?? "Registration failed",
        };
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { clearError } = slice.actions;
export default slice.reducer;
