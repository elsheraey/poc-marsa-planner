import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ApiError, api, ClientRecord } from "../../api/client";
import { toast } from "../../components/Toaster";

type State = {
  list: ClientRecord[];
  byId: Record<string, ClientRecord>;
  status: "idle" | "loading" | "error";
  error: string | null;
  // Per-id detail-fetch status + error. `fetchClient(id)` writes here so
  // ClientSummary can render a 404 / error banner for a specific id
  // without blocking on the list-level status.
  detailStatus: Record<string, "idle" | "loading" | "error">;
  detailError: Record<string, string | null>;
};

const initialState: State = {
  list: [],
  byId: {},
  status: "idle",
  error: null,
  detailStatus: {},
  detailError: {},
};

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Request failed";
}

export const fetchClients = createAsyncThunk<ClientRecord[], void, { rejectValue: string }>(
  "clients/list",
  async (_, { rejectWithValue }) => {
    try {
      return await api.listClients();
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  }
);

export const fetchClient = createAsyncThunk<ClientRecord, string, { rejectValue: string }>(
  "clients/get",
  async (id, { rejectWithValue }) => {
    try {
      return await api.getClient(id);
    } catch (e) {
      return rejectWithValue(errMessage(e));
    }
  }
);

export const createClient = createAsyncThunk<
  ClientRecord,
  Partial<ClientRecord>,
  { rejectValue: string }
>("clients/create", async (payload, { rejectWithValue }) => {
  try {
    return await api.createClient(payload);
  } catch (e) {
    const msg = errMessage(e);
    toast(msg, "error");
    return rejectWithValue(msg);
  }
});

export const updateClient = createAsyncThunk<
  ClientRecord,
  { id: string; data: Partial<ClientRecord> },
  { rejectValue: string }
>("clients/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    return await api.updateClient(id, data);
  } catch (e) {
    const msg = errMessage(e);
    toast(msg, "error");
    return rejectWithValue(msg);
  }
});

const slice = createSlice({
  name: "clients",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = "idle";
        state.list = action.payload;
        state.byId = Object.fromEntries(action.payload.map((c) => [c.id, c]));
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload ?? action.error.message ?? "Failed to load clients";
      })
      .addCase(fetchClient.pending, (state, action) => {
        const id = action.meta.arg;
        state.detailStatus[id] = "loading";
        state.detailError[id] = null;
      })
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        state.detailStatus[action.payload.id] = "idle";
        state.detailError[action.payload.id] = null;
      })
      .addCase(fetchClient.rejected, (state, action) => {
        const id = action.meta.arg;
        state.detailStatus[id] = "error";
        state.detailError[id] =
          action.payload ?? action.error.message ?? "Client not found";
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.list.unshift(action.payload);
        state.byId[action.payload.id] = action.payload;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
        const i = state.list.findIndex((c) => c.id === action.payload.id);
        if (i >= 0) state.list[i] = action.payload;
      });
  },
});

export default slice.reducer;
