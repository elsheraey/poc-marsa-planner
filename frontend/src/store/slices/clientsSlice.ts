import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api, ClientRecord } from "../../api/client";

type State = {
  list: ClientRecord[];
  byId: Record<string, ClientRecord>;
  status: "idle" | "loading" | "error";
};

const initialState: State = { list: [], byId: {}, status: "idle" };

export const fetchClients = createAsyncThunk("clients/list", () => api.listClients());
export const fetchClient = createAsyncThunk("clients/get", (id: string) => api.getClient(id));
export const createClient = createAsyncThunk(
  "clients/create",
  (payload: Partial<ClientRecord>) => api.createClient(payload)
);
export const updateClient = createAsyncThunk(
  "clients/update",
  ({ id, data }: { id: string; data: Partial<ClientRecord> }) => api.updateClient(id, data)
);

const slice = createSlice({
  name: "clients",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchClients.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.status = "idle";
        state.list = action.payload;
        state.byId = Object.fromEntries(action.payload.map((c) => [c.id, c]));
      })
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.byId[action.payload.id] = action.payload;
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
